"""
NexTwin AI — energy-optimization/inference.py
============================================
Python inference wrapper class for loading and executing the energy models.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
from typing import Dict, Any, Optional

class EnergyInference:
    def __init__(self, model_path: Optional[str] = None):
        if model_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.abspath(os.path.join(current_dir, "..", "models", "energy", "energy_model.pkl"))
            
        self.model_path = model_path
        self.pkg = None
        self._load_model()
        
    def _load_model(self):
        if os.path.exists(self.model_path):
            with open(self.model_path, "rb") as f:
                self.pkg = pickle.load(f)
        else:
            raise FileNotFoundError(f"Energy models package not found at {self.model_path}")

    def predict(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes energy predictions.
        inputs: dict with keys:
          relative_compactness, surface_area, wall_area, roof_area, overall_height,
          orientation, glazing_area, glazing_area_distribution
        """
        if self.pkg is None:
            raise RuntimeError("Model is not loaded.")
            
        feature_cols = [
            'relative_compactness', 'surface_area', 'wall_area', 'roof_area', 
            'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'
        ]
        
        df = pd.DataFrame([{
            'relative_compactness': inputs.get('relative_compactness', 0.76),
            'surface_area': inputs.get('surface_area', 680.0),
            'wall_area': inputs.get('wall_area', 310.0),
            'roof_area': inputs.get('roof_area', 180.0),
            'overall_height': inputs.get('overall_height', 5.0),
            'orientation': inputs.get('orientation', 3.0),
            'glazing_area': inputs.get('glazing_area', 0.20),
            'glazing_area_distribution': inputs.get('glazing_area_distribution', 2.0)
        }])[feature_cols]
        
        loads = self.pkg['load_model'].predict(df)[0]
        waste = float(self.pkg['waste_model'].predict(df)[0])
        opt_score = float(self.pkg['optimization_model'].predict(df)[0])
        
        return {
            "predicted_heating_load": float(loads[0]),
            "predicted_cooling_load": float(loads[1]),
            "predicted_energy_waste_pct": waste,
            "energy_optimization_score": opt_score
        }
