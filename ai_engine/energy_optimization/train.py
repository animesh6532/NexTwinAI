"""
NexTwin AI — energy-optimization/train.py
=========================================
Training script for the Energy Consumption & Optimization models.
Trains XGBoost multi-output regressor for heating/cooling loads, waste, 
and optimization scores. Exports the package to disk.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import r2_score
from xgboost import XGBRegressor

sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai_engine.model_registry import update_model_registry
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR, ensure_project_dirs

def train_energy_model():
    print("NexTwin AI - Starting Energy Models training...")
    
    ensure_project_dirs()
    
    data_path = PROCESSED_DATA_DIR / "engineered_energy.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing training dataset: {data_path}")
        
    df = pd.read_csv(data_path)
    
    feature_cols = [
        'relative_compactness', 'surface_area', 'wall_area', 'roof_area', 
        'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'
    ]
    
    X = df[feature_cols]
    y_loads = df[['heating_load', 'cooling_load']]
    y_waste = df['energy_waste_pct']
    y_opt = df['energy_optimization_score']
    
    preprocessor = StandardScaler()
    
    # Train-test split
    X_train, X_test, y_train_loads, y_test_loads = train_test_split(X, y_loads, test_size=0.2, random_state=42)
    _, _, y_train_waste, y_test_waste = train_test_split(X, y_waste, test_size=0.2, random_state=42)
    _, _, y_train_opt, y_test_opt = train_test_split(X, y_opt, test_size=0.2, random_state=42)
    
    # 1. Train Load model
    print("  Training Thermal Load Multi-Output Regressor...")
    load_model = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', MultiOutputRegressor(XGBRegressor(n_estimators=100, max_depth=5, learning_rate=0.1, random_state=42)))
    ])
    load_model.fit(X_train, y_train_loads)
    pred_loads = load_model.predict(X_test)
    r2_heat = r2_score(y_test_loads.iloc[:, 0], pred_loads[:, 0])
    r2_cool = r2_score(y_test_loads.iloc[:, 1], pred_loads[:, 1])
    print(f"    Thermal Load R2 Scores -> Heating: {r2_heat:.4f}, Cooling: {r2_cool:.4f}")
    
    # 2. Train Waste model
    print("  Training Waste Regressor...")
    waste_model = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42))
    ])
    waste_model.fit(X_train, y_train_waste)
    r2_w = r2_score(y_test_waste, waste_model.predict(X_test))
    print(f"    Waste R2-Score: {r2_w:.4f}")
    
    # 3. Train Optimization model
    print("  Training Optimization Score Regressor...")
    opt_model = Pipeline([
        ('preprocessor', preprocessor),
        ('regressor', XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42))
    ])
    opt_model.fit(X_train, y_train_opt)
    r2_o = r2_score(y_test_opt, opt_model.predict(X_test))
    print(f"    Optimization Score R2: {r2_o:.4f}")
    
    # Package and save
    pkg = {
        'load_model': load_model,
        'waste_model': waste_model,
        'optimization_model': opt_model
    }
    
    output_path = MODEL_PATHS["energy"]
    with open(output_path, 'wb') as f:
        pickle.dump(pkg, f)
    update_model_registry(
        model_name="energy_model",
        version="1.0.0",
        dataset="datasets/processed/engineered_energy.csv",
        artifact_path=str(output_path.relative_to(Path(__file__).resolve().parents[2])),
        metrics={
            "heating_load_r2": round(float(r2_heat), 6),
            "cooling_load_r2": round(float(r2_cool), 6),
            "waste_r2": round(float(r2_w), 6),
            "optimization_score_r2": round(float(r2_o), 6),
        },
    )
        
    print(f"  Serialized energy package successfully exported to: {os.path.abspath(output_path)}")
    print("Energy Models training completed successfully!")

if __name__ == "__main__":
    train_energy_model()
