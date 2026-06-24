from __future__ import annotations

from pathlib import Path


AI_ENGINE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = AI_ENGINE_DIR.parent
DATASETS_DIR = PROJECT_ROOT / "datasets"
RAW_DATA_DIR = DATASETS_DIR / "raw"
PROCESSED_DATA_DIR = DATASETS_DIR / "processed"
MODELS_DIR = AI_ENGINE_DIR / "models"

MODEL_PATHS = {
    "health": MODELS_DIR / "health" / "health_model.pkl",
    "bottleneck": MODELS_DIR / "bottleneck" / "bottleneck_model.pkl",
    "energy": MODELS_DIR / "energy" / "energy_model.pkl",
    "anomaly": MODELS_DIR / "anomaly" / "anomaly_model.pkl",
    "forecasting": MODELS_DIR / "forecasting" / "forecasting_model.pkl",
}


def ensure_project_dirs() -> None:
    for path in [RAW_DATA_DIR, PROCESSED_DATA_DIR, *MODEL_PATHS.values()]:
        directory = path if path.suffix == "" else path.parent
        directory.mkdir(parents=True, exist_ok=True)
