"""
NexTwin AI — anomaly-detection/predict.py
=========================================
CLI interface for executing Unsupervised Anomaly Detection.

Usage:
  python predict.py --vib 1.8 --temp 60.0 --press 4.2 --noise 72.0 --freq 520.0 --amp 0.06 --method AutoEncoder

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import sys
import pickle
import argparse
import numpy as np
import pandas as pd
import torch
import torch.nn as nn

class AutoEncoder(nn.Module):
    def __init__(self, input_dim=6):
        super(AutoEncoder, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 4),
            nn.ReLU(),
            nn.Linear(4, 2),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(2, 4),
            nn.ReLU(),
            nn.Linear(4, input_dim)
        )
        
    def forward(self, x):
        latent = self.encoder(x)
        reconstructed = self.decoder(latent)
        return reconstructed

def predict_cli():
    parser = argparse.ArgumentParser(description="NexTwin AI - Detect Anomalies")
    parser.add_argument("--vib", type=float, default=1.8, help="Vibration (mm/s)")
    parser.add_argument("--temp", type=float, default=60.0, help="Temperature (C)")
    parser.add_argument("--press", type=float, default=4.2, help="Pressure (bar)")
    parser.add_argument("--noise", type=float, default=72.0, help="Noise Level (dB)")
    parser.add_argument("--freq", type=float, default=520.0, help="Sound Frequency (Hz)")
    parser.add_argument("--amp", type=float, default=0.06, help="Sound Amplitude")
    parser.add_argument("--method", type=str, default="Isolation Forest", choices=["Isolation Forest", "OCSVM", "AutoEncoder"], help="Algorithm method")
    
    args = parser.parse_args()

    # Load model
    current_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(current_dir, "..", "models", "anomaly", "anomaly_model.pkl")
    
    if not os.path.exists(model_path):
        print(f"Error: Model not found at {model_path}. Train the model first.", file=sys.stderr)
        sys.exit(1)
        
    with open(model_path, "rb") as f:
        pkg = pickle.load(f)
        
    # Scale features
    features = {
        'vibration_mm_s': args.vib,
        'temperature_c': args.temp,
        'pressure_bar': args.press,
        'noise_level_db': args.noise,
        'sound_frequency_hz': args.freq,
        'sound_amplitude': args.amp
    }
    
    df = pd.DataFrame([features])
    scaled = pkg['scaler'].transform(df)
    
    anomaly_detected = False
    anomaly_score = 0.0
    
    if args.method == "Isolation Forest":
        pred = pkg['iforest'].predict(scaled)[0]
        anomaly_detected = (pred == -1)
        anomaly_score = -pkg['iforest'].decision_function(scaled)[0]
    elif args.method == "OCSVM":
        pred = pkg['ocsvm'].predict(scaled)[0]
        anomaly_detected = (pred == -1)
        anomaly_score = -pkg['ocsvm'].score_samples(scaled)[0]
    elif args.method == "AutoEncoder":
        model = AutoEncoder(input_dim=6)
        model.load_state_dict(pkg['autoencoder_state'])
        model.eval()
        
        tensor_data = torch.tensor(scaled, dtype=torch.float32)
        with torch.no_grad():
            reconstructed = model(tensor_data).numpy()
            
        mse = np.mean((scaled - reconstructed) ** 2, axis=1)[0]
        anomaly_detected = (mse > pkg['ae_threshold'])
        anomaly_score = mse

    print("\n" + "="*50)
    print("NexTwin AI - Anomaly Inference Results")
    print("="*50)
    print(f"Inputs:                {features}")
    print(f"Algorithm Method:      {args.method}")
    print(f"Anomaly Detected:      {anomaly_detected}")
    print(f"Anomaly Score Index:   {anomaly_score:.4f}")
    print("="*50 + "\n")

if __name__ == "__main__":
    predict_cli()
