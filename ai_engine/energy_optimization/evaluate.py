"""
NexTwin AI — energy-optimization/evaluate.py
=========================================
Evaluation script to measure energy models performance.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_squared_error

def evaluate_model():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    processed_dir = os.path.join(current_dir, "..", "..", "datasets", "processed")
    model_path = os.path.join(current_dir, "..", "models", "energy", "energy_model.pkl")
    data_path = os.path.join(processed_dir, "engineered_energy.csv")
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}.", file=sys.stderr)
        sys.exit(1)
        
    if not os.path.exists(data_path):
        print(f"Error: Dataset file not found at {data_path}.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        pkg = pickle.load(f)
        
    df = pd.read_csv(data_path)
    
    feature_cols = [
        'relative_compactness', 'surface_area', 'wall_area', 'roof_area', 
        'overall_height', 'orientation', 'glazing_area', 'glazing_area_distribution'
    ]
    
    X = df[feature_cols]
    y_loads = df[['heating_load', 'cooling_load']]
    y_waste = df['energy_waste_pct']
    y_opt = df['energy_optimization_score']
    
    # Splits (match seed)
    X_train, X_test, y_train_loads, y_test_loads = train_test_split(X, y_loads, test_size=0.2, random_state=42)
    _, _, y_train_waste, y_test_waste = train_test_split(X, y_waste, test_size=0.2, random_state=42)
    _, _, y_train_opt, y_test_opt = train_test_split(X, y_opt, test_size=0.2, random_state=42)
    
    # Predict
    pred_loads = pkg['load_model'].predict(X_test)
    r2_heat = r2_score(y_test_loads.iloc[:, 0], pred_loads[:, 0])
    r2_cool = r2_score(y_test_loads.iloc[:, 1], pred_loads[:, 1])
    rmse_heat = mean_squared_error(y_test_loads.iloc[:, 0], pred_loads[:, 0], squared=False)
    rmse_cool = mean_squared_error(y_test_loads.iloc[:, 1], pred_loads[:, 1], squared=False)
    
    pred_waste = pkg['waste_model'].predict(X_test)
    r2_waste = r2_score(y_test_waste, pred_waste)
    rmse_waste = mean_squared_error(y_test_waste, pred_waste, squared=False)
    
    pred_opt = pkg['optimization_model'].predict(X_test)
    r2_opt = r2_score(y_test_opt, pred_opt)
    rmse_opt = mean_squared_error(y_test_opt, pred_opt, squared=False)
    
    print("\n" + "="*50)
    print("NexTwin AI - Energy Models Evaluation Report")
    print("="*50)
    print("1. Thermal Loads Multi-Output Regression:")
    print(f"   Heating Load R2:    {r2_heat:.4f} (RMSE: {rmse_heat:.4f} kW)")
    print(f"   Cooling Load R2:    {r2_cool:.4f} (RMSE: {rmse_cool:.4f} kW)")
    print("\n2. Energy Waste Percentage Regression:")
    print(f"   Waste R2-Score:     {r2_waste:.4f} (RMSE: {rmse_waste:.4f}%)")
    print("\n3. Optimization Score Regression:")
    print(f"   Optimization R2:    {r2_opt:.4f} (RMSE: {rmse_opt:.4f})")
    print("="*50 + "\n")

if __name__ == "__main__":
    evaluate_model()
