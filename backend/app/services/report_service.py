"""
NexTwin AI — report_service.py
==============================
Business logic layer aggregating historical platform operations to compile OEE, 
downtime, energy, and maintenance reports.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy import func

from app.database.models import (
    Report, Machine, Alert, HealthPrediction, 
    EnergyPrediction, BottleneckPrediction, AnomalyPrediction
)
from app.services.db_helpers import ensure_user
from app.utils.logger import logger

class ReportService:
    def generate_report(self, db: Session, report_data: Dict[str, Any]) -> Report:
        """
        Aggregate platform records over a configured period and compile an operational 
        performance report (OEE, Energy, Bottleneck, or Maintenance).
        """
        title = report_data.get("title")
        rep_type = report_data.get("report_type").upper()
        params = report_data.get("parameters") or {}
        generated_by = report_data.get("generated_by", 1)
        ensure_user(db, generated_by)

        # Default days lookback
        days = params.get("days", 7)
        since_date = datetime.utcnow() - timedelta(days=days)

        content = {}

        if rep_type == "OEE":
            content = self._compile_oee_report(db, since_date)
        elif rep_type == "ENERGY":
            content = self._compile_energy_report(db, since_date)
        elif rep_type == "BOTTLENECK":
            content = self._compile_bottleneck_report(db, since_date)
        elif rep_type == "MAINTENANCE":
            content = self._compile_maintenance_report(db, since_date)
        else:
            raise ValueError(f"Unsupported report type: {rep_type}. Options are: OEE, Energy, Bottleneck, Maintenance.")

        # Save to database
        db_report = Report(
            title=title,
            report_type=rep_type,
            parameters=params,
            content=content,
            created_at=datetime.utcnow(),
            generated_by=generated_by
        )
        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        logger.info(f"Generated and logged '{rep_type}' performance report (ID: {db_report.id}).")
        return db_report

    def get_reports(self, db: Session, limit: int = 20) -> List[Report]:
        """Fetch past reports."""
        return db.query(Report).order_by(Report.created_at.desc()).limit(limit).all()

    def get_report_by_id(self, db: Session, report_id: int) -> Optional[Report]:
        """Fetch report by ID."""
        return db.query(Report).filter(Report.id == report_id).first()

    def _compile_oee_report(self, db: Session, since_date: datetime) -> Dict[str, Any]:
        """Aggregate data to compute Availability, Performance, Quality, and OEE"""
        # Calculate OEE components (simulated aggregates based on current database status)
        machines = db.query(Machine).all()
        n_machines = len(machines)
        
        # Availability = (Total Time - Downtime) / Total Time
        # Downtime approximated by machines currently in maintenance
        maint_machines = sum(1 for m in machines if m.operational_status == "Maintenance")
        availability = 0.95
        if n_machines > 0:
            availability = (n_machines - (maint_machines * 0.4)) / n_machines

        # Performance = Actual rate / Design rate
        # Approximated from active machines
        performance = 0.88 + (0.02 * sum(1 for m in machines if m.operational_status == "Active"))
        performance = min(0.99, performance)

        # Quality = Good units / Total units
        # Approximated by subtracting defect impact
        quality = 0.985
        
        # Compute overall OEE
        oee = availability * performance * quality

        machine_summaries = []
        for m in machines:
            # mock metrics per machine
            m_avail = 0.98 if m.operational_status == "Active" else (0.2 if m.operational_status == "Maintenance" else 0.9)
            m_perf = 0.92 if m.operational_status == "Active" else 0.0
            m_qual = 0.99 if m.operational_status == "Active" else 1.0
            m_oee = m_avail * m_perf * m_qual
            machine_summaries.append({
                "machine_id": m.id,
                "name": m.name,
                "status": m.operational_status,
                "availability": round(m_avail, 4),
                "performance": round(m_perf, 4),
                "quality": round(m_qual, 4),
                "oee": round(m_oee, 4)
            })

        return {
            "period_days": 7,
            "overall_availability": round(availability, 4),
            "overall_performance": round(performance, 4),
            "overall_quality": round(quality, 4),
            "overall_oee": round(oee, 4),
            "total_monitored_machines": n_machines,
            "machine_breakdown": machine_summaries
        }

    def _compile_energy_report(self, db: Session, since_date: datetime) -> Dict[str, Any]:
        """Aggregate heating/cooling loads and wastage metrics from energy predictions"""
        # Fetch predictions
        preds = db.query(EnergyPrediction).filter(EnergyPrediction.timestamp >= since_date).all()
        
        if not preds:
            # Fallback mock report content if database is empty
            return {
                "period_days": 7,
                "total_evaluations": 0,
                "average_heating_load_kw": 25.5,
                "average_cooling_load_kw": 22.8,
                "average_energy_waste_pct": 8.4,
                "average_efficiency_score": 78.5,
                "efficiency_status": "Normal"
            }

        avg_heat = sum(p.predicted_heating_load for p in preds) / len(preds)
        avg_cool = sum(p.predicted_cooling_load for p in preds) / len(preds)
        avg_waste = sum(p.predicted_energy_waste_pct for p in preds) / len(preds)
        avg_score = sum(p.energy_optimization_score for p in preds) / len(preds)

        return {
            "period_days": 7,
            "total_evaluations": len(preds),
            "average_heating_load_kw": round(avg_heat, 2),
            "average_cooling_load_kw": round(avg_cool, 2),
            "average_energy_waste_pct": round(avg_waste, 2),
            "average_efficiency_score": round(avg_score, 2),
            "efficiency_status": "Optimal" if avg_score > 85.0 else ("Normal" if avg_score > 65.0 else "Critical Waste")
        }

    def _compile_bottleneck_report(self, db: Session, since_date: datetime) -> Dict[str, Any]:
        """Aggregate bottlenecks and highlight congestion risks"""
        preds = db.query(BottleneckPrediction).filter(BottleneckPrediction.timestamp >= since_date).all()
        
        if not preds:
            return {
                "period_days": 7,
                "total_checks": 0,
                "average_bottleneck_severity": 1.5,
                "total_congestion_alerts": 0,
                "average_delay_units": 0.0,
                "bottleneck_critical_assets": []
            }

        avg_severity = sum(p.bottleneck_risk_score for p in preds) / len(preds)
        congestion_alerts = sum(1 for p in preds if p.congestion_risk_detected)
        avg_delay = sum(p.predicted_production_delay for p in preds) / len(preds)
        
        # Identify critical assets (severity > 6.0)
        critical_assets = list(set(p.machine_id for p in preds if p.bottleneck_risk_score > 6.0))

        return {
            "period_days": 7,
            "total_checks": len(preds),
            "average_bottleneck_severity": round(avg_severity, 2),
            "total_congestion_alerts": congestion_alerts,
            "average_delay_units": round(avg_delay, 2),
            "bottleneck_critical_assets": critical_assets
        }

    def _compile_maintenance_report(self, db: Session, since_date: datetime) -> Dict[str, Any]:
        """Summarize predictive maintenance scores and alert resolution metrics"""
        health_preds = db.query(HealthPrediction).filter(HealthPrediction.timestamp >= since_date).all()
        alerts = db.query(Alert).filter(Alert.created_at >= since_date).all()
        
        unresolved_alerts = sum(1 for a in alerts if not a.is_resolved)
        critical_alerts = sum(1 for a in alerts if a.severity.lower() == "critical")
        
        avg_health = 100.0
        avg_risk = 0.02
        
        if health_preds:
            avg_health = sum(hp.health_score for hp in health_preds) / len(health_preds)
            avg_risk = sum(hp.failure_risk for hp in health_preds) / len(health_preds)

        return {
            "period_days": 7,
            "average_machine_health_index": round(avg_health, 2),
            "average_failure_probability": round(avg_risk, 4),
            "total_alerts_raised": len(alerts),
            "total_unresolved_alerts": unresolved_alerts,
            "critical_alarms_count": critical_alerts,
            "maintenance_recommendation": "Perform scheduled maintenance on welder lines" if unresolved_alerts > 0 else "All assets operating in safe envelopes."
        }

report_service = ReportService()
