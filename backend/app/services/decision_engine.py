"""
NexTwin AI — decision_engine.py
==============================
Agentic AI engine that executes operational decision logic, recommends optimizations,
schedules predictive maintenance plans, and prioritizes factory alerts.

Author: Principal Industrial AI Architect & Digital Twin Systems Designer
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from app.database.models import Machine, Alert, MaintenanceLog, Sensor, SensorReading, FactoryEvent
from app.services.relationship_engine import relationship_engine

import os
import sys
import importlib.util

# Load DigitalTwinStateManager dynamically to handle hyphenated directory name
_current_dir = os.path.dirname(os.path.abspath(__file__))
_state_manager_path = os.path.abspath(os.path.join(_current_dir, "..", "..", "..", "digital-twin", "state", "state_manager.py"))

if not os.path.exists(_state_manager_path):
    raise FileNotFoundError(f"State manager not found at path: {_state_manager_path}")

_spec = importlib.util.spec_from_file_location("state_manager_module", _state_manager_path)
_state_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_state_module)

DigitalTwinStateManager = _state_module.DigitalTwinStateManager

class AgenticDecisionEngine:
    @classmethod
    def prioritize_alerts(cls, db: Session) -> List[Dict[str, Any]]:
        """Queries active alerts and prioritizes them based on cascading machine impact and severity"""
        active_alerts = db.query(Alert).filter(Alert.is_resolved == False).all()
        prioritized = []
        
        severity_weights = {
            "Emergency": 40.0,
            "Critical": 30.0,
            "Warning": 15.0,
            "Info": 5.0
        }
        
        for alert in active_alerts:
            # Base weight from severity
            weight = severity_weights.get(alert.severity, 10.0)
            
            # Additional weight based on how many downstream machines are impacted
            affected_count = len(alert.affected_machines) if alert.affected_machines else 1
            weight += affected_count * 5.0
            
            prioritized.append({
                "id": alert.id,
                "machine_id": alert.machine_id,
                "title": alert.title,
                "severity": alert.severity,
                "weight": weight,
                "affected_machines_count": affected_count,
                "cause": alert.cause,
                "impact": alert.impact,
                "recommendation": alert.recommendation,
                "suggested_actions": alert.suggested_actions or ["Inspect asset immediately"]
            })
            
        # Sort by impact weight descending
        prioritized.sort(key=lambda x: x["weight"], reverse=True)
        return prioritized

    @classmethod
    def generate_energy_optimization(cls, db: Session) -> Dict[str, Any]:
        """Ranks machines by power draw, flags energy waste anomalies, and computes cost savings"""
        states = DigitalTwinStateManager.get_all_states(db)
        
        ranking = []
        peak_load_threshold = 85.0  # kW
        total_potential_savings = 0.0
        active_peak_loads = []
        waste_anomalies = []
        
        electricity_rate = 0.12  # USD per kWh
        
        for s in states:
            power = s.energy_usage
            # Est. waste based on anomaly score and failure probability
            waste_pct = max(5.0, round(s.anomaly_score * 25.0 + s.failure_probability * 15.0, 1))
            if s.status.lower() in ["critical", "warning"]:
                waste_pct += 10.0
            waste_pct = min(45.0, waste_pct)
            
            # Annual cost savings calculation (kW * waste_pct * 24 hr/day * 365 day/yr * rate)
            hourly_waste_kwh = power * (waste_pct / 100.0)
            annual_savings = hourly_waste_kwh * 24 * 365 * electricity_rate
            total_potential_savings += annual_savings
            
            ranking.append({
                "machine_id": s.machine_id,
                "power_draw_kw": power,
                "waste_pct": waste_pct,
                "annual_cost_savings_usd": round(annual_savings, 2),
                "is_peak_load": power > peak_load_threshold
            })
            
            if power > peak_load_threshold:
                active_peak_loads.append(s.machine_id)
            if waste_pct > 18.0:
                waste_anomalies.append({
                    "machine_id": s.machine_id,
                    "waste_pct": waste_pct,
                    "cause": "Mechanical friction slip or sub-optimal loading cycles"
                })
                
        ranking.sort(key=lambda x: x["power_draw_kw"], reverse=True)
        
        # Build recommendations list
        recommendations = []
        if active_peak_loads:
            recommendations.append({
                "category": "Peak Load Management",
                "message": f"Machines {', '.join(active_peak_loads)} exceed peak load threshold ({peak_load_threshold} kW). Stagger operational shifts.",
                "estimated_savings_usd": round(len(active_peak_loads) * 1200.0, 2)
            })
        if waste_anomalies:
            for wa in waste_anomalies[:2]:
                recommendations.append({
                    "category": "Efficiency Restoration",
                    "message": f"Asset {wa['machine_id']} has high waste coefficient ({wa['waste_pct']}%). Schedule lubrication check to reduce friction.",
                    "estimated_savings_usd": round(wa["annual_cost_savings_usd"] * 0.4, 2)
                })
                
        return {
            "machines_ranking": ranking,
            "total_potential_savings_usd": round(total_potential_savings, 2),
            "peak_load_assets": active_peak_loads,
            "waste_anomalies": waste_anomalies,
            "optimization_suggestions": recommendations
        }

    @classmethod
    def generate_maintenance_plans(cls, db: Session) -> List[Dict[str, Any]]:
        """Generates dynamic maintenance schedules for deteriorating machines based on risk thresholds"""
        states = DigitalTwinStateManager.get_all_states(db)
        
        plans = []
        for s in states:
            if s.health_score < 80.0 or s.failure_probability > 0.35:
                # Calculate estimated cost and downtime
                est_downtime = 45.0 + (1.0 - s.health_score/100.0) * 180.0
                est_cost = 250.0 + (100.0 - s.health_score) * 25.0
                
                # Window calculation
                days_window = 1
                if s.failure_probability > 0.75:
                    window = "Immediate shutdown required"
                    priority = "Critical"
                elif s.failure_probability > 0.50:
                    window = "Within next 24 operating hours"
                    priority = "High"
                    days_window = 1
                else:
                    window = "Within next 5 operating days"
                    priority = "Medium"
                    days_window = 5
                    
                plans.append({
                    "machine_id": s.machine_id,
                    "current_health": s.health_score,
                    "failure_probability": s.failure_probability,
                    "priority": priority,
                    "maintenance_window": window,
                    "estimated_downtime_minutes": round(est_downtime, 1),
                    "estimated_cost_usd": round(est_cost, 2),
                    "suggested_action": "Spindle realignment, bearing grease flush, belt re-tensioning" if s.anomaly_score > 0.4 else "Nominal service calibration"
                })
                
        plans.sort(key=lambda x: x["failure_probability"], reverse=True)
        return plans

    @classmethod
    def recommend_simulations(cls, db: Session) -> List[Dict[str, Any]]:
        """Scans the plant floor bottlenecks/risks and suggests what-if simulations for operators"""
        states = DigitalTwinStateManager.get_all_states(db)
        suggestions = []
        
        for s in states:
            if s.status.lower() in ["critical", "warning"]:
                suggestions.append({
                    "machine_id": s.machine_id,
                    "scenario_type": "Asset Load stress simulation",
                    "reason": f"Asset {s.machine_id} is in {s.status} state. Run a sandboxed RPM stress scenario to analyze degradation trajectory.",
                    "adjustments_suggested": {"adjust_speed_rpm": -150, "adjust_torque_nm": -5}
                })
            
            # Check for high energy
            if s.energy_usage > 75.0:
                suggestions.append({
                    "machine_id": s.machine_id,
                    "scenario_type": "Thermal Energy simulation",
                    "reason": f"Asset {s.machine_id} has high electrical draw ({s.energy_usage} kW). Run a Building Envelope scenario to optimize thermal dissipation.",
                    "adjustments_suggested": {"sim_glazing_area": 0.15, "sim_roof_area": 160}
                })
                
        if not suggestions:
            # Default suggestion
            suggestions.append({
                "machine_id": "M_001",
                "scenario_type": "Production Bottleneck simulation",
                "reason": "Assembly line throughput optimizations. Run a bottleneck delay simulation to project buffer capacity limits.",
                "adjustments_suggested": {"adjust_cycle_time": 3.0, "adjust_queue_length": 5}
            })
            
        return suggestions

    @classmethod
    def summarize_factory_health(cls, db: Session) -> Dict[str, Any]:
        """Compiles a complete natural language factory summary statement for AI Copilot fallback"""
        states = DigitalTwinStateManager.get_all_states(db)
        
        if not states:
            return {"status": "Unknown", "summary": "No machine telemetry logs registered."}
            
        healthy_count = sum(1 for s in states if s.status == "Healthy")
        warning_count = sum(1 for s in states if s.status == "Warning")
        critical_count = sum(1 for s in states if s.status == "Critical")
        maint_count = sum(1 for s in states if s.status == "Maintenance")
        
        avg_oee = sum(s.health_score for s in states) / len(states)
        total_power = sum(s.energy_usage for s in states)
        
        status = "Healthy"
        if critical_count > 0 or maint_count > 0:
            status = "CRITICAL"
        elif warning_count > 0:
            status = "WARNING"
            
        summary_text = (
            f"### Factory Health & Operations Summary\n"
            f"- **Overall Status**: **{status}**\n"
            f"- **Monitored Assets**: {len(states)} active machines\n"
            f"  - Healthy: {healthy_count} | Warning: {warning_count} | Critical: {critical_count} | Maintenance: {maint_count}\n"
            f"- **Average Line OEE**: {avg_oee:.1f}%\n"
            f"- **Total Energy Draw**: {total_power:.1f} kW\n\n"
        )
        
        if critical_count > 0:
            critical_machines = [s.machine_id for s in states if s.status == "Critical"]
            summary_text += f"⚠️ **Urgent Operational Risk**: Machines {', '.join(critical_machines)} are in a critical state due to elevated failure risk or vibration anomalies. Starvation risk downstream is active.\n"
        elif warning_count > 0:
            warning_machines = [s.machine_id for s in states if s.status == "Warning"]
            summary_text += f"⚠️ **Active Warning**: Machines {', '.join(warning_machines)} show minor baseline sensor deflections. Bearing lubrication flush suggested.\n"
        else:
            summary_text += "✅ **Nominal Operations**: All monitored conveyor lines and machine cells are operating within standard safety tolerances.\n"
            
        return {
            "status": status,
            "summary_markdown": summary_text,
            "metrics": {
                "avg_oee": round(avg_oee, 2),
                "healthy_count": healthy_count,
                "warning_count": warning_count,
                "critical_count": critical_count,
                "maintenance_count": maint_count,
                "total_power_kw": round(total_power, 2)
            }
        }

decision_engine = AgenticDecisionEngine()
