from __future__ import annotations

import os
import socket
import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
ENV_PATH = PROJECT_ROOT / ".env"
ENV_EXAMPLE_PATH = PROJECT_ROOT / ".env.example"


def run(command: list[str], check: bool = True) -> subprocess.CompletedProcess:
    print(f"Running: {' '.join(command)}")
    return subprocess.run(command, cwd=PROJECT_ROOT, check=check)


def create_env_file() -> None:
    if ENV_PATH.exists():
        print(".env already exists.")
        return
    ENV_PATH.write_text(ENV_EXAMPLE_PATH.read_text(encoding="utf-8"), encoding="utf-8")
    print("Created .env from .env.example.")


def verify_postgres_hint() -> None:
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url.startswith("postgresql"):
        print("PostgreSQL check skipped because DATABASE_URL is not PostgreSQL.")
        return
    host = os.getenv("POSTGRES_SERVER", "localhost")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    with socket.create_connection((host, port), timeout=5):
        print(f"PostgreSQL port is reachable at {host}:{port}.")


def main() -> None:
    skip_install = "--skip-install" in sys.argv
    create_env_file()

    if not skip_install:
        run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    from ai_engine.data_pipeline import prepare_processed_data
    from ai_engine.paths import ensure_project_dirs

    ensure_project_dirs()
    prepare_processed_data(force="--force-data" in sys.argv)
    verify_postgres_hint()

    print("NexTwin AI setup completed.")


if __name__ == "__main__":
    main()
