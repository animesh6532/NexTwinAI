"""
NexTwin AI — anomaly-detection/train.py
======================================
Training script for the unsupervised anomaly detection model.
Fits Isolation Forest, One-Class SVM, and PyTorch deep AutoEncoder models.
Exports the package to disk.

Author: Principal AI Architect & Senior ML Engineer
"""

import os
import pickle
import pandas as pd
import numpy as np
from pathlib import Path
import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.metrics import f1_score

sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai_engine.model_registry import update_model_registry
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR, ensure_project_dirs

# Declare PyTorch AutoEncoder model class
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

def train_anomaly_model():
    print("NexTwin AI - Starting Anomaly Models training...")
    
    ensure_project_dirs()
    
    data_path = PROCESSED_DATA_DIR / "cleaned_synthetic_factory_data.csv"
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Missing training dataset: {data_path}")
        
    df = pd.read_csv(data_path)
    
    sensor_cols = [
        'vibration_mm_s', 'temperature_c', 'pressure_bar', 
        'noise_level_db', 'sound_frequency_hz', 'sound_amplitude'
    ]
    
    X = df[sensor_cols]
    y = df['anomaly_label']
    
    # Train-test split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Fit scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Normal records for AutoEncoder and OCSVM
    X_train_normal = X_train_scaled[y_train == 0]
    
    # 1. Train Isolation Forest
    print("  Training Isolation Forest...")
    iforest = IsolationForest(contamination=0.025, random_state=42)
    iforest.fit(X_train_scaled)
    y_pred_if = np.where(iforest.predict(X_test_scaled) == -1, 1, 0)
    iforest_f1 = f1_score(y_test, y_pred_if)
    print(f"    IForest Test F1-Score: {iforest_f1:.4f}")
    
    # 2. Train One-Class SVM
    print("  Training One-Class SVM...")
    ocsvm = OneClassSVM(nu=0.025, kernel='rbf', gamma='scale')
    ocsvm.fit(X_train_normal)
    y_pred_oc = np.where(ocsvm.predict(X_test_scaled) == -1, 1, 0)
    ocsvm_f1 = f1_score(y_test, y_pred_oc)
    print(f"    OCSVM Test F1-Score:    {ocsvm_f1:.4f}")
    
    # 3. Train PyTorch AutoEncoder
    print("  Training PyTorch AutoEncoder...")
    train_tensor = torch.tensor(X_train_normal, dtype=torch.float32)
    train_loader = DataLoader(TensorDataset(train_tensor), batch_size=64, shuffle=True)
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = AutoEncoder(input_dim=len(sensor_cols)).to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    model.train()
    for epoch in range(15):
        epoch_loss = 0.0
        for batch in train_loader:
            x_batch = batch[0].to(device)
            optimizer.zero_grad()
            outputs = model(x_batch)
            loss = criterion(outputs, x_batch)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * x_batch.size(0)
            
    # Calculate threshold on test set (e.g. 97.5th percentile)
    model.eval()
    with torch.no_grad():
        test_tensor = torch.tensor(X_test_scaled, dtype=torch.float32).to(device)
        reconstructed = model(test_tensor).cpu().numpy()
        
    mse_errors = np.mean((X_test_scaled - reconstructed) ** 2, axis=1)
    threshold = np.percentile(mse_errors, 97.5)
    y_pred_ae = (mse_errors > threshold).astype(int)
    autoencoder_f1 = f1_score(y_test, y_pred_ae)
    print(f"    AutoEncoder F1-Score:   {autoencoder_f1:.4f}")
    
    # Package and save
    pkg = {
        'scaler': scaler,
        'iforest': iforest,
        'ocsvm': ocsvm,
        'autoencoder_state': model.state_dict(),
        'ae_threshold': threshold
    }
    
    output_path = MODEL_PATHS["anomaly"]
    with open(output_path, 'wb') as f:
        pickle.dump(pkg, f)
    update_model_registry(
        model_name="anomaly_model",
        version="1.0.0",
        dataset="datasets/processed/cleaned_synthetic_factory_data.csv",
        artifact_path=str(output_path.relative_to(Path(__file__).resolve().parents[2])),
        metrics={
            "isolation_forest_f1": round(float(iforest_f1), 6),
            "ocsvm_f1": round(float(ocsvm_f1), 6),
            "autoencoder_f1": round(float(autoencoder_f1), 6),
            "autoencoder_threshold": round(float(threshold), 6),
        },
    )
        
    print(f"  Serialized anomaly package successfully exported to: {os.path.abspath(output_path)}")
    print("Anomaly Detection Models training completed successfully!")

if __name__ == "__main__":
    train_anomaly_model()
