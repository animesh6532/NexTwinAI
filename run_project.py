from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent


def load_env() -> None:
    env_path = PROJECT_ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def verify_paths() -> None:
    from ai_engine.paths import MODEL_PATHS, PROCESSED_DATA_DIR

    print("Startup diagnostics")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'configured in app settings')}")
    for name, path in MODEL_PATHS.items():
        status = "present" if path.exists() else "missing"
        print(f"Model {name}: {status} ({path})")
    required_datasets = [
        "engineered_machine_health.csv",
        "engineered_mfg_bottleneck.csv",
        "engineered_energy.csv",
        "cleaned_synthetic_factory_data.csv",
    ]
    for filename in required_datasets:
        path = PROCESSED_DATA_DIR / filename
        status = "present" if path.exists() else "missing"
        print(f"Dataset {filename}: {status}")


def main() -> None:
    load_env()
    verify_paths()
    os.environ.setdefault("PYTHONPATH", str(PROJECT_ROOT / "backend"))
    subprocess.run(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--app-dir",
            str(PROJECT_ROOT / "backend"),
            "--host",
            os.getenv("HOST", "0.0.0.0"),
            "--port",
            os.getenv("PORT", "8000"),
            "--reload" if os.getenv("RELOAD", "false").lower() == "true" else "--no-access-log",
        ],
        cwd=PROJECT_ROOT,
        check=True,
    )


if __name__ == "__main__":
    main()
