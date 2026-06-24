"""
NexTwin AI — health-prediction/train.py
======================================
Training script for the Machine Health & Failure Prediction model. 
Fits Random Forest, XGBoost, and LightGBM models. Selects the best performing 
estimator based on F1-Score, and exports it to disk.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
import sys
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, classification_report
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai_engine.model_registry import update_model_registry
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR, ensure_project_dirs

def train_health_model():
    print("NexTwin AI - Starting Machine Health Model training...")
    
    # Paths configuration
    ensure_project_dirs()
    
    data_path = PROCESSED_DATA_DIR / "engineered_machine_health.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing training dataset: {data_path}. Run synthetic generation first.")
        
    df = pd.read_csv(data_path)
    
    # Features and Target
    feature_cols = [
        'type', 'air_temperature', 'process_temperature', 'rotational_speed', 
        'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index'
    ]
    target_col = 'machine_failure'
    
    X = df[feature_cols]
    y = df[target_col]
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    # Preprocessor
    num_cols = ['air_temperature', 'process_temperature', 'rotational_speed', 'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index']
    cat_cols = ['type']
    
    preprocessor = ColumnTransformer(transformers=[
        ('num', StandardScaler(), num_cols),
        ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), cat_cols)
    ])
    
    # Class weights for imbalance
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = neg_count / max(1, pos_count)
    
    models = {
        "Random Forest": RandomForestClassifier(class_weight='balanced', random_state=42),
        "XGBoost": XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42, eval_metric='logloss'),
        "LightGBM": LGBMClassifier(class_weight='balanced', random_state=42, verbose=-1)
    }
    
    results = {}
    
    for name, model in models.items():
        clf = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('classifier', model)
        ])
        clf.fit(X_train, y_train)
        
        y_pred = clf.predict(X_test)
        f1 = f1_score(y_test, y_pred)
        results[name] = {"f1": f1, "pipeline": clf}
        print(f"  {name} Baseline F1-Score: {f1:.4f}")
        
    # Hyperparameter Grid Search on XGBoost
    print("  Optimizing XGBoost via Grid Search...")
    xgb_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', XGBClassifier(scale_pos_weight=scale_pos_weight, random_state=42, eval_metric='logloss'))
    ])
    
    param_grid = {
        'classifier__max_depth': [3, 5],
        'classifier__learning_rate': [0.1, 0.2],
        'classifier__n_estimators': [50, 100]
    }
    
    grid = GridSearchCV(xgb_pipeline, param_grid, cv=3, scoring='f1', n_jobs=-1)
    grid.fit(X_train, y_train)
    
    tuned_xgb = grid.best_estimator_
    y_pred_tuned = tuned_xgb.predict(X_test)
    tuned_f1 = f1_score(y_test, y_pred_tuned)
    
    results["Tuned XGBoost"] = {"f1": tuned_f1, "pipeline": tuned_xgb}
    print(f"  Tuned XGBoost F1-Score: {tuned_f1:.4f}")
    
    # Select best pipeline
    best_model_name = max(results, key=lambda k: results[k]['f1'])
    best_pipeline = results[best_model_name]['pipeline']
    print(f"  Best Model Selected: {best_model_name} (F1: {results[best_model_name]['f1']:.4f})")
    
    # Export best model
    output_path = MODEL_PATHS["health"]
    with open(output_path, 'wb') as f:
        pickle.dump(best_pipeline, f)
    update_model_registry(
        model_name="health_model",
        version="1.0.0",
        dataset="datasets/processed/engineered_machine_health.csv",
        artifact_path=str(output_path.relative_to(Path(__file__).resolve().parents[2])),
        metrics={
            "best_model": best_model_name,
            "f1_score": round(float(results[best_model_name]["f1"]), 6),
        },
    )
        
    print(f"  Serialized machine health model successfully exported to: {os.path.abspath(output_path)}")
    print("Machine Health Model training completed successfully!")

if __name__ == "__main__":
    train_health_model()
