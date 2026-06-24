"""
NexTwin AI — digital-twin/state/state_manager.py
================================================
State layer consolidating machine telemetry, health score, failure risk, 
energy consumption, and anomaly detection logs into a unified twin state.

Author: Principal AI Architect & Digital Twin Systems Engineer
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field

# API schema representing the consolidated twin state
class DigitalTwinState(BaseModel):
    machine_id: str = Field(..., description="String identifier matching machine ID")
    health_score: float = Field(..., description="Calculated machine health index (0-100)")
    failure_probability: float = Field(..., description="Likelihood of failure (0-1)")
    energy_usage: float = Field(..., description="Current power draw of machine in kW")
    anomaly_score: float = Field(..., description="Unsupervised sensor anomaly score")
    status: str = Field(..., description="Operational status: Healthy, Warning, Critical, Maintenance")

class DigitalTwinStateManager:
    @staticmethod
    def get_machine_state(db: Session, machine_id: str) -> Optional[DigitalTwinState]:
        """Queries and consolidates all state channels for a single machine"""
        from app.database.models import Machine, HealthPrediction, AnomalyPrediction, EnergyPrediction, Sensor, SensorReading
        
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            return None
            
        # 1. Health parameters
        last_health = db.query(HealthPrediction).filter(
            HealthPrediction.machine_id == machine_id
        ).order_by(HealthPrediction.timestamp.desc()).first()
        
        health_score = last_health.health_score if last_health else 100.0
        failure_prob = last_health.failure_risk if last_health else 0.0
        
        # 2. Energy usage
        energy_sensor = db.query(Sensor).filter(
            Sensor.machine_id == machine_id, 
            Sensor.sensor_type == 'Energy'
        ).first()
        
        energy_usage = 50.0
        if energy_sensor:
            last_reading = db.query(SensorReading).filter(
                SensorReading.sensor_id == energy_sensor.id
            ).order_by(SensorReading.timestamp.desc()).first()
            if last_reading:
                energy_usage = last_reading.value
        else:
            # Fallback to latest energy prediction or default
            last_ep = db.query(EnergyPrediction).filter(
                EnergyPrediction.machine_id == machine_id
            ).order_by(EnergyPrediction.timestamp.desc()).first()
            if last_ep:
                energy_usage = last_ep.predicted_heating_load + last_ep.predicted_cooling_load
                
        # 3. Anomaly parameters
        last_anomaly = db.query(AnomalyPrediction).filter(
            AnomalyPrediction.machine_id == machine_id
        ).order_by(AnomalyPrediction.timestamp.desc()).first()
        anomaly_score = last_anomaly.anomaly_score if last_anomaly else 0.0
        anomaly_detected = last_anomaly.anomaly_detected if last_anomaly else False
        
        # 4. Consolidate Status logic
        status = "Healthy"
        if machine.operational_status == "Maintenance":
            status = "Maintenance"
        elif failure_prob > 0.8:
            status = "Critical"
        elif failure_prob > 0.5 or anomaly_detected:
            status = "Warning"
            
        return DigitalTwinState(
            machine_id=machine_id,
            health_score=round(health_score, 2),
            failure_probability=round(failure_prob, 4),
            energy_usage=round(energy_usage, 2),
            anomaly_score=round(anomaly_score, 4),
            status=status
        )

    @classmethod
    def get_all_states(cls, db: Session) -> List[DigitalTwinState]:
        """Retrieves consolidated twin state layer for all registered machine assets"""
        from app.database.models import Machine
        machines = db.query(Machine).all()
        states = []
        for m in machines:
            state = cls.get_machine_state(db, m.id)
            if state:
                states.append(state)
        return states
