"""
NexTwin AI — health-prediction/predict.py
=========================================
CLI interface for executing Machine Health and Failure predictions.

Usage:
  python predict.py --type M --air_temp 300.2 --proc_temp 310.5 --speed 1420 --torque 45.3 --wear 120 --health 85.0 --risk 0.1

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import argparse
import pandas as pd

def predict_cli():
    parser = argparse.ArgumentParser(description="NexTwin AI - Predict Machine Failure Risk")
    parser.add_argument("--type", type=str, default="M", help="Machine Type (L, M, H)")
    parser.add_argument("--air_temp", type=float, default=300.0, help="Air Temperature in Kelvin")
    parser.add_argument("--proc_temp", type=float, default=310.0, help="Process Temperature in Kelvin")
    parser.add_argument("--speed", type=float, default=1500.0, help="Rotational Speed in RPM")
    parser.add_argument("--torque", type=float, default=40.0, help="Torque in Nm")
    parser.add_argument("--wear", type=float, default=0.0, help="Tool Wear in minutes")
    parser.add_argument("--health", type=float, default=100.0, help="Current Health Score (0-100)")
    parser.add_argument("--risk", type=float, default=0.0, help="Failure Risk Index")
    
    args = parser.parse_args()

    # Load model
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "models", "health", "health_model.pkl")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Train the model first.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        model = pickle.load(f)
        
    # Prepare features
    features = {
        'type': args.type,
        'air_temperature': args.air_temp,
        'process_temperature': args.proc_temp,
        'rotational_speed': args.speed,
        'torque': args.torque,
        'tool_wear': args.wear,
        'machine_health_score': args.health,
        'failure_risk_index': args.risk
    }
    
    df = pd.DataFrame([features])
    
    # Predict
    pred = model.predict(df)[0]
    proba = model.predict_proba(df)[0][1]
    
    # Priority
    if proba > 0.8:
        priority = "Critical"
    elif proba > 0.5:
        priority = "High"
    elif proba > 0.2:
        priority = "Medium"
    else:
        priority = "Low"
        
    print("\n" + "="*50)
    print("NexTwin AI - Machine Health Inference Results")
    print("="*50)
    print(f"Inputs:                {features}")
    print(f"Failure Predicted:     {bool(pred)}")
    print(f"Failure Probability:   {proba:.4%}")
    print(f"Maintenance Priority:  {priority}")
    print("="*50 + "\n")

if __name__ == "__main__":
    predict_cli()
