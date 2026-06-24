"""
NexTwin AI — sensors.py
======================
REST API endpoints for managing machine sensors and processing telemetry streams.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.sensor_service import sensor_service
from app.utils.logger import logger

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
