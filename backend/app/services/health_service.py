"""
NexTwin AI — health_service.py
==============================
Business logic layer for machine failure risk predictions. Integrates with the 
trained ML classifiers to output health scores and maintenance priority.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, Optional

from app.config.config import settings
from app.database.models import HealthPrediction
from app.services.db_helpers import ensure_machine
from app.utils.logger import logger

class HealthService:
    def __init__(self):
        self._model = None
        self._model_path = os.path.join(settings.MODEL_DIR, "health", "health_model.pkl")

    def _load_model(self):
        """Lazy load the serialized model package from disk"""
        if self._model is not None:
            return self._model
            
        if os.path.exists(self._model_path):
            try:
                with open(self._model_path, "rb") as f:
                    self._model = pickle.load(f)
                logger.info(f"Loaded Machine Health model pipeline from: {self._model_path}")
            except Exception as e:
                logger.error(f"Failed to deserialize machine health model: {str(e)}")
                self._model = None
        else:
            logger.warning(f"Machine health model file not found at {self._model_path}. Using fallback predictor.")
        return self._model

    def predict_health(self, db: Session, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs ML prediction to estimate failure probability, calculate machine health index,
        and assign a maintenance priority rating. Updates system database record.
        """
        machine_id = inputs.get("machine_id")
        
        # Prepare feature DataFrame matching training columns
        feature_cols = [
            'type', 'air_temperature', 'process_temperature', 'rotational_speed', 
            'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index'
        ]
        
        machine_health_score = inputs.get('machine_health_score', 100.0)
        # Normalize failure_risk_index if it is passed on a 0-100 scale
        raw_risk = inputs.get('failure_risk_index', 0.0)
        failure_risk_index = raw_risk / 100.0 if raw_risk > 1.0 else raw_risk
        
        df_input = pd.DataFrame([{
            'type': inputs.get('type', 'M'),
            'air_temperature': inputs.get('air_temperature', 300.0),
            'process_temperature': inputs.get('process_temperature', 310.0),
            'rotational_speed': inputs.get('rotational_speed', 1500.0),
            'torque': inputs.get('torque', 40.0),
            'tool_wear': inputs.get('tool_wear', 0.0),
            'machine_health_score': machine_health_score,
            'failure_risk_index': failure_risk_index
        }])[feature_cols]

        model = self._load_model()
        
        if model is not None:
            try:
                # Predict probability
                prob = float(model.predict_proba(df_input)[0][1])
                is_failed = int(model.predict(df_input)[0]) == 1
            except Exception as e:
                logger.error(f"Model prediction failed, reverting to rules logic: {str(e)}")
                prob = self._heuristic_failure_prob(inputs)
                is_failed = prob > 0.5
        else:
            # Fallback heuristic calculation if model not compiled/trained
            prob = self._heuristic_failure_prob(inputs)
            is_failed = prob > 0.5

        # Health score calculation (derived from risk and baseline score)
        # Higher failure probability depresses health score
        base_score = machine_health_score
        calculated_health = max(0.0, min(100.0, base_score * (1.0 - prob)))
        
        # Determine priority category
        if prob > 0.8:
            priority = "Critical"
        elif prob > 0.5:
            priority = "High"
        elif prob > 0.2:
            priority = "Medium"
        else:
            priority = "Low"

        # Calculate local explainability factors (XAI)
        deviations = []
        tool_wear = inputs.get('tool_wear', 0.0)
        if tool_wear > 150:
            deviations.append(("Tool Wear", tool_wear / 240.0))
        proc_temp = inputs.get('process_temperature', 310.0)
        air_temp = inputs.get('air_temperature', 300.0)
        if abs(proc_temp - air_temp) < 8.6 or proc_temp > 325.0:
            deviations.append(("Temperature", abs(proc_temp - 300.0) / 30.0))
        torque = inputs.get('torque', 40.0)
        if torque > 65.0 or torque < 15.0:
            deviations.append(("Torque", abs(torque - 40.0) / 60.0))
        speed = inputs.get('rotational_speed', 1500.0)
        if speed > 2200.0 or speed < 1000.0:
            deviations.append(("Rotational Speed", abs(speed - 1500.0) / 1500.0))
        if failure_risk_index > 0.4:
            deviations.append(("Failure Risk Index", failure_risk_index))
            
        if not deviations:
            deviations = [
                ("Tool Wear", tool_wear / 300.0),
                ("Temperature", (proc_temp - 290.0) / 100.0),
                ("Torque", torque / 100.0)
            ]
            
        deviations.sort(key=lambda x: x[1], reverse=True)
        top_factors = [item[0] for item in deviations[:3]]

        # Log prediction to database if machine_id is supplied
        if machine_id:
            ensure_machine(db, machine_id, inputs.get("type", "M"))
            db_prediction = HealthPrediction(
                machine_id=machine_id,
                timestamp=datetime.utcnow(),
                failure_risk=round(prob, 4),
                health_score=round(calculated_health, 2),
                maintenance_priority=priority,
                details={**inputs, "top_factors": top_factors}
            )
            db.add(db_prediction)
            db.commit()
            logger.info(f"Recorded Health Prediction for machine {machine_id} (Failure Prob: {prob:.4f})")
            
            # Automatic Alerting
            if prob > 0.80:
                from app.services.machine_service import machine_service
                active_critical = machine_service.get_alerts(db, machine_id=machine_id, is_resolved=False, severity="Critical")
                if not active_critical:
                    machine_service.create_alert(db, {
                        "machine_id": machine_id,
                        "title": "Critical Failure Risk Breach",
                        "message": f"Predictive machine failure probability is {prob:.2%}, exceeding critical threshold of 80.0%. Urgent maintenance required.",
                        "severity": "Critical"
                    })

        return {
            "machine_id": machine_id,
            "failure_predicted": is_failed,
            "failure_probability": round(prob, 4),
            "health_score": round(calculated_health, 2),
            "maintenance_priority": priority,
            "top_factors": top_factors,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _heuristic_failure_prob(self, inputs: Dict[str, Any]) -> float:
        """Fallback rule-based probability estimate based on physical thresholds"""
        # Base probability
        prob = 0.02
        
        # Temp delta breach
        temp_diff = inputs.get("process_temperature", 310.0) - inputs.get("air_temperature", 300.0)
        if temp_diff < 8.6:
            prob += 0.15
        
        # Torque & Speed limits
        torque = inputs.get("torque", 40.0)
        speed = inputs.get("rotational_speed", 1500.0)
        power = torque * (speed * 2 * np.pi / 60)
        if power > 9000:
            prob += 0.2
            
        # Tool wear limit
        wear = inputs.get("tool_wear", 0.0)
        if wear > 200:
            prob += 0.3
            
        # Risk index
        raw_risk = inputs.get("failure_risk_index", 0.0)
        risk_idx = raw_risk / 100.0 if raw_risk > 1.0 else raw_risk
        prob += risk_idx * 0.1
        
        return min(0.99, max(0.01, prob))

health_service = HealthService()
