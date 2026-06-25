"""
NexTwin AI — models.py
======================
SQLAlchemy declarative models defining the PostgreSQL database schema for the 
NexTwin AI platform.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.database.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="operator")  # administrator, supervisor, operator, engineer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    copilot_logs = relationship("CopilotLog", back_populates="user", cascade="all, delete-orphan")
    resolved_alerts = relationship("Alert", back_populates="resolver", foreign_keys="[Alert.resolved_by]")
    generated_reports = relationship("Report", back_populates="generator", cascade="all, delete-orphan")

class Machine(Base):
    __tablename__ = "machines"

    # String-based ID matching the dataset schema, e.g., 'M_001'
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(10), nullable=False)  # L (Low), M (Medium), H (High)
    operational_status = Column(String(20), default="Active")  # Active, Idle, Maintenance
    location = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sensors = relationship("Sensor", back_populates="machine", cascade="all, delete-orphan")
    health_predictions = relationship("HealthPrediction", back_populates="machine", cascade="all, delete-orphan")
    bottleneck_predictions = relationship("BottleneckPrediction", back_populates="machine", cascade="all, delete-orphan")
    anomaly_predictions = relationship("AnomalyPrediction", back_populates="machine", cascade="all, delete-orphan")
    energy_predictions = relationship("EnergyPrediction", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    name = Column(String(100), nullable=False)
    sensor_type = Column(String(50), nullable=False)  # Vibration, Temperature, Pressure, Acoustic, Energy
    unit = Column(String(20), nullable=False)  # mm/s, C, bar, dB, kW
    threshold_min = Column(Float, nullable=True)
    threshold_max = Column(Float, nullable=True)
    status = Column(String(20), default="Active")  # Active, Faulty, Inactive
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    machine = relationship("Machine", back_populates="sensors")
    readings = relationship("SensorReading", back_populates="sensor", cascade="all, delete-orphan")

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    sensor_id = Column(Integer, ForeignKey("sensors.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    value = Column(Float, nullable=False)

    # Relationships
    sensor = relationship("Sensor", back_populates="readings")

class HealthPrediction(Base):
    __tablename__ = "health_predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    failure_risk = Column(Float, nullable=False)  # probability 0 to 1
    health_score = Column(Float, nullable=False)  # 0 to 100
    maintenance_priority = Column(String(20), nullable=False)  # Low, Medium, High, Critical
    details = Column(JSON, nullable=True)

    # Relationships
    machine = relationship("Machine", back_populates="health_predictions")

class EnergyPrediction(Base):
    __tablename__ = "energy_predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Building features
    relative_compactness = Column(Float, nullable=False)
    surface_area = Column(Float, nullable=False)
    wall_area = Column(Float, nullable=False)
    roof_area = Column(Float, nullable=False)
    overall_height = Column(Float, nullable=False)
    orientation = Column(Float, nullable=False)
    glazing_area = Column(Float, nullable=False)
    glazing_area_distribution = Column(Float, nullable=False)
    
    # Predicted loads
    predicted_heating_load = Column(Float, nullable=False)
    predicted_cooling_load = Column(Float, nullable=False)
    predicted_energy_waste_pct = Column(Float, nullable=False)
    energy_optimization_score = Column(Float, nullable=False)
    
    # Recommendations stored as JSON
    optimization_recommendations = Column(JSON, nullable=True)

    # Relationships
    machine = relationship("Machine", back_populates="energy_predictions")

class BottleneckPrediction(Base):
    __tablename__ = "bottleneck_predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    bottleneck_risk_score = Column(Float, nullable=False)  # severity index
    predicted_production_delay = Column(Float, nullable=False)  # units delayed
    congestion_probability = Column(Float, nullable=False)  # 0 to 1
    congestion_risk_detected = Column(Boolean, default=False)

    # Relationships
    machine = relationship("Machine", back_populates="bottleneck_predictions")

class AnomalyPrediction(Base):
    __tablename__ = "anomaly_predictions"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    anomaly_detected = Column(Boolean, default=False, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    method = Column(String(50), nullable=False)  # Isolation Forest, AutoEncoder, OCSVM
    severity = Column(String(20), default="Info")  # Info, Warning, Critical, Emergency
    anomaly_type = Column(String(50), default="Vibration")
    cause = Column(Text, nullable=True)
    confidence_score = Column(Float, default=1.0)
    impact_estimation = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)

    # Relationships
    machine = relationship("Machine", back_populates="anomaly_predictions")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False)  # Info, Warning, Critical, Emergency
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # New detailed industrial fields
    cause = Column(Text, nullable=True)
    impact = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    affected_machines = Column(JSON, nullable=True)  # JSON List of machine IDs
    suggested_actions = Column(JSON, nullable=True)  # JSON List of recommended action items

    # Relationships
    machine = relationship("Machine", back_populates="alerts")
    resolver = relationship("User", back_populates="resolved_alerts", foreign_keys=[resolved_by])

class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id = Column(Integer, primary_key=True, index=True)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=False)
    action_taken = Column(Text, nullable=False)
    cost = Column(Float, default=0.0)
    downtime_minutes = Column(Float, default=0.0)
    scheduled_date = Column(DateTime, default=datetime.utcnow)
    completed_date = Column(DateTime, nullable=True)
    status = Column(String(20), default="Scheduled")  # Scheduled, In Progress, Completed, Deferred
    details = Column(JSON, nullable=True)

class FactoryEvent(Base):
    __tablename__ = "factory_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(50), nullable=False)  # Failure, Anomaly, Energy Peak, Maintenance, Simulation
    severity = Column(String(20), default="Info")  # Info, Warning, Critical, Emergency
    title = Column(String(100), nullable=False)
    message = Column(Text, nullable=False)
    machine_id = Column(String(50), ForeignKey("machines.id"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    details = Column(JSON, nullable=True)

class CopilotConversation(Base):
    __tablename__ = "copilot_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    title = Column(String(150), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    logs = relationship("CopilotLog", back_populates="conversation", cascade="all, delete-orphan")

class Simulation(Base):
    __tablename__ = "simulations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    parameters = Column(JSON, nullable=False)
    results = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    run_by = Column(Integer, ForeignKey("users.id"), nullable=True)

class CopilotLog(Base):
    __tablename__ = "copilot_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    conversation_id = Column(Integer, ForeignKey("copilot_conversations.id"), nullable=True)
    prompt = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    sources = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="copilot_logs")
    conversation = relationship("CopilotConversation", back_populates="logs")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    report_type = Column(String(50), nullable=False)  # OEE, Energy, Bottleneck, Maintenance
    parameters = Column(JSON, nullable=True)
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    generated_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Relationships
    generator = relationship("User", back_populates="generated_reports")

