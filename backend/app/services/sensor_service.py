"""
NexTwin AI — sensor_service.py
==============================
CRUD operations and threshold checking logic for sensors and physical telemetry readings.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.database.models import Sensor, SensorReading
from app.services.machine_service import machine_service
from app.utils.logger import logger

class SensorService:
    # --- Sensor Configurations ---

    def get_all_sensors(self, db: Session) -> List[Sensor]:
        """Retrieve all active sensor channels."""
        return db.query(Sensor).all()

    def get_sensor_by_id(self, db: Session, sensor_id: int) -> Optional[Sensor]:
        """Fetch sensor metadata by primary key ID."""
        return db.query(Sensor).filter(Sensor.id == sensor_id).first()

    def get_sensors_by_machine(self, db: Session, machine_id: str) -> List[Sensor]:
        """Get all sensors configured on a specific machine."""
        return db.query(Sensor).filter(Sensor.machine_id == machine_id).all()

    def create_sensor(self, db: Session, sensor_data: Dict[str, Any]) -> Sensor:
        """Register a new sensor channel."""
        db_sensor = Sensor(**sensor_data)
        db.add(db_sensor)
        db.commit()
        db.refresh(db_sensor)
        logger.info(f"Registered sensor {db_sensor.id}: {db_sensor.name} on machine {db_sensor.machine_id}")
        return db_sensor

    # --- Telemetry Logs & Readings ---

    def add_sensor_reading(self, db: Session, reading_data: Dict[str, Any]) -> SensorReading:
        """
        Log a new telemetry reading. Automatically checks for threshold breaches
        and raises appropriate alerts.
        """
        if not reading_data.get("timestamp"):
            reading_data["timestamp"] = datetime.utcnow()
            
        reading = SensorReading(**reading_data)
        db.add(reading)
        db.commit()
        db.refresh(reading)
        
        # Verify threshold bounds on parent sensor configuration
        sensor = self.get_sensor_by_id(db, reading.sensor_id)
        if sensor:
            val = reading.value
            # Minimum check
            if sensor.threshold_min is not None and val < sensor.threshold_min:
                alert_data = {
                    "machine_id": sensor.machine_id,
                    "title": f"Low {sensor.name} Threshold Breach",
                    "message": f"Sensor {sensor.name} measured {val} {sensor.unit}, which is below the safe minimum of {sensor.threshold_min} {sensor.unit}.",
                    "severity": "Warning"
                }
                machine_service.create_alert(db, alert_data)
                
            # Maximum check
            if sensor.threshold_max is not None and val > sensor.threshold_max:
                alert_data = {
                    "machine_id": sensor.machine_id,
                    "title": f"High {sensor.name} Threshold Breach",
                    "message": f"Sensor {sensor.name} measured {val} {sensor.unit}, which is above the safe limit of {sensor.threshold_max} {sensor.unit}.",
                    "severity": "Critical" if (val > sensor.threshold_max * 1.2) else "Warning"
                }
                machine_service.create_alert(db, alert_data)
                
        return reading

    def get_sensor_readings(self, db: Session, sensor_id: int, limit: int = 100) -> List[SensorReading]:
        """Fetch historical readings for a sensor ordered by timestamp descending."""
        return db.query(SensorReading).filter(
            SensorReading.sensor_id == sensor_id
        ).order_by(
            SensorReading.timestamp.desc()
        ).limit(limit).all()

sensor_service = SensorService()
