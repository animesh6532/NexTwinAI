# NexTwin AI Project Audit Report

Audit date: 2026-06-23

## Executive Summary

The uploaded repository contained a FastAPI backend, AI training scripts, notebooks, and broad platform folders, but it was not fully runnable from a clean checkout. The main blockers were import-hostile AI directory names, model artifacts stored under `notebooks/`, missing processed datasets, an empty tests folder, empty deployment/frontend/digital-twin folders, database startup assumptions, and missing operational scripts.

This pass refactored the AI engine into an importable package, moved model artifacts into a managed model directory, added deterministic dataset generation, added setup/run/training scripts, added tests, added Docker assets, and corrected backend model/database paths.

## Repository Structure

Audited areas:

- `backend/app`: FastAPI app, routes, services, config, logging, database models.
- `ai_engine`: model training, prediction, evaluation, inference wrappers, model registry.
- `notebooks`: notebook artifacts and generation scripts.
- `datasets`: generated raw and processed datasets.
- `database`, `deployment`, `digital-twin`, `edge-device`, `frontend`, `assets`, `presentations`: folder skeletons.
- `tests`: created API and data-pipeline tests.
- Root operational files: setup, run, train, Docker, Compose, env example.

## Findings And Fixes

### Missing Files

- Missing `setup_project.py`: added.
- Missing `run_project.py`: added.
- Missing root `train_all.py`: added.
- Missing `Dockerfile`: added.
- Missing root `docker-compose.yml`: added.
- Missing API/model tests: added under `tests/`.
- Missing `RUN_GUIDE.md`: added.
- Missing `PROJECT_AUDIT_REPORT.md`: added.
- Missing `ai_engine/models/model_registry.json`: added.

### Broken Imports

- `ai-engine` and subfolders such as `health-prediction` were not valid Python package paths.
- `ai-engine/ai-copilot` did not match backend import `ai_engine.ai_copilot`.
- Refactored:
  - `ai-engine` -> `ai_engine`
  - `health-prediction` -> `health_prediction`
  - `energy-optimization` -> `energy_optimization`
  - `bottleneck-detection` -> `bottleneck_detection`
  - `anomaly-detection` -> `anomaly_detection`
  - `ai-copilot` -> `ai_copilot`
- Added `__init__.py` package markers.

### Incorrect Paths

- Backend services loaded models from `notebooks/*.pkl`.
- Training and inference scripts wrote/read models from `notebooks/*.pkl`.
- Fixed model layout:
  - `ai_engine/models/health/health_model.pkl`
  - `ai_engine/models/bottleneck/bottleneck_model.pkl`
  - `ai_engine/models/energy/energy_model.pkl`
  - `ai_engine/models/anomaly/anomaly_model.pkl`
  - `ai_engine/models/forecasting/forecasting_model.pkl`
- Added `ai_engine/paths.py` as the central path source.

### Model Management

- Moved shipped model artifacts from `notebooks/` to `ai_engine/models/...`.
- Added `model_registry.json` with factual artifact metadata for shipped models.
- Updated training scripts to overwrite registry entries with training metrics after retraining.

### Dataset Issues

- Expected processed datasets were missing.
- Added `ai_engine/data_pipeline.py` to generate raw and processed datasets deterministically.
- Generated processed datasets:
  - `engineered_machine_health.csv`
  - `engineered_mfg_bottleneck.csv`
  - `engineered_energy.csv`
  - `cleaned_synthetic_factory_data.csv`

### Backend Validation

- `backend/app/main.py` already had lifespan handling, middleware, CORS, route registration, Swagger paths, and exception handlers.
- Added table creation during startup when `AUTO_CREATE_TABLES=true`.
- Fixed health check SQL by using SQLAlchemy `text("SELECT 1")`.
- Updated database engine creation for SQLite compatibility while preserving PostgreSQL pooling.
- Default local `DATABASE_URL` now points at SQLite for a clean local run.
- PostgreSQL remains supported through `DATABASE_URL` and Docker Compose.

### API Validation

Audited routes:

- `machines.py`
- `sensors.py`
- `health.py`
- `bottlenecks.py`
- `energy.py`
- `anomalies.py`
- `simulations.py`
- `reports.py`
- `alerts.py`
- `copilot.py`

Fixes:

- Prediction routes now use services with corrected model paths.
- Health endpoint no longer uses raw SQL strings.
- Default prediction requests can persist on clean databases by auto-registering prediction target machines.
- Reports, simulations, and copilot logs ensure default system users exist before inserting records.

### Service Layer Validation

Audited services:

- `machine_service.py`
- `sensor_service.py`
- `health_service.py`
- `bottleneck_service.py`
- `energy_service.py`
- `anomaly_service.py`
- `simulation_service.py`
- `report_service.py`
- `copilot_service.py`

Fixes:

- Added `db_helpers.py` for default machine/user integrity.
- Corrected service model paths.
- Preserved fallback prediction logic when model files are unavailable.
- Reduced clean-database foreign-key failures.

### Database Validation

Audited:

- `db.py`
- `models.py`
- `schema.sql`
- `seed_data.py`

Findings:

- SQLAlchemy models and schema were broadly aligned.
- SQLite default failed with PostgreSQL-style engine options.
- Health check used SQLAlchemy-incompatible raw SQL for newer SQLAlchemy.
- Reports and copilot logs could fail on empty databases because default user `1` did not exist.

Fixes:

- SQLite and PostgreSQL engine settings now branch correctly.
- Startup can create tables automatically.
- Default users are created before report/simulation/copilot writes.

### AI Engine Validation

Audited:

- `train.py`
- `predict.py`
- `evaluate.py`
- `inference.py`

For:

- `health_prediction`
- `energy_optimization`
- `bottleneck_detection`
- `anomaly_detection`
- `forecasting`

Fixes:

- Updated model output paths.
- Added central model registry updates.
- Added generated datasets matching expected feature columns.
- Fixed `health_prediction/inference.py` import ordering bug for `Optional`.

### Notebook Validation

The notebook files exist, but the repository’s runnable path is now the Python data/training pipeline. The notebook runner still requires Jupyter dependencies and can be run after setup with `python notebooks/run_all_notebooks.py`.

### Security Issues

- `.env.example` previously used `super-secret-key`.
- Replaced with `change-this-secret`.
- `.env` remains ignored.
- Docker Compose uses local development credentials only.

### Performance And Scalability Issues

- Heavy model dependencies remain in `requirements.txt`.
- Training can be CPU-expensive, especially XGBoost/LightGBM/Torch/Prophet.
- Backend services lazy-load models to avoid startup cost.
- Database writes are synchronous; acceptable for this project stage, but async workers or task queues should be considered for high-volume telemetry.

### Empty Or Skeleton Areas

The following project areas are still structural placeholders with no implementation files:

- `frontend`
- `digital-twin`
- `edge-device`
- `deployment` subfolders other than root Docker assets
- `assets`
- `presentations`
- root `database` folder

They are documented as skeletons rather than silently treated as implemented modules.

## Validation Performed

- Python syntax compilation passed for backend, AI engine, notebooks scripts, setup/run scripts, and tests.
- Deterministic data pipeline executed successfully and generated all processed datasets.
- Dependency import check showed the sandbox runtime did not include FastAPI, SQLAlchemy, sklearn, xgboost, lightgbm, torch, pytest, or httpx before setup. The project now installs these from `requirements.txt`.

## Remaining Operational Notes

- Run `python setup_project.py` before running the backend or tests.
- Run `python train_all.py` to regenerate anomaly and forecasting models and replace registry metadata with training metrics.
- Use Docker Compose when PostgreSQL-backed validation is required.
