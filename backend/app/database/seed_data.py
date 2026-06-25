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
from app.database import models
from app.database.models import (
    User, Machine, Sensor, SensorReading, Alert, 
    MaintenanceLog, FactoryEvent, CopilotConversation, CopilotLog
)

def hash_password(password: str) -> str:
    """Helper to hash passwords securely using hashlib (standard library)"""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def seed_database():
    print("Dropping existing database tables (Base.metadata.drop_all)...")
    Base.metadata.drop_all(bind=engine)
    print("Recreating database schema (Base.metadata.create_all)...")
    Base.metadata.create_all(bind=engine)
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

        # 5. Seed Alerts with detailed industrial diagnostics
        if db.query(Alert).count() == 0:
            print("  Seeding default industrial alerts...")
            alerts = [
                Alert(
                    machine_id="M_003",
                    title="Critical Thermal Overheat",
                    message="Welder temperature sensor breached threshold (92.4 C vs max 90.0 C). Machine forced into Maintenance.",
                    severity="Critical",
                    is_resolved=False,
                    cause="Inadequate coolant circulation and extreme work cycle load",
                    impact="Potential thermal welding head warping and weld seam deformation",
                    recommendation="Perform immediate heat exchanger fluid flush and cycle pause",
                    affected_machines=["M_003"],
                    suggested_actions=["Flush heat exchanger", "Check coolant pump pressure", "Calibrate thermal sensor"]
                ),
                Alert(
                    machine_id="M_001",
                    title="Acoustic Anomaly Flagged",
                    message="Unsupervised Isolation Forest engine detected structural rattle noises (anomaly score: 0.88). Inspection suggested.",
                    severity="Warning",
                    is_resolved=False,
                    cause="Spindle bearing lubrication degradation",
                    impact="Accelerated component wear leading to structural rattle vibration",
                    recommendation="Schedule bearing lubrication replenishment within next 24 operating hours",
                    affected_machines=["M_001"],
                    suggested_actions=["Apply high-speed spindle grease", "Run sound vibration check", "Inspect bearing seals"]
                )
            ]
            db.add_all(alerts)
            db.commit()
            print("  Alerts seeded successfully.")

        # 6. Seed Maintenance Logs
        if db.query(MaintenanceLog).count() == 0:
            print("  Seeding maintenance logs...")
            logs = [
                MaintenanceLog(
                    machine_id="M_001",
                    action_taken="Scheduled Spindle Alignment and Belt Re-tensioning",
                    cost=450.0,
                    downtime_minutes=90.0,
                    scheduled_date=datetime.utcnow() + timedelta(days=2),
                    status="Scheduled"
                ),
                MaintenanceLog(
                    machine_id="M_002",
                    action_taken="Hydraulic Seal Replacement and Fluid Top-up",
                    cost=1200.0,
                    downtime_minutes=180.0,
                    scheduled_date=datetime.utcnow() - timedelta(days=5),
                    completed_date=datetime.utcnow() - timedelta(days=5),
                    status="Completed",
                    details={"fluid_brand": "Mobil DTE 25", "seals_replaced": 2}
                )
            ]
            db.add_all(logs)
            db.commit()
            print("  Maintenance logs seeded successfully.")

        # 7. Seed Factory Events
        if db.query(FactoryEvent).count() == 0:
            print("  Seeding factory events...")
            events = [
                FactoryEvent(
                    event_type="Maintenance",
                    severity="Info",
                    title="Hydraulic Press Preventive Maintenance Completed",
                    message="Scheduled fluid change and seal check completed. Machine returned to nominal operations.",
                    machine_id="M_002"
                ),
                FactoryEvent(
                    event_type="Failure",
                    severity="Emergency",
                    title="Robotic Welder Thermal Safety Shutdown",
                    message="Overtemp trigger activated thermal shutdown sequence. Operator alerted.",
                    machine_id="M_003"
                )
            ]
            db.add_all(events)
            db.commit()
            print("  Factory events seeded successfully.")

        # 8. Seed Copilot Conversations
        if db.query(CopilotConversation).count() == 0:
            print("  Seeding default copilot conversation...")
            conv = CopilotConversation(
                user_id=1,
                title="CNC Spindle Wear Diagnostic Session"
            )
            db.add(conv)
            db.commit()
            
            # Add a log entry for it
            log = CopilotLog(
                user_id=1,
                conversation_id=conv.id,
                prompt="Show CNC Mill machine health diagnostics.",
                response="Machine M_001 (CNC Mill) is currently operating at 88.0% health. Spindle lubrication levels are deteriorating slightly, causing minor vibration anomaly warning scores. Recommendations: schedule bearing greasing.",
                sources=[{"type": "database_tool", "tool": "get_machine_telemetry_M_001"}]
            )
            db.add(log)
            db.commit()
            print("  Copilot conversations seeded successfully.")

        print("Database seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
