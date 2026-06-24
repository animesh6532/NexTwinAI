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
        """Record and dispatch an active operational alert."""
        db_alert = Alert(**alert_data)
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        logger.warning(f"Raised Alert [{db_alert.severity}]: {db_alert.title} on machine {db_alert.machine_id}")
        
        # If alert is critical, update the corresponding machine status to 'Maintenance'
        if db_alert.severity.lower() == "critical":
            machine = self.get_machine_by_id(db, db_alert.machine_id)
            if machine and machine.operational_status != "Maintenance":
                machine.operational_status = "Maintenance"
                db.commit()
                logger.info(f"Machine {machine.id} status auto-set to Maintenance due to critical alert.")
                
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
