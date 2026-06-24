"""
NexTwin AI — health-prediction/evaluate.py
=========================================
Evaluation script to measure the classification performance of the health model.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, accuracy_score

def evaluate_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    processed_dir = os.path.join(current_dir, "..", "..", "datasets", "processed")
    model_path = os.path.join(current_dir, "..", "models", "health", "health_model.pkl")
    data_path = os.path.join(processed_dir, "engineered_machine_health.csv")
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(data_path):
        print(f"Error: Dataset file not found at {data_path}.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        model = pickle.load(f)
        
    df = pd.read_csv(data_path)
    
    # Features and Target
    feature_cols = [
        'type', 'air_temperature', 'process_temperature', 'rotational_speed', 
        'torque', 'tool_wear', 'machine_health_score', 'failure_risk_index'
    ]
    target_col = 'machine_failure'
    
    X = df[feature_cols]
    y = df[target_col]
    
    # Train-test split (reproduce training split via random_state)
    _, X_test, _, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )
    
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print("\n" + "="*50)
    print("NexTwin AI - Machine Health Model Evaluation Report")
    print("="*50)
    print(f"Test Set Accuracy:     {accuracy_score(y_test, y_pred):.4%}")
    print(f"Test Set ROC-AUC:      {roc_auc_score(y_test, y_proba):.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("="*50 + "\n")

if __name__ == "__main__":
    evaluate_model()
