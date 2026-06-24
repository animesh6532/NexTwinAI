"""
NexTwin AI — seed_data.py
=========================
Database seeding script. Populates initial machines, sensors, sample metrics, 
alerts, and default administration users.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import sys
import os
import hashlib
from datetime import datetime, timedelta
import random

# Adjust python path to import app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from app.database.db import SessionLocal, Base, engine
from app.database.models import User, Machine, Sensor, SensorReading, Alert

def hash_password(password: str) -> str:
    """Helper to hash passwords securely using hashlib (standard library)"""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    db = SessionLocal()
    try:
        print("Checking/seeding NexTwin AI database tables...")

        # 1. Seed Users
        if db.query(User).count() == 0:
            print("  Seeding default users...")
            admin_user = User(
                username="admin",
                email="admin@nextwin.ai",
                hashed_password=hash_password("admin123"),
                role="administrator"
            )
            operator_user = User(
                username="operator",
                email="operator@nextwin.ai",
                hashed_password=hash_password("operator123"),
                role="operator"
            )
            db.add_all([admin_user, operator_user])
            db.commit()
            print("  Users seeded successfully.")

        # 2. Seed Machines
        if db.query(Machine).count() == 0:
            print("  Seeding factory machines...")
            machines = [
                Machine(id="M_001", name="CNC Mill Machine 01", type="M", operational_status="Active", location="Section A - Assembly Line"),
                Machine(id="M_002", name="Hydraulic Press Machine 02", type="H", operational_status="Idle", location="Section B - Metal Fabrication"),
                Machine(id="M_003", name="Robotic Welder Machine 03", type="L", operational_status="Maintenance", location="Section A - Welding Cell")
            ]
            db.add_all(machines)
            db.commit()
            print("  Machines seeded successfully.")

        # 3. Seed Sensors
        if db.query(Sensor).count() == 0:
            print("  Seeding machine sensors...")
            sensor_definitions = [
                # M_001 Sensors
                {"machine_id": "M_001", "name": "Vibration Sensor", "sensor_type": "Vibration", "unit": "mm/s", "min": 0.0, "max": 5.0},
                {"machine_id": "M_001", "name": "Thermal Temperature Sensor", "sensor_type": "Temperature", "unit": "C", "min": 20.0, "max": 90.0},
                {"machine_id": "M_001", "name": "Hydraulic Pressure Sensor", "sensor_type": "Pressure", "unit": "bar", "min": 0.0, "max": 8.0},
                {"machine_id": "M_001", "name": "Acoustic Noise Level", "sensor_type": "Acoustic", "unit": "dB", "min": 40.0, "max": 100.0},
                {"machine_id": "M_001", "name": "Main Electric Draw", "sensor_type": "Energy", "unit": "kW", "min": 0.0, "max": 150.0},
                # M_002 Sensors
                {"machine_id": "M_002", "name": "Vibration Sensor", "sensor_type": "Vibration", "unit": "mm/s", "min": 0.0, "max": 5.0},
                {"machine_id": "M_002", "name": "Thermal Temperature Sensor", "sensor_type": "Temperature", "unit": "C", "min": 20.0, "max": 90.0},
                {"machine_id": "M_002", "name": "Hydraulic Pressure Sensor", "sensor_type": "Pressure", "unit": "bar", "min": 0.0, "max": 8.0},
                # M_003 Sensors
                {"machine_id": "M_003", "name": "Vibration Sensor", "sensor_type": "Vibration", "unit": "mm/s", "min": 0.0, "max": 5.0},
                {"machine_id": "M_003", "name": "Thermal Temperature Sensor", "sensor_type": "Temperature", "unit": "C", "min": 20.0, "max": 90.0},
            ]
            for s_def in sensor_definitions:
                sensor = Sensor(
                    machine_id=s_def["machine_id"],
                    name=s_def["name"],
                    sensor_type=s_def["sensor_type"],
                    unit=s_def["unit"],
                    threshold_min=s_def["min"],
                    threshold_max=s_def["max"],
                    status="Active"
                )
                db.add(sensor)
            db.commit()
            print("  Sensors seeded successfully.")

        # 4. Seed Sensor Readings
        if db.query(SensorReading).count() == 0:
            print("  Generating historical sensor readings...")
            sensors = db.query(Sensor).all()
            base_time = datetime.utcnow()
            readings = []
            
            for sensor in sensors:
                # Add 24 points (1 per hour)
                for hour in range(24):
                    timestamp = base_time - timedelta(hours=hour)
                    val = 0.0
                    if sensor.sensor_type == "Vibration":
                        val = random.uniform(1.2, 2.5)
                    elif sensor.sensor_type == "Temperature":
                        val = random.uniform(50.0, 75.0)
                    elif sensor.sensor_type == "Pressure":
                        val = random.uniform(3.8, 5.0)
                    elif sensor.sensor_type == "Acoustic":
                        val = random.uniform(68.0, 85.0)
                    elif sensor.sensor_type == "Energy":
                        val = random.uniform(20.0, 110.0)
                    
                    readings.append(SensorReading(
                        sensor_id=sensor.id,
                        timestamp=timestamp,
                        value=round(val, 2)
                    ))
            db.add_all(readings)
            db.commit()
            print(f"  Generated {len(readings)} historical sensor data points.")

        # 5. Seed Alerts
        if db.query(Alert).count() == 0:
            print("  Seeding default industrial alerts...")
            alerts = [
                Alert(
                    machine_id="M_003",
                    title="Critical Thermal Overheat",
                    message="Welder temperature sensor breached threshold (92.4 C vs max 90.0 C). Machine forced into Maintenance.",
                    severity="Critical",
                    is_resolved=False
                ),
                Alert(
                    machine_id="M_001",
                    title="Acoustic Anomaly Flagged",
                    message="Unsupervised Isolation Forest engine detected structural rattle noises (anomaly score: 0.88). Inspection suggested.",
                    severity="Warning",
                    is_resolved=False
                )
            ]
            db.add_all(alerts)
            db.commit()
            print("  Alerts seeded successfully.")

        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
