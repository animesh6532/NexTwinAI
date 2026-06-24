"""
NexTwin AI — bottleneck_service.py
==================================
Business logic layer for detecting production bottleneck issues, delays, and congestion.
Integrates with the trained multi-model bottleneck package.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.config.config import settings
from app.database.models import BottleneckPrediction
from app.services.db_helpers import ensure_machine
from app.utils.logger import logger

class BottleneckService:
    def __init__(self):
        self._pkg = None
        self._model_path = os.path.join(settings.MODEL_DIR, "bottleneck", "bottleneck_model.pkl")

    def _load_model(self) -> Optional[Dict[str, Any]]:
        """Lazy load the serialized model package dictionary from disk"""
        if self._pkg is not None:
            return self._pkg
            
        if os.path.exists(self._model_path):
            try:
                with open(self._model_path, "rb") as f:
                    self._pkg = pickle.load(f)
                logger.info(f"Loaded Bottleneck models package from: {self._model_path}")
            except Exception as e:
                logger.error(f"Failed to deserialize bottleneck models: {str(e)}")
                self._pkg = None
        else:
            logger.warning(f"Bottleneck model file not found at {self._model_path}. Using fallback rules engine.")
        return self._pkg

    def predict_bottleneck(self, db: Session, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate machine metrics to forecast line bottleneck risk, production delays, 
        and congestion probabilities using regression and classification ML pipelines.
        """
        machine_id = inputs.get("machine_id", "M_001")
        
        # Structure features matching training cols
        feature_cols = [
            'machine_id', 'vibration_mm_s', 'temperature_c', 'pressure_bar',
            'noise_level_db', 'sound_frequency_hz', 'sound_amplitude',
            'defect_count', 'energy_draw_kw',
            'queue_length', 'utilization_rate', 'downtime_minutes',
            'throughput_rate', 'cycle_time', 'defect_rate'
        ]
        
        utilization_rate = inputs.get('utilization_rate')
        if utilization_rate is None:
            utilization_rate = 75.0
        defect_count = inputs.get('defect_count')
        if defect_count is None:
            defect_count = 0.0
        vibration = inputs.get('vibration_mm_s')
        if vibration is None:
            vibration = 1.8
        
        queue_length = inputs.get('queue_length')
        if queue_length is None:
            queue_length = max(0, int(round((utilization_rate / 100.0) * 8.0 + defect_count * 0.8 + vibration * 0.5)))
        downtime_minutes = inputs.get('downtime_minutes')
        if downtime_minutes is None:
            downtime_minutes = 1.5 * vibration
        throughput_rate = inputs.get('throughput_rate')
        if throughput_rate is None:
            throughput_rate = inputs.get('actual_quantity')
        if throughput_rate is None:
            throughput_rate = 108.0
        cycle_time = inputs.get('cycle_time')
        if cycle_time is None:
            cycle_time = inputs.get('cycle_time_s')
        if cycle_time is None:
            cycle_time = 33.3
        defect_rate = inputs.get('defect_rate')
        if defect_rate is None:
            defect_rate = defect_count / max(throughput_rate, 1.0)

        df_input = pd.DataFrame([{
            'machine_id': machine_id,
            'vibration_mm_s': vibration,
            'temperature_c': inputs.get('temperature_c', 60.0),
            'pressure_bar': inputs.get('pressure_bar', 4.2),
            'noise_level_db': inputs.get('noise_level_db', 72.0),
            'sound_frequency_hz': inputs.get('sound_frequency_hz', 520.0),
            'sound_amplitude': inputs.get('sound_amplitude', 0.06),
            'defect_count': defect_count,
            'energy_draw_kw': inputs.get('energy_draw_kw', 65.0),
            'queue_length': queue_length,
            'utilization_rate': utilization_rate,
            'downtime_minutes': downtime_minutes,
            'throughput_rate': throughput_rate,
            'cycle_time': cycle_time,
            'defect_rate': defect_rate
        }])[feature_cols]

        pkg = self._load_model()
        
        # Predictions holders
        risk_score = 0.0
        pred_delay = 0.0
        congestion_detected = False
        congestion_prob = 0.0
        
        if pkg is not None:
            try:
                # 1. Bottleneck Severity Score
                risk_score = float(pkg['bottleneck_regressor'].predict(df_input)[0])
                
                # 2. Predicted production delay
                pred_delay = float(pkg['delay_regressor'].predict(df_input)[0])
                
                # 3. Congestion Risk
                congestion_detected = int(pkg['congestion_classifier'].predict(df_input)[0]) == 1
                congestion_prob = float(pkg['congestion_classifier'].predict_proba(df_input)[0][1])
            except Exception as e:
                logger.error(f"Bottleneck model prediction error, falling back to heuristics: {str(e)}")
                risk_score, pred_delay, congestion_detected, congestion_prob = self._heuristic_bottleneck(inputs)
        else:
            risk_score, pred_delay, congestion_detected, congestion_prob = self._heuristic_bottleneck(inputs)

        # Bounds checks
        risk_score = max(0.0, min(10.0, risk_score))
        pred_delay = max(0.0, pred_delay)
        congestion_prob = max(0.0, min(1.0, congestion_prob))

        # Log prediction to PostgreSQL
        ensure_machine(db, machine_id)
        db_prediction = BottleneckPrediction(
            machine_id=machine_id,
            timestamp=datetime.utcnow(),
            bottleneck_risk_score=round(risk_score, 2),
            predicted_production_delay=round(pred_delay, 2),
            congestion_probability=round(congestion_prob, 4),
            congestion_risk_detected=congestion_detected
        )
        db.add(db_prediction)
        db.commit()
        logger.info(f"Recorded Bottleneck Prediction for machine {machine_id}")
        
        # Automatic Alerting
        if risk_score > 7.0:
            from app.services.machine_service import machine_service
            active_bottleneck_alerts = machine_service.get_alerts(db, machine_id=machine_id, is_resolved=False, severity="Warning")
            if not any(a.title == "Production Line Bottleneck Alarm" for a in active_bottleneck_alerts):
                machine_service.create_alert(db, {
                    "machine_id": machine_id,
                    "title": "Production Line Bottleneck Alarm",
                    "message": f"Continuous bottleneck score is {risk_score:.2f}/10, exceeding severity limit of 7.00. High risk of production delays.",
                    "severity": "Warning"
                })

        return {
            "machine_id": machine_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "bottleneck_risk_score": round(risk_score, 2),
            "predicted_production_delay": round(pred_delay, 2),
            "congestion_probability": round(congestion_prob, 4),
            "congestion_risk_detected": congestion_detected
        }

    def get_prediction_history(self, db: Session, machine_id: Optional[str] = None, limit: int = 50) -> List[BottleneckPrediction]:
        """Fetch past bottleneck metrics from database."""
        query = db.query(BottleneckPrediction)
        if machine_id:
            query = query.filter(BottleneckPrediction.machine_id == machine_id)
        return query.order_by(BottleneckPrediction.timestamp.desc()).limit(limit).all()

    def _heuristic_bottleneck(self, inputs: Dict[str, Any]) -> tuple:
        """Fallback rule-based calculations for bottleneck parameters"""
        # Noise, vibration and defect counts drive bottleneck risk
        vib = inputs.get("vibration_mm_s", 1.8)
        defects = inputs.get("defect_count", 0.0)
        temp = inputs.get("temperature_c", 60.0)
        util = inputs.get("utilization_rate", 75.0)
        
        # Risk score calculation (0 - 10 scale)
        risk = 1.0 + (vib * 1.5) + (defects * 2.0) + (util / 100.0 * 2.0)
        if temp > 80.0:
            risk += 2.0
            
        # Delay calculation (units delayed)
        delay = defects * 1.2 + (vib - 1.8) * 5
        
        # Congestion probability (based on defect count and base vibration)
        congestion_prob = 0.15 + (defects * 0.1) + (vib / 10.0)
        if util > 90.0:
            congestion_prob = 0.95
        congestion_risk = congestion_prob > 0.65
        
        return risk, delay, congestion_risk, congestion_prob

# Instantiate service
bottleneck_service = BottleneckService()
