from fastapi.testclient import TestClient

from app.database.db import Base, engine
from app.main import app


client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] in {"online", "degraded"}


def test_machine_crud():
    payload = {
        "id": "M_TEST",
        "name": "Test Machine",
        "type": "M",
        "operational_status": "Active",
        "location": "Test Bay",
    }
    create = client.post("/api/v1/machines", json=payload)
    assert create.status_code in {201, 400}

    read = client.get("/api/v1/machines/M_TEST")
    assert read.status_code == 200
    assert read.json()["id"] == "M_TEST"


def test_prediction_fallbacks_are_available():
    health = client.post("/api/v1/predict/health", json={"machine_id": "M_API"})
    assert health.status_code == 200
    assert "failure_probability" in health.json()

    bottleneck = client.post("/api/v1/predict/bottleneck", json={"machine_id": "M_API"})
    assert bottleneck.status_code == 200
    assert "bottleneck_risk_score" in bottleneck.json()

    energy = client.post("/api/v1/predict/energy", json={"machine_id": "M_API"})
    assert energy.status_code == 200
    assert "energy_optimization_score" in energy.json()

    anomaly = client.post("/api/v1/predict/anomaly", json={"machine_id": "M_API"})
    assert anomaly.status_code == 200
    assert "anomaly_detected" in anomaly.json()
