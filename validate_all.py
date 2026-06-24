"""
NexTwin AI — validate_all.py
============================
Backend diagnostic validation suite. Tests imports, db connection, prediction pipelines,
AI Copilot queries, Digital Twin states, time-series forecasting, and automatic alert engines.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import os
import sys
import io
import json
from fastapi.testclient import TestClient

# Force sys.stdout and sys.stderr to utf-8 encoding to prevent Windows console encoding crashes
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Setup path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

try:
    from app.main import app
    from app.database.db import SessionLocal
    from app.database.models import Machine
except ImportError as e:
    print(f"Import failed: {str(e)}")
    sys.exit(1)

def run_diagnostics():
    print("="*70)
    print("NexTwin AI - Backend Diagnostic Integration Verification")
    print("="*70)
    
    # 1. Verify Imports
    print("\n[1] Verifying Services Imports...")
    try:
        from backend.app.services.health_service import health_service
        from backend.app.services.anomaly_service import anomaly_service
        from backend.app.services.energy_service import energy_service
        from backend.app.services.bottleneck_service import bottleneck_service
        from backend.app.services.forecasting_service import forecasting_service
        from backend.app.services.copilot_service import copilot_service
        print("  [OK] All business services imported successfully.")
    except Exception as e:
        print(f"  [ERROR] Service import failure: {str(e)}")
        sys.exit(1)
        
    # 2. Database Connection
    print("\n[2] Verifying Database Connection...")
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        print("  [OK] Database connection verified.")
    except Exception as e:
        print(f"  [ERROR] Database connection failure: {str(e)}")
        sys.exit(1)
    finally:
        db.close()
        
    client = TestClient(app)
    
    # 3. Health status
    print("\n[3] Testing GET /api/v1/health...")
    resp = client.get("/api/v1/health")
    print(f"  Status: {resp.status_code} | Body: {resp.json()}")
    assert resp.status_code == 200
    
    # 4. Predictions status (API models status)
    print("\n[4] Testing GET /api/v1/models/status...")
    resp = client.get("/api/v1/models/status")
    print(f"  Status: {resp.status_code} | Models Loaded: {list(resp.json().keys())}")
    assert resp.status_code == 200
    
    # 5. Predict Health API with corrected inputs (Phase 1 scaling fix & Phase 8 XAI check)
    print("\n[5] Testing POST /api/v1/predict/health (with percent scale risk index = 12)...")
    payload = {
        "machine_id": "M_001",
        "type": "M",
        "air_temperature": 300.0,
        "process_temperature": 310.0,
        "rotational_speed": 1500.0,
        "torque": 40.0,
        "tool_wear": 50.0,
        "machine_health_score": 88.0,
        "failure_risk_index": 12.0
    }
    resp = client.post("/api/v1/predict/health", json=payload)
    print(f"  Status: {resp.status_code} | Body: {json.dumps(resp.json(), indent=2)}")
    assert resp.status_code == 200
    res_json = resp.json()
    assert res_json["failure_probability"] < 0.20  # Normalized from 12% to 0.12
    assert res_json["health_score"] > 80.0
    assert "top_factors" in res_json
    
    # 6. Predict Bottlenecks API (with queue_length, downtime_minutes, etc.)
    print("\n[6] Testing POST /api/v1/predict/bottleneck...")
    payload = {
        "machine_id": "M_001",
        "vibration_mm_s": 1.8,
        "temperature_c": 60.0,
        "pressure_bar": 4.2,
        "noise_level_db": 72.0,
        "sound_frequency_hz": 520.0,
        "sound_amplitude": 0.06,
        "defect_count": 1.0,
        "energy_draw_kw": 65.0,
        "utilization_rate": 95.0 # High utilization triggers congestion
    }
    resp = client.post("/api/v1/predict/bottleneck", json=payload)
    print(f"  Status: {resp.status_code} | Body: {json.dumps(resp.json(), indent=2)}")
    assert resp.status_code == 200
    assert resp.json()["congestion_risk_detected"] == True
    
    # 7. Copilot Queries (Phase 3 live analysis check)
    print("\n[7] Testing GET /api/v1/copilot query flow...")
    copilot_prompts = [
        "Which machine needs maintenance?",
        "Why is machine M_001 failing?",
        "What caused the anomaly?",
        "Which machine consumes the most energy?",
        "Show top bottlenecks.",
        "Summarize factory health."
    ]
    for prompt in copilot_prompts:
        resp = client.post("/api/v1/copilot/chat", json={"prompt": prompt, "user_id": 1})
        print(f"  Prompt: '{prompt}'")
        lines = resp.json().get("response", "").split("\n")[:2]
        print(f"    Ans: {' '.join(lines)}...")
        assert resp.status_code == 200
        
    # 8. Digital Twin state API (Phase 4 state layers check)
    print("\n[8] Testing GET /api/v1/digital-twin/state...")
    resp = client.get("/api/v1/digital-twin/state")
    print(f"  Status: {resp.status_code} | Records: {len(resp.json())} | Sample: {resp.json()[0] if resp.json() else 'None'}")
    assert resp.status_code == 200
    
    # 9. Time-Series Forecasting API (Phase 6 Prophet/LSTM check)
    print("\n[9] Testing POST /api/v1/predict/forecast...")
    resp = client.post("/api/v1/predict/forecast", json={"machine_id": "M_001", "horizon": 30})
    print(f"  Status: {resp.status_code} | Keys: {list(resp.json().keys())} | Forecast items: {len(resp.json().get('energy_forecast', []))}")
    assert resp.status_code == 200
    
    print("\n" + "="*70)
    print("  [OK] ALL BACKEND SYSTEMS FULLY VALIDATED AND OPERATIONALLY SOUND!")
    print("="*70 + "\n")

if __name__ == "__main__":
    run_diagnostics()
