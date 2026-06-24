"""
NexTwin AI — bottleneck-detection/train.py
=========================================
Training script for the Production Bottleneck model.
Fits Random Forest and XGBoost regressors (for severity and production delay) 
and classifiers (for congestion risk). Bundles best models and exports to disk.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
import sys
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import r2_score, roc_auc_score
from xgboost import XGBRegressor, XGBClassifier

sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai_engine.model_registry import update_model_registry
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR, ensure_project_dirs

def train_bottleneck_model():
    print("NexTwin AI - Starting Bottleneck Models training...")
    
    ensure_project_dirs()
    
    data_path = PROCESSED_DATA_DIR / "engineered_mfg_bottleneck.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing training dataset: {data_path}")
        
    df = pd.read_csv(data_path)
    
    # Target calculations
    df['production_delay'] = df['target_quantity'] - df['actual_quantity']
    df['congestion_risk'] = (df['utilization_rate'] > 90.0).astype(int)
    
    # Feature columns
    feature_cols = [
        'machine_id', 'vibration_mm_s', 'temperature_c', 'pressure_bar',
        'noise_level_db', 'sound_frequency_hz', 'sound_amplitude',
        'defect_count', 'energy_draw_kw',
        'queue_length', 'utilization_rate', 'downtime_minutes',
        'throughput_rate', 'cycle_time', 'defect_rate'
    ]
    
    X = df[feature_cols]
    y_b = df['bottleneck_severity_index']
    y_d = df['production_delay']
    y_c = df['congestion_risk']
    
    # Preprocessor
    num_cols = [
        'vibration_mm_s', 'temperature_c', 'pressure_bar', 'noise_level_db', 
        'sound_frequency_hz', 'sound_amplitude', 'defect_count', 'energy_draw_kw',
        'queue_length', 'utilization_rate', 'downtime_minutes',
        'throughput_rate', 'cycle_time', 'defect_rate'
    ]
    cat_cols = ['machine_id']
    
    preprocessor = ColumnTransformer(transformers=[
        ('num', StandardScaler(), num_cols),
        ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), cat_cols)
    ])
    
    # Split
    X_train, X_test, y_train_full, y_test_full = train_test_split(
        X, df[['bottleneck_severity_index', 'production_delay', 'congestion_risk']], 
        test_size=0.2, random_state=42
    )
    y_train_b = y_train_full['bottleneck_severity_index']
    y_test_b = y_test_full['bottleneck_severity_index']
    y_train_d = y_train_full['production_delay']
    y_test_d = y_test_full['production_delay']
    y_train_c = y_train_full['congestion_risk']
    y_test_c = y_test_full['congestion_risk']
    
    # 1. Train Bottleneck Severity Regressor
    print("  Training Bottleneck Severity Regressor...")
    reg_models = {
        "Random Forest Reg": RandomForestRegressor(n_estimators=100, random_state=42),
        "XGBoost Reg": XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
    }
    
    best_b_score = -1.0
    best_b_model = None
    for name, model in reg_models.items():
        pipeline = Pipeline([('preprocessor', preprocessor), ('regressor', model)])
        pipeline.fit(X_train, y_train_b)
        score = r2_score(y_test_b, pipeline.predict(X_test))
        print(f"    {name} R2-Score: {score:.4f}")
        if score > best_b_score:
            best_b_score = score
            best_b_model = pipeline
            
    # 2. Train Production Delay Regressor
    print("  Training Production Delay Regressor...")
    best_d_score = -1.0
    best_d_model = None
    for name, model in reg_models.items():
        pipeline = Pipeline([('preprocessor', preprocessor), ('regressor', model)])
        pipeline.fit(X_train, y_train_d)
        score = r2_score(y_test_d, pipeline.predict(X_test))
        print(f"    {name} R2-Score: {score:.4f}")
        if score > best_d_score:
            best_d_score = score
            best_d_model = pipeline
            
    # 3. Train Congestion Classifier
    print("  Training Congestion Classifier...")
    clf_models = {
        "Random Forest Clf": RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42),
        "XGBoost Clf": XGBClassifier(n_estimators=100, learning_rate=0.1, random_state=42, eval_metric='logloss')
    }
    
    best_c_score = -1.0
    best_c_model = None
    for name, model in clf_models.items():
        pipeline = Pipeline([('preprocessor', preprocessor), ('classifier', model)])
        pipeline.fit(X_train, y_train_c)
        score = roc_auc_score(y_test_c, pipeline.predict_proba(X_test)[:, 1])
        print(f"    {name} ROC-AUC: {score:.4f}")
        if score > best_c_score:
            best_c_score = score
            best_c_model = pipeline
            
    # Package and export
    pkg = {
        'bottleneck_regressor': best_b_model,
        'delay_regressor': best_d_model,
        'congestion_classifier': best_c_model
    }
    
    output_path = MODEL_PATHS["bottleneck"]
    with open(output_path, 'wb') as f:
        pickle.dump(pkg, f)
    update_model_registry(
        model_name="bottleneck_model",
        version="1.0.0",
        dataset="datasets/processed/engineered_mfg_bottleneck.csv",
        artifact_path=str(output_path.relative_to(Path(__file__).resolve().parents[2])),
        metrics={
            "bottleneck_r2": round(float(best_b_score), 6),
            "delay_r2": round(float(best_d_score), 6),
            "congestion_roc_auc": round(float(best_c_score), 6),
        },
    )
        
    print(f"  Serialized bottleneck package successfully exported to: {os.path.abspath(output_path)}")
    print("Bottleneck Model training completed successfully!")

if __name__ == "__main__":
    train_bottleneck_model()
