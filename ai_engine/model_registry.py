from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict

from ai_engine.paths import MODELS_DIR


REGISTRY_PATH = MODELS_DIR / "model_registry.json"


def load_registry() -> Dict[str, Any]:
    if not REGISTRY_PATH.exists():
        return {"models": []}
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def update_model_registry(
    model_name: str,
    version: str,
    dataset: str,
    metrics: Dict[str, Any],
    artifact_path: str,
    training_date: str | None = None,
) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    registry = load_registry()
    records = [record for record in registry.get("models", []) if record.get("model_name") != model_name]
    records.append(
        {
            "model_name": model_name,
            "version": version,
            "training_date": training_date or datetime.now(timezone.utc).isoformat(),
            "dataset": dataset,
            "artifact_path": artifact_path.replace("\\", "/"),
            "metrics": metrics,
        }
    )
    registry["models"] = sorted(records, key=lambda item: item["model_name"])
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2), encoding="utf-8")
