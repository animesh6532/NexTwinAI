# NexTwin AI Run Guide

## 1. Setup

```bash
cd NexTwinAI
python -m venv .venv
.venv\Scripts\activate
python setup_project.py
```

Use this faster setup only when dependencies are already installed:

```bash
python setup_project.py --skip-install
```

## 2. Train Models

```bash
python train_all.py
```

This trains all available model families and writes artifacts under `ai_engine/models/`.

## 3. Run Backend

```bash
python run_project.py
```

Backend URL:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/api/v1/docs
```

## 4. Run Tests

```bash
pytest
```

## 5. Verify APIs

```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/machines
curl -X POST http://localhost:8000/api/v1/predict/health -H "Content-Type: application/json" -d "{\"machine_id\":\"M_001\"}"
curl -X POST http://localhost:8000/api/v1/predict/bottleneck -H "Content-Type: application/json" -d "{\"machine_id\":\"M_001\"}"
curl -X POST http://localhost:8000/api/v1/predict/energy -H "Content-Type: application/json" -d "{\"machine_id\":\"M_001\"}"
curl -X POST http://localhost:8000/api/v1/predict/anomaly -H "Content-Type: application/json" -d "{\"machine_id\":\"M_001\"}"
```

## 6. Launch With Docker

```bash
docker compose up --build
```

This starts PostgreSQL and the FastAPI backend on port `8000`.
