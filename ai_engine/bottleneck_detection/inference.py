"""
NexTwin AI — bottleneck-detection/inference.py
=============================================
Python inference wrapper class for loading and executing the bottleneck models.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
from typing import Dict, Any, Optional

class BottleneckInference:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.abspath(os.path.join(current_dir, "..", "models", "bottleneck", "bottleneck_model.pkl"))
            
        self.model_path = model_path
        self.pkg = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            with open(self.model_path, "rb") as f:
                self.pkg = pickle.load(f)
        else:
            raise FileNotFoundError(f"Bottleneck model package not found at {self.model_path}")

    def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes bottleneck predictions.
        inputs: dict with keys:
          machine_id, vibration_mm_s, temperature_c, pressure_bar,
          noise_level_db, sound_frequency_hz, sound_amplitude,
          defect_count, energy_draw_kw
        """
        if self.pkg is None:
            raise RuntimeError("Model is not loaded.")
            
        feature_cols = [
            'machine_id', 'vibration_mm_s', 'temperature_c', 'pressure_bar',
            'noise_level_db', 'sound_frequency_hz', 'sound_amplitude',
            'defect_count', 'energy_draw_kw'
        ]
        
        df = pd.DataFrame([{
            'machine_id': inputs.get('machine_id', 'M_001'),
            'vibration_mm_s': inputs.get('vibration_mm_s', 1.8),
            'temperature_c': inputs.get('temperature_c', 60.0),
            'pressure_bar': inputs.get('pressure_bar', 4.2),
            'noise_level_db': inputs.get('noise_level_db', 72.0),
            'sound_frequency_hz': inputs.get('sound_frequency_hz', 520.0),
            'sound_amplitude': inputs.get('sound_amplitude', 0.06),
            'defect_count': inputs.get('defect_count', 0.0),
            'energy_draw_kw': inputs.get('energy_draw_kw', 65.0)
        }])[feature_cols]
        
        risk_score = float(self.pkg['bottleneck_regressor'].predict(df)[0])
        delay = float(self.pkg['delay_regressor'].predict(df)[0])
        congestion = int(self.pkg['congestion_classifier'].predict(df)[0]) == 1
        congestion_prob = float(self.pkg['congestion_classifier'].predict_proba(df)[0][1])
        
        return {
            "bottleneck_risk_score": risk_score,
            "predicted_production_delay": delay,
            "congestion_risk_detected": congestion,
            "congestion_probability": congestion_prob
        }
