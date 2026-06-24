"""
NexTwin AI — energy-optimization/predict.py
=========================================
CLI interface for executing Energy Consumption & structural Optimization predictions.

Usage:
  python predict.py --compactness 0.76 --surface 680.0 --wall 310.0 --roof 180.0 --height 5.0 --orient 3.0 --glazing 0.2 --glaz_dist 2.0

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import argparse
import pandas as pd

def predict_cli():
    parser = argparse.ArgumentParser(description="NexTwin AI - Predict Building Energy Loads")
    parser.add_argument("--compactness", type=float, default=0.76, help="Relative Compactness")
    parser.add_argument("--surface", type=float, default=680.0, help="Surface Area")
    parser.add_argument("--wall", type=float, default=310.0, help="Wall Area")
    parser.add_argument("--roof", type=float, default=180.0, help="Roof Area")
    parser.add_argument("--height", type=float, default=5.0, help="Overall Height")
    parser.add_argument("--orient", type=float, default=3.0, help="Orientation (1-4)")
    parser.add_argument("--glazing", type=float, default=0.2, help="Glazing Area")
    parser.add_argument("--glaz_dist", type=float, default=2.0, help="Glazing Distribution (1-5)")
    
    args = parser.parse_args()

    # Load model
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "models", "energy", "energy_model.pkl")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Train the model first.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        pkg = pickle.load(f)
        
    # Prepare features
    features = {
        'relative_compactness': args.compactness,
        'surface_area': args.surface,
        'wall_area': args.wall,
        'roof_area': args.roof,
        'overall_height': args.height,
        'orientation': args.orient,
        'glazing_area': args.glazing,
        'glazing_area_distribution': args.glaz_dist
    }
    
    df = pd.DataFrame([features])
    
    # Predict
    loads = pkg['load_model'].predict(df)[0]
    waste = pkg['waste_model'].predict(df)[0]
    opt_score = pkg['optimization_model'].predict(df)[0]
    
    # Recommendations
    recs = []
    base_total = loads[0] + loads[1]
    
    if args.glazing > 0.25:
        sim_features = features.copy()
        sim_features['glazing_area'] = 0.1
        sim_df = pd.DataFrame([sim_features])
        sim_loads = pkg['load_model'].predict(sim_df)[0]
        savings = base_total - (sim_loads[0] + sim_loads[1])
        if savings > 0:
            recs.append({
                "action": "Reduce glazing area window ratio from current value to 10%",
                "savings_kw": round(savings, 2),
                "priority": "High" if savings > 5 else "Medium"
            })
            
    if args.height > 5.0 and args.roof > 200.0:
        sim_features = features.copy()
        sim_features['overall_height'] = 3.5
        sim_features['roof_area'] = 150.0
        sim_df = pd.DataFrame([sim_features])
        sim_loads = pkg['load_model'].predict(sim_df)[0]
        savings = base_total - (sim_loads[0] + sim_loads[1])
        if savings > 0:
            recs.append({
                "action": "Redesign layout for a lower height profile (3.5m) and optimized roof span",
                "savings_kw": round(savings, 2),
                "priority": "Medium"
            })
            
    if not recs:
        recs.append({
            "action": "No immediate building layout modifications required.",
            "savings_kw": 0.0,
            "priority": "Low"
        })

    print("\n" + "="*50)
    print("NexTwin AI - Energy Inference Results")
    print("="*50)
    print(f"Inputs:                  {features}")
    print(f"Predicted Heating Load:  {loads[0]:.2f} kW")
    print(f"Predicted Cooling Load:  {loads[1]:.2f} kW")
    print(f"Predicted Energy Waste:  {waste:.2f}%")
    print(f"Optimization Score:      {opt_score:.2f} (0-100)")
    print("\nOptimization Recommendations:")
    for r in recs:
        print(f"  - [{r['priority']}] {r['action']} (Est. savings: {r['savings_kw']:.2f} kW)")
    print("="*50 + "\n")

if __name__ == "__main__":
    predict_cli()
