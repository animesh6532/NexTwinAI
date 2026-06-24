"""
NexTwin AI — anomaly_service.py
===============================
Business logic layer for unsupervised anomaly and fault detection.
Integrates classical Scikit-Learn models and PyTorch deep neural networks.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.config.config import settings
from app.database.models import AnomalyPrediction
from app.services.db_helpers import ensure_machine
from app.utils.logger import logger

# Declare PyTorch AutoEncoder Model class matching notebook training structure
class AutoEncoder(nn.Module):
    def __init__(self, input_dim: int = 6):
        super(AutoEncoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 4),
            nn.ReLU(),
            nn.Linear(4, 2),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(2, 4),
            nn.ReLU(),
            nn.Linear(4, input_dim)
        )
        
    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

class AnomalyService:
    def __init__(self):
        self._pkg = None
        self._model_path = os.path.join(settings.MODEL_DIR, "anomaly", "anomaly_model.pkl")
        self._ae_model = None

    def _load_package(self) -> Optional[Dict[str, Any]]:
        """Lazy load the serialized anomaly detector package from disk"""
        if self._pkg is not None:
            return self._pkg
            
        if os.path.exists(self._model_path):
            try:
                with open(self._model_path, "rb") as f:
                    self._pkg = pickle.load(f)
                logger.info(f"Loaded Anomaly models package from: {self._model_path}")
            except Exception as e:
                logger.error(f"Failed to deserialize anomaly models: {str(e)}")
                self._pkg = None
        else:
            logger.warning(f"Anomaly model package file not found at {self._model_path}. Using fallback rule checks.")
        return self._pkg

    def _get_autoencoder(self, state_dict: dict) -> AutoEncoder:
        """Initialize PyTorch AutoEncoder model weights"""
        if self._ae_model is not None:
            return self._ae_model
        
        self._ae_model = AutoEncoder(input_dim=6)
        self._ae_model.load_state_dict(state_dict)
        self._ae_model.eval()
        return self._ae_model

    def predict_anomaly(self, db: Session, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs unsupervised ML inference (Isolation Forest, One-Class SVM, or PyTorch AutoEncoder)
        to identify abnormal physical/acoustic signatures. Logs prediction to db.
        """
        machine_id = inputs.get("machine_id", "M_001")
        method = inputs.get("method", "Isolation Forest")
        
        feature_cols = [
            'vibration_mm_s', 'temperature_c', 'pressure_bar', 
            'noise_level_db', 'sound_frequency_hz', 'sound_amplitude'
        ]
        
        # Assemble input DataFrame
        df_input = pd.DataFrame([{
            'vibration_mm_s': inputs.get('vibration_mm_s', 1.8),
            'temperature_c': inputs.get('temperature_c', 60.0),
            'pressure_bar': inputs.get('pressure_bar', 4.2),
            'noise_level_db': inputs.get('noise_level_db', 72.0),
            'sound_frequency_hz': inputs.get('sound_frequency_hz', 520.0),
            'sound_amplitude': inputs.get('sound_amplitude', 0.06)
        }])[feature_cols]

        pkg = self._load_package()
        
        anomaly_detected = False
        anomaly_score = 0.0
        details = {}

        if pkg is not None:
            try:
                scaler = pkg['scaler']
                scaled_data = scaler.transform(df_input)
                
                if method == "Isolation Forest":
                    iforest = pkg['iforest']
                    pred = iforest.predict(scaled_data)[0]
                    score = -iforest.decision_function(scaled_data)[0]
                    anomaly_detected = (pred == -1)
                    anomaly_score = float(score)
                    details = {"decision_score": float(score)}
                    
                elif method == "OCSVM":
                    ocsvm = pkg['ocsvm']
                    pred = ocsvm.predict(scaled_data)[0]
                    score = -ocsvm.score_samples(scaled_data)[0]
                    anomaly_detected = (pred == -1)
                    anomaly_score = float(score)
                    details = {"svm_distance_score": float(score)}
                    
                elif method == "AutoEncoder":
                    state_dict = pkg['autoencoder_state']
                    threshold = pkg['ae_threshold']
                    model = self._get_autoencoder(state_dict)
                    
                    tensor_data = torch.tensor(scaled_data, dtype=torch.float32)
                    with torch.no_grad():
                        reconstructed = model(tensor_data).numpy()
                        
                    # Calculate MSE reconstruction error
                    mse = float(np.mean((scaled_data - reconstructed) ** 2, axis=1)[0])
                    anomaly_detected = (mse > threshold)
                    anomaly_score = mse
                    details = {
                        "reconstruction_error": mse,
                        "threshold": float(threshold)
                    }
                else:
                    raise ValueError(f"Unrecognized anomaly detection method: {method}")
                    
            except Exception as e:
                logger.error(f"Anomaly model inference error, reverting to heuristics: {str(e)}")
                anomaly_detected, anomaly_score = self._heuristic_anomaly(inputs)
                details = {"fallback": True, "error": str(e)}
        else:
            anomaly_detected, anomaly_score = self._heuristic_anomaly(inputs)
            details = {"fallback": True}

        # Log prediction to database
        ensure_machine(db, machine_id)
        db_prediction = AnomalyPrediction(
            machine_id=machine_id,
            timestamp=datetime.utcnow(),
            anomaly_detected=anomaly_detected,
            anomaly_score=round(anomaly_score, 4),
            method=method,
            details=details
        )
        db.add(db_prediction)
        db.commit()
        logger.info(f"Recorded Anomaly Prediction for machine {machine_id} (Detected: {anomaly_detected})")
        
        # Automatic Alerting
        if anomaly_detected:
            from app.services.machine_service import machine_service
            active_anomalies = machine_service.get_alerts(db, machine_id=machine_id, is_resolved=False, severity="Warning")
            # Prevent duplicate alerts with the same headline
            if not any(a.title == "Telemetry Anomaly Alarm" for a in active_anomalies):
                machine_service.create_alert(db, {
                    "machine_id": machine_id,
                    "title": "Telemetry Anomaly Alarm",
                    "message": f"Sensor signature anomaly detected (Score: {anomaly_score:.4f}, Method: {method}). Telemetry deviates from standard baseline distributions.",
                    "severity": "Warning"
                })

        return {
            "machine_id": machine_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "anomaly_detected": anomaly_detected,
            "anomaly_score": round(anomaly_score, 4),
            "method": method,
            "details": details
        }

    def get_prediction_history(self, db: Session, machine_id: Optional[str] = None, limit: int = 50) -> List[AnomalyPrediction]:
        """Fetch past anomaly detection records."""
        query = db.query(AnomalyPrediction)
        if machine_id:
            query = query.filter(AnomalyPrediction.machine_id == machine_id)
        return query.order_by(AnomalyPrediction.timestamp.desc()).limit(limit).all()

    def _heuristic_anomaly(self, inputs: Dict[str, Any]) -> tuple:
        """Fallback check based on sensor standard deviations and limits"""
        vib = inputs.get("vibration_mm_s", 1.8)
        temp = inputs.get("temperature_c", 60.0)
        noise = inputs.get("noise_level_db", 72.0)
        press = inputs.get("pressure_bar", 4.2)
        
        # Simple threshold based scoring
        score = 0.05
        if vib > 4.5:
            score += 0.4
        if temp > 85.0:
            score += 0.3
        if noise > 95.0:
            score += 0.25
        if press > 6.5 or press < 1.0:
            score += 0.35
            
        detected = (score > 0.45)
        return detected, score

anomaly_service = AnomalyService()
