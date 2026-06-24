"""
NexTwin AI — ai-copilot/tools.py
================================
LangChain tool definitions enabling the LLM Agent to query database states 
and check real-time telemetry.

Author: Principal AI Architect & Senior LLM Architect
"""

from sqlalchemy.orm import Session
try:
    from langchain.tools import tool
except ImportError:
    # Stand-in dummy decorator if langchain is not present
    def tool(func):
        return func

from app.database.models import Machine, Alert, Sensor, SensorReading, HealthPrediction

@tool
def get_machines_list(db_session: Session) -> str:
    """Queries and returns the current operational status, type, and location of all factory machines."""
    try:
        machines = db_session.query(Machine).all()
        if not machines:
            return "No machines registered in the database."
        lines = []
        for m in machines:
            lines.append(f"- **Machine {m.id}** ({m.name}): Status={m.operational_status}, Type={m.type}, Location={m.location}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error querying machines: {str(e)}"

@tool
def get_active_alerts(db_session: Session) -> str:
    """Queries and returns all active unresolved alerts on the factory floor, including severity and error messages."""
    try:
        alerts = db_session.query(Alert).filter(Alert.is_resolved == False).all()
        if not alerts:
            return "All systems normal. No active unresolved alerts."
        lines = []
        for a in alerts:
            lines.append(f"- **[{a.severity}]** {a.title} on {a.machine_id}: {a.message} (Raised at: {a.created_at})")
        return "\n".join(lines)
    except Exception as e:
        return f"Error querying alerts: {str(e)}"

@tool
def get_machine_telemetry(db_session: Session, machine_id: str) -> str:
    """Queries and returns the latest sensor readings (e.g. vibration, temperature, pressure) for a specific machine ID."""
    try:
        sensors = db_session.query(Sensor).filter(Sensor.machine_id == machine_id).all()
        if not sensors:
            return f"No sensors configured for machine '{machine_id}'."
        lines = []
        for s in sensors:
            last_reading = db_session.query(SensorReading).filter(
                SensorReading.sensor_id == s.id
            ).order_by(SensorReading.timestamp.desc()).first()
            
            val_str = f"{last_reading.value} {s.unit}" if last_reading else "N/A"
            lines.append(f"- **{s.name}** ({s.sensor_type}): {val_str} | Thresholds: [{s.threshold_min or 0.0} - {s.threshold_max or 0.0}]")
        return f"Telemetry for {machine_id}:\n" + "\n".join(lines)
    except Exception as e:
        return f"Error querying telemetry: {str(e)}"

@tool
def check_maintenance_risk(db_session: Session, machine_id: str) -> str:
    """Fetches the latest ML predictive maintenance failure probability and priority for a specific machine ID."""
    try:
        last_pred = db_session.query(HealthPrediction).filter(
            HealthPrediction.machine_id == machine_id
        ).order_by(HealthPrediction.timestamp.desc()).first()
        
        if not last_pred:
            return f"No health predictions logged for machine '{machine_id}'."
            
        return (
            f"Predictive Maintenance Status for {machine_id}:\n"
            f"- **Failure Probability**: {last_pred.failure_risk:.2%}\n"
            f"- **Health Index Score**:  {last_pred.health_score:.1f}/100\n"
            f"- **Priority Status**:     {last_pred.maintenance_priority}\n"
            f"- **Inference Timestamp**:  {last_pred.timestamp}"
        )
    except Exception as e:
        return f"Error checking risk: {str(e)}"
