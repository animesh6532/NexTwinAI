"""
NexTwin AI — health-prediction/inference.py
===========================================
Python inference wrapper class for loading and executing the machine health model.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
from typing import Dict, Any, Optional

class MachineHealthInference:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.abspath(os.path.join(current_dir, "..", "models", "health", "health_model.pkl"))
            
        self.model_path = model_path
        self.model = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            with open(self.model_path, "rb") as f:
                self.model = pickle.load(f)
        else:
            raise FileNotFoundError(f"Machine health model file not found at {self.model_path}")

    def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes failure risk predictions.
        inputs: dict with keys:
          type, air_temperature, process_temperature, rotational_speed, torque,
          tool_wear, machine_health_score, failure_risk_index
        """
        if self.model is None:
            raise RuntimeError("Model is not loaded.")
            
        feature_cols = [
            'type', 'air_temperature', 'process_temperature', 'rotational_speed', 
            'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index'
        ]
        
        df = pd.DataFrame([{
            'type': inputs.get('type', 'M'),
            'air_temperature': inputs.get('air_temperature', 300.0),
            'process_temperature': inputs.get('process_temperature', 310.0),
            'rotational_speed': inputs.get('rotational_speed', 1500.0),
            'torque': inputs.get('torque', 40.0),
            'tool_wear': inputs.get('tool_wear', 0.0),
            'machine_health_score': inputs.get('machine_health_score', 100.0),
            'failure_risk_index': inputs.get('failure_risk_index', 0.0)
        }])[feature_cols]
        
        pred = int(self.model.predict(df)[0])
        proba = float(self.model.predict_proba(df)[0][1])
        
        # Priority mapping
        if proba > 0.8:
            priority = "Critical"
        elif proba > 0.5:
            priority = "High"
        elif proba > 0.2:
            priority = "Medium"
        else:
            priority = "Low"
            
        return {
            "failure_predicted": pred == 1,
            "failure_probability": proba,
            "maintenance_priority": priority
        }
