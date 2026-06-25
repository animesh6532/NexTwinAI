"""
NexTwin AI — sensors.py
======================
REST API endpoints for managing machine sensors and processing telemetry streams.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.database.models import Sensor, SensorReading, Machine, AnomalyPrediction, HealthPrediction, Alert, FactoryEvent
from app.services.sensor_service import sensor_service
from app.services.db_helpers import ensure_machine
from app.utils.logger import logger
from app.api.websocket import broadcast_live_update

router = APIRouter()

# --- Request / Response Schemas ---

class SensorBase(BaseModel):
    machine_id: str = Field(..., description="Target machine ID")
    name: str = Field(..., description="Sensor tag name, e.g. Vibration Sensor")
    sensor_type: str = Field(..., description="Sensor type: Vibration, Temperature, Pressure, Acoustic, Energy")
    unit: str = Field(..., description="Measurement unit, e.g. mm/s, C, bar")
    threshold_min: Optional[float] = Field(None, description="Minimum acceptable value")
    threshold_max: Optional[float] = Field(None, description="Maximum acceptable value")
    status: str = Field("Active", description="Sensor state: Active, Faulty, Inactive")

class SensorCreate(SensorBase):
    pass

class SensorResponse(SensorBase):
    id: int
    created_at: datetime
    class Config:
        from_attributes = True

class ReadingCreate(BaseModel):
    sensor_id: int = Field(..., description="Target sensor primary key ID")
    value: float = Field(..., description="Observed sensor telemetry measurement")
    timestamp: Optional[datetime] = Field(None, description="Timestamp of telemetry capture (defaults to now)")

class ReadingResponse(BaseModel):
    id: int
    sensor_id: int
    value: float
    timestamp: datetime
    class Config:
        from_attributes = True

class EdgeTelemetryPayload(BaseModel):
    machine_id: str
    telemetry: Dict[str, float]
    local_inference: Dict[str, Any]
    timestamp: float

# --- Helper function for ensuring sensors exist ---
def ensure_machine_sensors(db: Session, machine_id: str):
    ensure_machine(db, machine_id)
    sensor_types = {
        "Vibration": ("Vibration Sensor", "mm/s"),
        "Temperature": ("Thermal Temperature Sensor", "C"),
        "Pressure": ("Hydraulic Pressure Sensor", "bar"),
        "Acoustic": ("Acoustic Noise Level", "dB"),
        "Energy": ("Main Electric Draw", "kW")
    }
    for s_type, (s_name, unit) in sensor_types.items():
        existing = db.query(Sensor).filter(Sensor.machine_id == machine_id, Sensor.sensor_type == s_type).first()
        if not existing:
            new_sensor = Sensor(
                machine_id=machine_id,
                name=s_name,
                sensor_type=s_type,
                unit=unit,
                status="Active"
            )
            db.add(new_sensor)
    db.commit()

# --- Routes ---

@router.get("/sensors", response_model=List[SensorResponse], status_code=status.HTTP_200_OK)
def list_sensors(machine_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Get registered sensors. Optional filtering by machine_id query parameter.
    """
    if machine_id:
        return sensor_service.get_sensors_by_machine(db, machine_id)
    return sensor_service.get_all_sensors(db)

@router.get("/sensors/{sensor_id}", response_model=SensorResponse, status_code=status.HTTP_200_OK)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)):
    """
    Get sensor metadata by ID.
    """
    sensor = sensor_service.get_sensor_by_id(db, sensor_id)
    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor ID {sensor_id} does not exist."
        )
    return sensor

@router.post("/sensors", response_model=SensorResponse, status_code=status.HTTP_201_CREATED)
def create_sensor(payload: SensorCreate, db: Session = Depends(get_db)):
    """
    Register a new physical sensor on a machine.
    """
    try:
        return sensor_service.create_sensor(db, payload.dict())
    except Exception as e:
        logger.error(f"Error creating sensor: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create sensor: {str(e)}"
        )

@router.post("/sensors/readings", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
def record_reading(payload: ReadingCreate, db: Session = Depends(get_db)):
    """
    Log a new sensor measurement data point to database (telemetry streaming).
    """
    sensor = sensor_service.get_sensor_by_id(db, payload.sensor_id)
    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor ID {payload.sensor_id} not found."
        )
    return sensor_service.add_sensor_reading(db, payload.dict())

@router.get("/sensors/{sensor_id}/readings", response_model=List[ReadingResponse], status_code=status.HTTP_200_OK)
def get_readings(
    sensor_id: int, 
    limit: int = Query(100, ge=1, le=1000, description="Limit result records count"),
    db: Session = Depends(get_db)
):
    """
    Fetch historical telemetry data series for a specific sensor.
    """
    sensor = sensor_service.get_sensor_by_id(db, sensor_id)
    if not sensor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sensor ID {sensor_id} not found."
        )
    return sensor_service.get_sensor_readings(db, sensor_id, limit)

