"""
NexTwin AI — bottleneck-detection/evaluate.py
============================================
Evaluation script to measure the bottleneck model pipeline.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error, classification_report, roc_auc_score

def evaluate_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    processed_dir = os.path.join(current_dir, "..", "..", "datasets", "processed")
    model_path = os.path.join(current_dir, "..", "models", "bottleneck", "bottleneck_model.pkl")
    data_path = os.path.join(processed_dir, "engineered_mfg_bottleneck.csv")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(data_path):
        print(f"Error: Dataset not found at {data_path}.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        pkg = pickle.load(f)
        
    df = pd.read_csv(data_path)
    
    df['production_delay'] = df['target_quantity'] - df['actual_quantity']
    df['congestion_risk'] = (df['utilization_rate'] > 90.0).astype(int)
    
    feature_cols = [
        'machine_id', 'vibration_mm_s', 'temperature_c', 'pressure_bar',
        'noise_level_db', 'sound_frequency_hz', 'sound_amplitude',
        'defect_count', 'energy_draw_kw'
    ]
    
    X = df[feature_cols]
    y_b = df['bottleneck_severity_index']
    y_d = df['production_delay']
    y_c = df['congestion_risk']
    
    # Train-test split
    X_train, X_test, y_train_b, y_test_b = train_test_split(X, y_b, test_size=0.2, random_state=42)
    _, _, y_train_d, y_test_d = train_test_split(X, y_d, test_size=0.2, random_state=42)
    _, _, y_train_c, y_test_c = train_test_split(X, y_c, test_size=0.2, random_state=42, stratify=y_c)
    
    # 1. Evaluate Severity
    y_pred_b = pkg['bottleneck_regressor'].predict(X_test)
    r2_b = r2_score(y_test_b, y_pred_b)
    rmse_b = mean_squared_error(y_test_b, y_pred_b, squared=False)
    
    # 2. Evaluate Delay
    y_pred_d = pkg['delay_regressor'].predict(X_test)
    r2_d = r2_score(y_test_d, y_pred_d)
    rmse_d = mean_squared_error(y_test_d, y_pred_d, squared=False)
    
    # 3. Evaluate Congestion
    y_pred_c = pkg['congestion_classifier'].predict(X_test)
    y_proba_c = pkg['congestion_classifier'].predict_proba(X_test)[:, 1]
    roc_c = roc_auc_score(y_test_c, y_proba_c)
    
    print("\n" + "="*50)
    print("NexTwin AI - Bottleneck Model Evaluation Report")
    print("="*50)
    print("1. Bottleneck Severity Regression:")
    print(f"   R2-Score:           {r2_b:.4f}")
    print(f"   RMSE:               {rmse_b:.4f}")
    print("\n2. Production Delay Regression:")
    print(f"   R2-Score:           {r2_d:.4f}")
    print(f"   RMSE:               {rmse_d:.4f}")
    print("\n3. Congestion Risk Classification:")
    print(f"   ROC-AUC Score:      {roc_c:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test_c, y_pred_c))
    print("="*50 + "\n")

if __name__ == "__main__":
    evaluate_model()
