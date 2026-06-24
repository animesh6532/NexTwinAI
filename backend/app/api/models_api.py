"""
NexTwin AI — models_api.py
==========================
REST API endpoint for monitoring model registries and artifact load statuses.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
import json
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any

from app.config.config import settings

router = APIRouter()

class ModelStatusDetail(BaseModel):
    status: str = Field(..., description="Load status of the model pkl file: loaded or unloaded")
    path: str = Field(..., description="Relative file path to model artifact")
    version: str = Field(..., description="Semver version of the trained model")
    training_date: str = Field(..., description="ISO timestamp of model training completion")
    metrics: Dict[str, Any] = Field(..., description="Trained model validation metrics")

class ModelsStatusResponse(BaseModel):
    health_model: ModelStatusDetail
    energy_model: ModelStatusDetail
    anomaly_model: ModelStatusDetail
    bottleneck_model: ModelStatusDetail
    forecasting_model: ModelStatusDetail

@router.get("/models/status", response_model=ModelsStatusResponse, status_code=status.HTTP_200_OK)
def get_models_status():
    """
    Get the registry status, paths, versions, training dates, and metrics
    of all platform predictive models.
    """
    registry_path = os.path.join(settings.MODEL_DIR, "model_registry.json")
    
    registry = {"models": []}
    if os.path.exists(registry_path):
        try:
            with open(registry_path, "r", encoding="utf-8") as f:
                registry = json.load(f)
        except Exception:
            pass
            
    # Structure mapping lookup
    model_lookup = {item["model_name"]: item for item in registry.get("models", [])}
    response_data = {}
    
    model_keys = ["health_model", "energy_model", "anomaly_model", "bottleneck_model", "forecasting_model"]
    
    fallback_paths = {
        "health_model": "ai_engine/models/health/health_model.pkl",
        "energy_model": "ai_engine/models/energy/energy_model.pkl",
        "anomaly_model": "ai_engine/models/anomaly/anomaly_model.pkl",
        "bottleneck_model": "ai_engine/models/bottleneck/bottleneck_model.pkl",
        "forecasting_model": "ai_engine/models/forecasting/forecasting_model.pkl"
    }
    
    for m_key in model_keys:
        record = model_lookup.get(m_key)
        rel_path = record.get("artifact_path") if record else fallback_paths[m_key]
        
        # Resolve absolute path relative to workspace root
        base_dir = os.path.abspath(os.path.join(settings.MODEL_DIR, "..", ".."))
        abs_path = os.path.abspath(os.path.join(base_dir, rel_path))
        
        is_loaded = os.path.exists(abs_path)
        
        response_data[m_key] = {
            "status": "loaded" if is_loaded else "unloaded",
            "path": rel_path.replace("\\", "/"),
            "version": record.get("version", "1.0.0") if record else "0.0.0",
            "training_date": record.get("training_date", "") if record else "",
            "metrics": record.get("metrics", {}) if record else {}
        }
        
    return response_data
