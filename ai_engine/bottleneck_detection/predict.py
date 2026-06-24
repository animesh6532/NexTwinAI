"""
NexTwin AI — bottleneck-detection/predict.py
============================================
CLI interface for executing Bottleneck Severity and Congestion risk predictions.

Usage:
  python predict.py --machine_id M_001 --vib 1.8 --temp 62.5 --press 4.1 --noise 75.0 --freq 525.0 --amp 0.055 --defects 1 --energy 65.0

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import argparse
import pandas as pd

def predict_cli():
    parser = argparse.ArgumentParser(description="NexTwin AI - Predict Production Bottlenecks")
    parser.add_argument("--machine_id", type=str, default="M_001", help="Machine ID")
    parser.add_argument("--vib", type=float, default=1.8, help="Vibration amplitude (mm/s)")
    parser.add_argument("--temp", type=float, default=60.0, help="Temperature (C)")
    parser.add_argument("--press", type=float, default=4.2, help="Pressure (bar)")
    parser.add_argument("--noise", type=float, default=72.0, help="Noise Level (dB)")
    parser.add_argument("--freq", type=float, default=520.0, help="Sound Frequency (Hz)")
    parser.add_argument("--amp", type=float, default=0.06, help="Sound Amplitude")
    parser.add_argument("--defects", type=float, default=0.0, help="Defect Count")
    parser.add_argument("--energy", type=float, default=65.0, help="Energy Draw (kW)")
    
    args = parser.parse_args()

    # Load model
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "models", "bottleneck", "bottleneck_model.pkl")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Train the model first.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        pkg = pickle.load(f)
        
    # Prepare features
    features = {
        'machine_id': args.machine_id,
        'vibration_mm_s': args.vib,
        'temperature_c': args.temp,
        'pressure_bar': args.press,
        'noise_level_db': args.noise,
        'sound_frequency_hz': args.freq,
        'sound_amplitude': args.amp,
        'defect_count': args.defects,
        'energy_draw_kw': args.energy
    }
    
    df = pd.DataFrame([features])
    
    # Predict
    risk_score = pkg['bottleneck_regressor'].predict(df)[0]
    delay = pkg['delay_regressor'].predict(df)[0]
    congestion = pkg['congestion_classifier'].predict(df)[0]
    congestion_prob = pkg['congestion_classifier'].predict_proba(df)[0][1]
        
    print("\n" + "="*50)
    print("NexTwin AI - Bottleneck Inference Results")
    print("="*50)
    print(f"Inputs:                  {features}")
    print(f"Bottleneck Risk Score:   {risk_score:.2f} (0-10)")
    print(f"Predicted Prod Delay:    {delay:.2f} units")
    print(f"Congestion Detected:     {bool(congestion)}")
    print(f"Congestion Probability:  {congestion_prob:.4%}")
    print("="*50 + "\n")

if __name__ == "__main__":
    predict_cli()
