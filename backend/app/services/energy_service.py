"""
NexTwin AI — energy_service.py
==============================
Business logic layer for building/zone thermal load and energy waste forecasting.
Integrates with multi-output XGBoost models and suggests design recommendations.

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
from app.database.models import EnergyPrediction
from app.services.db_helpers import ensure_machine
from app.utils.logger import logger

class EnergyService:
    def __init__(self):
        self._pkg = None
        self._model_path = os.path.join(settings.MODEL_DIR, "energy", "energy_model.pkl")

    def _load_model(self) -> Optional[Dict[str, Any]]:
        """Lazy load the serialized energy models package from disk"""
        if self._pkg is not None:
            return self._pkg
            
        if os.path.exists(self._model_path):
            try:
                with open(self._model_path, "rb") as f:
                    self._pkg = pickle.load(f)
                logger.info(f"Loaded Energy models package from: {self._model_path}")
            except Exception as e:
                logger.error(f"Failed to deserialize energy models: {str(e)}")
                self._pkg = None
        else:
            logger.warning(f"Energy model file not found at {self._model_path}. Using fallback calculations.")
        return self._pkg

    def predict_energy(self, db: Session, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict structural heating and cooling loads, estimate wastage percentages,
        and generate optimization advice. Logs prediction into PostgreSQL.
        """
        machine_id = inputs.get("machine_id")
        
        feature_cols = [
            'relative_compactness', 'surface_area', 'wall_area', 'roof_area', 
            'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'
        ]
        
        # Prepare DataFrame
        df_input = pd.DataFrame([{
            'relative_compactness': inputs.get('relative_compactness', 0.76),
            'surface_area': inputs.get('surface_area', 680.0),
            'wall_area': inputs.get('wall_area', 310.0),
            'roof_area': inputs.get('roof_area', 180.0),
            'overall_height': inputs.get('overall_height', 5.0),
            'orientation': inputs.get('orientation', 3.0),
            'glazing_area': inputs.get('glazing_area', 0.20),
            'glazing_area_distribution': inputs.get('glazing_area_distribution', 2.0)
        }])[feature_cols]

        pkg = self._load_model()
        
        # Output defaults
        heat_load = 0.0
        cool_load = 0.0
        waste_pct = 0.0
        opt_score = 100.0
        recs = []

        if pkg is not None:
            try:
                # 1. Multi-output thermal load predictions
                loads = pkg['load_model'].predict(df_input)[0]
                heat_load = float(loads[0])
                cool_load = float(loads[1])
                
                # 2. Waste percentage prediction
                waste_pct = float(pkg['waste_model'].predict(df_input)[0])
                
                # 3. Optimization efficiency score
                opt_score = float(pkg['optimization_model'].predict(df_input)[0])
                
                # Generate advice using model simulations
                recs = self._generate_advice(pkg['load_model'], inputs)
            except Exception as e:
                logger.error(f"Energy models prediction failed, falling back to heuristics: {str(e)}")
                heat_load, cool_load, waste_pct, opt_score, recs = self._heuristic_energy(inputs)
        else:
            heat_load, cool_load, waste_pct, opt_score, recs = self._heuristic_energy(inputs)

        # Log to Database
        ensure_machine(db, machine_id)
        db_prediction = EnergyPrediction(
            machine_id=machine_id,
            timestamp=datetime.utcnow(),
            relative_compactness=inputs.get('relative_compactness', 0.76),
            surface_area=inputs.get('surface_area', 680.0),
            wall_area=inputs.get('wall_area', 310.0),
            roof_area=inputs.get('roof_area', 180.0),
            overall_height=inputs.get('overall_height', 5.0),
            orientation=inputs.get('orientation', 3.0),
            glazing_area=inputs.get('glazing_area', 0.20),
            glazing_area_distribution=inputs.get('glazing_area_distribution', 2.0),
            predicted_heating_load=round(heat_load, 2),
            predicted_cooling_load=round(cool_load, 2),
            predicted_energy_waste_pct=round(waste_pct, 2),
            energy_optimization_score=round(opt_score, 2),
            optimization_recommendations=recs
        )
        db.add(db_prediction)
        db.commit()
        logger.info(f"Recorded Energy Prediction for machine zone {machine_id}")
        
        # Automatic Alerting
        if waste_pct > 15.0:
            from app.services.machine_service import machine_service
            active_energy_alerts = machine_service.get_alerts(db, machine_id=machine_id, is_resolved=False, severity="Warning")
            if not any(a.title == "High Energy Waste Alarm" for a in active_energy_alerts):
                machine_service.create_alert(db, {
                    "machine_id": machine_id,
                    "title": "High Energy Waste Alarm",
                    "message": f"Zone thermal energy waste predicted at {waste_pct:.2f}%, exceeding safety threshold of 15.00%. Structural layout review recommended.",
                    "severity": "Warning"
                })

        return {
            "machine_id": machine_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "predicted_heating_load": round(heat_load, 2),
            "predicted_cooling_load": round(cool_load, 2),
            "predicted_energy_waste_pct": round(waste_pct, 2),
            "energy_optimization_score": round(opt_score, 2),
            "optimization_recommendations": recs
        }

    def get_prediction_history(self, db: Session, machine_id: Optional[str] = None, limit: int = 50) -> List[EnergyPrediction]:
        """Retrieve historical energy prediction logs."""
        query = db.query(EnergyPrediction)
        if machine_id:
            query = query.filter(EnergyPrediction.machine_id == machine_id)
        return query.order_by(EnergyPrediction.timestamp.desc()).limit(limit).all()

    def _generate_advice(self, load_model, inputs: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Evaluate building characteristics and simulate savings under modifications"""
        base_features = {
            'relative_compactness': inputs.get('relative_compactness', 0.76),
            'surface_area': inputs.get('surface_area', 680.0),
            'wall_area': inputs.get('wall_area', 310.0),
            'roof_area': inputs.get('roof_area', 180.0),
            'overall_height': inputs.get('overall_height', 5.0),
            'orientation': inputs.get('orientation', 3.0),
            'glazing_area': inputs.get('glazing_area', 0.20),
            'glazing_area_distribution': inputs.get('glazing_area_distribution', 2.0)
        }
        
        feature_cols = [
            'relative_compactness', 'surface_area', 'wall_area', 'roof_area', 
            'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'
        ]
        
        # Calculate baseline load
        df_base = pd.DataFrame([base_features])[feature_cols]
        base_loads = load_model.predict(df_base)[0]
        base_total = base_loads[0] + base_loads[1]
        
        recommendations = []
        
        # Glazing simulation
        if base_features['glazing_area'] > 0.25:
            sim_feat = base_features.copy()
            sim_feat['glazing_area'] = 0.1
            df_sim = pd.DataFrame([sim_feat])[feature_cols]
            sim_loads = load_model.predict(df_sim)[0]
            savings = base_total - (sim_loads[0] + sim_loads[1])
            if savings > 0:
                recommendations.append({
                    "action": "Reduce glazing area window ratio from current value to 10%",
                    "estimated_thermal_load_savings_kw": round(savings, 2),
                    "priority": "High" if savings > 5 else "Medium"
                })
                
        # Height & Roof profiling
        if base_features['overall_height'] > 5.0 and base_features['roof_area'] > 200.0:
            sim_feat = base_features.copy()
            sim_feat['overall_height'] = 3.5
            sim_feat['roof_area'] = 150.0
            df_sim = pd.DataFrame([sim_feat])[feature_cols]
            sim_loads = load_model.predict(df_sim)[0]
            savings = base_total - (sim_loads[0] + sim_loads[1])
            if savings > 0:
                recommendations.append({
                    "action": "Redesign layout for a lower height profile (3.5m) and optimized roof span",
                    "estimated_thermal_load_savings_kw": round(savings, 2),
                    "priority": "Medium"
                })
                
        if not recommendations:
            recommendations.append({
                "action": "No immediate building layout modifications required. Maintain current thermal envelope.",
                "estimated_thermal_load_savings_kw": 0.0,
                "priority": "Low"
            })
            
        return recommendations

    def _heuristic_energy(self, inputs: Dict[str, Any]) -> tuple:
        """Fallback calculation rules for energy thermal parameters"""
        height = inputs.get("overall_height", 5.0)
        glazing = inputs.get("glazing_area", 0.2)
        surf_area = inputs.get("surface_area", 680.0)
        
        # Simple calculations representing thermal loads
        heat = (surf_area * 0.05) + (height * 3.5) + (glazing * 15.0)
        cool = (surf_area * 0.04) + (height * 4.0) + (glazing * 22.0)
        
        # Wastage logic
        waste = 5.0
        if glazing > 0.3:
            waste += 10.0
        if height > 6.0:
            waste += 8.0
            
        # Optimization score (high waste drops score)
        score = max(10.0, 100.0 - (waste * 2.5))
        
        recs = []
        if glazing > 0.25:
            recs.append({
                "action": "Reduce glazing area window ratio from current value to 10%",
                "estimated_thermal_load_savings_kw": 4.5,
                "priority": "Medium"
            })
        if not recs:
            recs.append({
                "action": "No immediate building layout modifications required. Maintain current thermal envelope.",
                "estimated_thermal_load_savings_kw": 0.0,
                "priority": "Low"
            })
            
        return heat, cool, waste, score, recs

energy_service = EnergyService()
