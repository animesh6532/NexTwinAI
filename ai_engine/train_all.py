"""
NexTwin AI — train_all.py
=========================
Orchestration script to train all predictive modules in sequence.

Author: Principal AI Architect & Senior ML Engineer
"""

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ai_engine.paths import ensure_project_dirs
from ai_engine.data_pipeline import prepare_processed_data

from ai_engine.health_prediction.train import train_health_model
from ai_engine.bottleneck_detection.train import train_bottleneck_model
from ai_engine.energy_optimization.train import train_energy_model
from ai_engine.anomaly_detection.train import train_anomaly_model
from ai_engine.forecasting.train import train_forecasting_models

def main():
    ensure_project_dirs()
    prepare_processed_data()
    print("="*60)
    print("NexTwin AI - Comprehensive Model Training Orchestrator")
    print("="*60)
    
    try:
        print("\n--- Training Phase 1: Machine Health Classifier ---")
        train_health_model()
    except Exception as e:
        print(f"Error training Machine Health model: {str(e)}")
        
    try:
        print("\n--- Training Phase 2: Bottleneck Detection Models ---")
        train_bottleneck_model()
    except Exception as e:
        print(f"Error training Bottleneck models: {str(e)}")
        
    try:
        print("\n--- Training Phase 3: Energy Optimization Models ---")
        train_energy_model()
    except Exception as e:
        print(f"Error training Energy models: {str(e)}")
        
    try:
        print("\n--- Training Phase 4: Unsupervised Anomaly Detectors ---")
        train_anomaly_model()
    except Exception as e:
        print(f"Error training Anomaly models: {str(e)}")
        
    try:
        print("\n--- Training Phase 5: Mid-term Forecasting Models ---")
        train_forecasting_models()
    except Exception as e:
        print(f"Error training Forecasting models: {str(e)}")
        
    print("\n" + "="*60)
    print("All model training runs completed!")
    print("="*60)

if __name__ == "__main__":
    main()
