"""
NexTwin AI — machine_service.py
===============================
Database operations and CRUD business logic for factory machines and industrial alerts.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.database.models import Machine, Alert, Sensor
from app.utils.logger import logger

class MachineService:
    # --- Machine CRUD Operations ---

    def get_all_machines(self, db: Session) -> List[Machine]:
        """Fetch all physical machine assets registered in the system."""
        return db.query(Machine).all()

    def get_machine_by_id(self, db: Session, machine_id: str) -> Optional[Machine]:
        """Fetch a specific machine by its string identifier."""
        return db.query(Machine).filter(Machine.id == machine_id).first()

    def create_machine(self, db: Session, machine_data: Dict[str, Any]) -> Machine:
        """Register a new physical machine in the digital twin."""
        db_machine = Machine(**machine_data)
        db.add(db_machine)
        db.commit()
        db.refresh(db_machine)
        logger.info(f"Registered new machine asset: {db_machine.id} ({db_machine.name})")
        return db_machine

    def update_machine(self, db: Session, machine_id: str, machine_data: Dict[str, Any]) -> Optional[Machine]:
        """Update machine parameters or status."""
        db_machine = self.get_machine_by_id(db, machine_id)
        if not db_machine:
            return None
        for key, value in machine_data.items():
            setattr(db_machine, key, value)
        db.commit()
        db.refresh(db_machine)
        logger.info(f"Updated machine asset: {machine_id}")
        return db_machine

    def delete_machine(self, db: Session, machine_id: str) -> bool:
        """Unregister machine and cascade delete nested sensors or predictions."""
        db_machine = self.get_machine_by_id(db, machine_id)
        if not db_machine:
            return False
        db.delete(db_machine)
        db.commit()
        logger.info(f"Deleted machine asset: {machine_id}")
        return True

    # --- Alerts Operations ---

    def get_alerts(
        self, 
        db: Session, 
        machine_id: Optional[str] = None, 
        is_resolved: Optional[bool] = None, 
        severity: Optional[str] = None, 
        limit: int = 50
    ) -> List[Alert]:
        """Fetch system alerts with optional filtering."""
        query = db.query(Alert)
        if machine_id:
            query = query.filter(Alert.machine_id == machine_id)
        if is_resolved is not None:
            query = query.filter(Alert.is_resolved == is_resolved)
        if severity:
            query = query.filter(Alert.severity == severity)
        return query.order_by(Alert.created_at.desc()).limit(limit).all()

    def create_alert(self, db: Session, alert_data: Dict[str, Any]) -> Alert:
        """Record and dispatch an active operational alert. Auto-populates smart diagnostics if missing."""
        data = alert_data.copy()
        title = data.get("title", "").lower()
        msg = data.get("message", "").lower()
        m_id = data.get("machine_id", "M_001")
        
        # Smart Alert Engine: Auto-generate metadata if not supplied
        if "cause" not in data or not data["cause"]:
            if "thermal" in title or "temperature" in title or "overheat" in title or "hot" in msg:
                data["cause"] = "Insufficient coolant circulation, thermal friction in spindle spindle bearing, or extreme ambient temperature."
                data["impact"] = "Potential thermal head warping, weld seam degradation, and safety trip of drive motors."
                data["recommendation"] = "Perform immediate heat exchanger fluid flush and decrease work cycle speeds."
                data["suggested_actions"] = ["Flush heat exchanger", "Check coolant pump pressure", "Decelerate drive RPM"]
            elif "vibration" in title or "rattle" in title or "acoustic" in title or "noise" in msg:
                data["cause"] = "Degradation of spindle bearing lubrication, loose belt pulleys, or component structural misalignment."
                data["impact"] = "Accelerated mechanical fatigue, rattle distortion, defect rate spikes, and conveyor line slip."
                data["recommendation"] = "Schedule spindle alignment correction and belt re-tensioning, apply high-speed grease."
                data["suggested_actions"] = ["Lubricate spindle bearings", "Tighten belt pulley bolts", "Run acoustic signature check"]
            elif "pressure" in title or "hydraulic" in title or "leak" in msg:
                data["cause"] = "Hydraulic valve seal wear, low fluid levels, or air lock in main hydraulic lines."
                data["impact"] = "Severe mechanical stroke latency, downstream starvation, and high pressure safety valve release."
                data["recommendation"] = "Change valve seals immediately, purge air locks, and top-up fluids."
                data["suggested_actions"] = ["Replace valve seals", "Check fluid levels", "Bleed hydraulic lines"]
            elif "energy" in title or "waste" in title or "power" in title:
                data["cause"] = "Simultaneous peak operations, structural thermal envelope insulation loss, or sub-optimal idle draw."
                data["impact"] = "Peak power demand tariff surcharges and thermal motor cooling loads overloading local grid."
                data["recommendation"] = "Stagger machine startup schedules and optimize conveyor standby cycles."
                data["suggested_actions"] = ["Stagger machine startups", "Optimize conveyor standby", "Review insulation layout"]
            else:
                data["cause"] = "Asset sensor metric deviation from nominal operating baseline distributions."
                data["impact"] = "Minor reduction in stage OEE efficiency and potential component stress."
                data["recommendation"] = "Schedule supervisor walkthrough inspection and log sensor feed values."
                data["suggested_actions"] = ["Perform walkthrough inspection", "Log sensor calibration data"]
                
        if "affected_machines" not in data or not data["affected_machines"]:
            # Default to the machine itself and downstream dependencies
            from app.services.relationship_engine import relationship_engine
            deps = relationship_engine.get_dependencies(m_id)
            data["affected_machines"] = [m_id] + deps.get("downstream", [])

        db_alert = Alert(**data)
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        logger.warning(f"Raised Smart Alert [{db_alert.severity}]: {db_alert.title} on machine {db_alert.machine_id}")
        
        # If alert is critical/emergency, update corresponding machine status to 'Maintenance'
        severity_norm = db_alert.severity.lower()
        if severity_norm in ["critical", "emergency"]:
            machine = self.get_machine_by_id(db, db_alert.machine_id)
            if machine and machine.operational_status != "Maintenance":
                machine.operational_status = "Maintenance"
                db.commit()
                
                # Log a factory event for this safety state change
                from app.database.models import FactoryEvent
                event = FactoryEvent(
                    event_type="Failure" if severity_norm == "emergency" else "Maintenance",
                    severity=db_alert.severity,
                    title=f"Machine {m_id} Forced Offline",
                    message=f"Machine operational status set to Maintenance due to {db_alert.severity} alert: {db_alert.title}.",
                    machine_id=m_id
                )
                db.add(event)
                db.commit()
                logger.info(f"Machine {machine.id} status auto-set to Maintenance due to critical/emergency alert.")
                
        return db_alert

    def resolve_alert(self, db: Session, alert_id: int, resolved_by: int) -> Optional[Alert]:
        """Acknowledge and resolve an active alert."""
        db_alert = db.query(Alert).filter(Alert.id == alert_id).first()
        if not db_alert:
            return None
        db_alert.is_resolved = True
        db_alert.resolved_at = datetime.utcnow()
        db_alert.resolved_by = resolved_by
        db.commit()
        db.refresh(db_alert)
        logger.info(f"Resolved Alert ID {alert_id} by User ID {resolved_by}")
        return db_alert

machine_service = MachineService()