@router.post("/edge/telemetry", status_code=status.HTTP_201_CREATED)
def receive_edge_telemetry(payload: EdgeTelemetryPayload, db: Session = Depends(get_db)):
    """
    Process incoming streaming telemetry from the edge device.
    Registers sensors, writes values, saves local predictions, creates alerts, and broadcasts via WS.
    """
    m_id = payload.machine_id
    ensure_machine_sensors(db, m_id)
    
    # Map telemetry to database sensors
    mappings = {
        "vibration_mm_s": "Vibration",
        "temperature_c": "Temperature",
        "pressure_bar": "Pressure",
        "noise_level_db": "Acoustic",
        "energy_draw_kw": "Energy"
    }
    
    saved_readings = []
    for tele_key, s_type in mappings.items():
        if tele_key in payload.telemetry:
            sensor = db.query(Sensor).filter(Sensor.machine_id == m_id, Sensor.sensor_type == s_type).first()
            if sensor:
                reading = SensorReading(
                    sensor_id=sensor.id,
                    timestamp=datetime.fromtimestamp(payload.timestamp),
                    value=payload.telemetry[tele_key]
                )
                db.add(reading)
                saved_readings.append({
                    "sensor_type": s_type,
                    "value": payload.telemetry[tele_key]
                })
                
    # Save Health prediction
    li = payload.local_inference
    health_pred = HealthPrediction(
        machine_id=m_id,
        timestamp=datetime.fromtimestamp(payload.timestamp),
        failure_risk=li["failure_probability"],
        health_score=li["health_score"],
        maintenance_priority=li["maintenance_priority"],
        details={"local_inference": True, "suggested_action": li.get("suggested_action")}
    )
    db.add(health_pred)
    
    # Save Anomaly prediction
    anomaly_pred = AnomalyPrediction(
        machine_id=m_id,
        timestamp=datetime.fromtimestamp(payload.timestamp),
        anomaly_detected=li["anomaly_detected"],
        anomaly_score=li["anomaly_score"],
        method="Edge Local Heuristics",
        severity=li["anomaly_severity"],
        anomaly_type=li["anomaly_type"],
        cause=li.get("cause"),
        confidence_score=li.get("confidence_score", 1.0),
        impact_estimation=li.get("impact_estimation"),
        suggested_action=li.get("suggested_action")
    )
    db.add(anomaly_pred)
    db.commit()

    # Raise alert if anomaly detected
    if li["anomaly_detected"]:
        # Check if identical active alert exists
        existing_alert = db.query(Alert).filter(
            Alert.machine_id == m_id,
            Alert.title == f"Edge Alert: {li['anomaly_type']}",
            Alert.is_resolved == False
        ).first()
        
        if not existing_alert:
            alert = Alert(
                machine_id=m_id,
                title=f"Edge Alert: {li['anomaly_type']}",
                message=f"Local Edge AI flagged anomaly: {li['cause'] or 'Sensor out of bounds'}. {li['suggested_action']}.",
                severity=li["anomaly_severity"],
                is_resolved=False,
                cause=li.get("cause"),
                impact=li.get("impact_estimation"),
                recommendation=li.get("suggested_action"),
                affected_machines=[m_id],
                suggested_actions=[li.get("suggested_action")]
            )
            db.add(alert)
            
            # Log factory event
            event = FactoryEvent(
                event_type="Anomaly",
                severity=li["anomaly_severity"],
                title=f"Anomaly on {m_id}: {li['anomaly_type']}",
                message=f"Local edge anomaly flagged. Severity: {li['anomaly_severity']}. Cause: {li.get('cause')}",
                machine_id=m_id
            )
            db.add(event)
            db.commit()
            
    # Compile twin state update for WebSocket broadcast
    twin_update = {
        "machine_id": m_id,
        "health_score": round(li["health_score"], 2),
        "failure_probability": round(li["failure_probability"], 4),
        "energy_usage": round(payload.telemetry.get("energy_draw_kw", 50.0), 2),
        "anomaly_score": round(li["anomaly_score"], 4),
        "status": li["anomaly_severity"] if li["anomaly_detected"] else "Healthy",
        "timestamp": datetime.fromtimestamp(payload.timestamp).strftime("%Y-%m-%d %H:%M:%S")
    }
    
    broadcast_live_update("telemetry", twin_update)
    return {"status": "success", "processed_readings_count": len(saved_readings)}

@router.post("/edge/telemetry/sync", status_code=status.HTTP_201_CREATED)
def sync_edge_telemetry(payload: List[EdgeTelemetryPayload], db: Session = Depends(get_db)):
    """
    Synchronizes a batch of buffered edge readings collected during offline mode.
    """
    processed = 0
    for single_pay in payload:
        try:
            receive_edge_telemetry(single_pay, db)
            processed += 1
        except Exception as e:
            logger.error(f"Error syncing edge buffered frame: {str(e)}")
            
    return {"status": "synced", "synced_frames_count": processed}
