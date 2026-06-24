"""
NexTwin AI — forecasting/train.py
=================================
Training script for mid-term time-series forecasting. Fits Prophet, 
XGBoost (recursive lag model), and PyTorch recurrent LSTM models.
Bundles models and exports forecasting_model.pkl.

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
from sklearn.preprocessing import MinMaxScaler
from xgboost import XGBRegressor

sys.path.append(str(Path(__file__).resolve().parents[2]))
from ai_engine.model_registry import update_model_registry
from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR, ensure_project_dirs

# Try to import Prophet (Meta)
try:
    from prophet import Prophet
except ImportError:
    Prophet = None

# Recurrent LSTM model class definition
class LSTMForecaster(nn.Module):
    def __init__(self, input_dim=1, hidden_dim=32, num_layers=1):
        super(LSTMForecaster, self).__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.fc = nn.Linear(hidden_dim, 1)
        
    def forward(self, x):
        out, _ = self.lstm(x)
        pred = self.fc(out[:, -1, :])
        return pred

def train_forecasting_models():
    print("NexTwin AI - Starting Time-Series Forecasting Models training...")
    
    ensure_project_dirs()
    
    mfg_path = PROCESSED_DATA_DIR / "engineered_mfg_bottleneck.csv"
    energy_path = PROCESSED_DATA_DIR / "engineered_energy.csv"
    
    if not os.path.exists(mfg_path) or not os.path.exists(energy_path):
        raise FileNotFoundError("Missing training datasets. Generate them first.")
        
    df_mfg = pd.read_csv(mfg_path)
    df_energy = pd.read_csv(energy_path)
    
    # 1. Production Throughput Daily Aggregation
    df_mfg['date'] = pd.to_datetime(df_mfg['timestamp']).dt.date
    df_daily_prod = df_mfg.groupby('date')['actual_quantity'].sum().reset_index()
    df_daily_prod.columns = ['ds', 'y']
    df_daily_prod['ds'] = pd.to_datetime(df_daily_prod['ds'])
    
    # 2. Utilization Daily Aggregation
    df_daily_util = df_mfg.groupby('date')['utilization_rate'].mean().reset_index()
    df_daily_util.columns = ['date', 'utilization']
    df_daily_util['date'] = pd.to_datetime(df_daily_util['date'])
    
    # 3. Energy Daily Load Aggregation
    # Generate daily dates matching records count
    date_index = pd.date_range(start="2026-03-24", periods=len(df_energy), freq='D')
    df_energy['ds'] = date_index
    df_daily_energy = df_energy[['ds', 'total_load']].copy()
    df_daily_energy.columns = ['date', 'energy']
    
    # --- A. Fit Prophet (Production Throughput) ---
    print("  Fitting Prophet model for Production Throughput...")
    prophet_model = None
    if Prophet is not None:
        try:
            prophet_model = Prophet(yearly_seasonality=False, daily_seasonality=False, weekly_seasonality=True)
            prophet_model.fit(df_daily_prod)
            print("    Prophet model fitted.")
        except Exception as e:
            print(f"    Prophet model fitting failed: {str(e)}")
            prophet_model = None
    else:
        print("    Prophet library not installed. Skipping Prophet training.")

    # --- B. Fit XGBoost with Lags (Energy Load) ---
    print("  Fitting XGBoost model with auto-regressive lags for Energy...")
    df_xg = df_daily_energy.copy()
    df_xg['lag_1'] = df_xg['energy'].shift(1)
    df_xg['lag_7'] = df_xg['energy'].shift(7)
    df_xg['lag_14'] = df_xg['energy'].shift(14)
    df_xg = df_xg.dropna().reset_index(drop=True)
    
    X_xgb = df_xg[['lag_1', 'lag_7', 'lag_14']]
    y_xgb = df_xg['energy']
    
    xgb_ts = XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=42)
    xgb_ts.fit(X_xgb, y_xgb)
    print("    XGBoost lag forecaster trained.")
    
    # --- C. Fit PyTorch LSTM (Machine Utilization) ---
    print("  Fitting PyTorch LSTM model for Machine Utilization...")
    scaler = MinMaxScaler()
    util_scaled = scaler.fit_transform(df_daily_util[['utilization']].values)
    
    def create_sequences(data, seq_length=7):
        xs, ys = [], []
        for i in range(len(data) - seq_length):
            xs.append(data[i:(i + seq_length)])
            ys.append(data[i + seq_length])
        return np.array(xs), np.array(ys)
        
    X_seq, y_seq = create_sequences(util_scaled)
    X_tensor = torch.tensor(X_seq, dtype=torch.float32)
    y_tensor = torch.tensor(y_seq, dtype=torch.float32)
    
    lstm_model = LSTMForecaster()
    criterion = nn.MSELoss()
    optimizer = torch.optim.Adam(lstm_model.parameters(), lr=0.01)
    
    lstm_model.train()
    for epoch in range(25):
        optimizer.zero_grad()
        outputs = lstm_model(X_tensor)
        loss = criterion(outputs, y_tensor)
        loss.backward()
        optimizer.step()
        
    print(f"    LSTM trained. Final MSE Loss: {loss.item():.5f}")
    
    # Package forecasting models
    pkg = {
        'prophet_model': prophet_model,
        'xgb_ts_model': xgb_ts,
        'energy_history': list(df_daily_energy['energy'].values),
        'lstm_state': lstm_model.state_dict(),
        'lstm_scaler': scaler,
        'lstm_history_seq': util_scaled[-7:].tolist()
    }
    
    output_path = MODEL_PATHS["forecasting"]
    with open(output_path, 'wb') as f:
        pickle.dump(pkg, f)
    update_model_registry(
        model_name="forecasting_model",
        version="1.0.0",
        dataset="datasets/processed/engineered_mfg_bottleneck.csv; datasets/processed/engineered_energy.csv",
        artifact_path=str(output_path.relative_to(Path(__file__).resolve().parents[2])),
        metrics={
            "prophet_fitted": prophet_model is not None,
            "xgb_lag_model_trained": True,
            "lstm_final_mse": round(float(loss.item()), 6),
        },
    )
        
    print(f"  Serialized forecasting package successfully exported to: {os.path.abspath(output_path)}")
    print("Forecasting Models training completed successfully!")

if __name__ == "__main__":
    train_forecasting_models()
