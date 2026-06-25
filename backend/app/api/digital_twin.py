"""
NexTwin AI — digital_twin.py
============================
REST API endpoints for retrieving the consolidated Digital Twin state layer,
relationship graph, machine dependency mapping, factory overview, and bottlenecks.

Author: Principal AI Architect & Digital Twin Systems Engineer
"""

import os
import sys
import importlib.util
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from app.database.db import get_db
from app.database.models import Machine, Alert, Sensor, SensorReading, HealthPrediction, AnomalyPrediction, EnergyPrediction
from app.services.relationship_engine import relationship_engine

# Load DigitalTwinStateManager dynamically to handle hyphenated directory name
current_dir = os.path.dirname(os.path.abspath(__file__))
state_manager_path = os.path.abspath(os.path.join(current_dir, "..", "..", "..", "digital-twin", "state", "state_manager.py"))

if not os.path.exists(state_manager_path):
    raise FileNotFoundError(f"State manager not found at path: {state_manager_path}")

spec = importlib.util.spec_from_file_location("state_manager_module", state_manager_path)
state_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(state_module)

DigitalTwinState = state_module.DigitalTwinState
DigitalTwinStateManager = state_module.DigitalTwinStateManager

router = APIRouter()

@router.get("/digital-twin/state", response_model=List[DigitalTwinState], status_code=status.HTTP_200_OK)
def get_all_digital_twin_states(db: Session = Depends(get_db)):
    """
    Get the consolidated state layer of all registered machines in the Digital Twin.
    """
    try:
        return DigitalTwinStateManager.get_all_states(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch digital twin states: {str(e)}"
        )

@router.get("/digital-twin/machine/{machine_id}", response_model=DigitalTwinState, status_code=status.HTTP_200_OK)
def get_machine_digital_twin_state(machine_id: str, db: Session = Depends(get_db)):
    """
    Get the consolidated state layer of a specific machine ID.
    """
    try:
        state = DigitalTwinStateManager.get_machine_state(db, machine_id)
        if not state:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine with ID '{machine_id}' not found."
            )
        return state
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch digital twin state for machine '{machine_id}': {str(e)}"
        )

@router.get("/digital-twin/overview", status_code=status.HTTP_200_OK)
def get_factory_overview(db: Session = Depends(get_db)):
    """
    Retrieve factory-wide consolidated health overview (overall OEE, node status counts, energy, alerts).
    """
    try:
        states = DigitalTwinStateManager.get_all_states(db)
        if not states:
            return {
                "overall_oee": 100.0,
                "healthy_count": 0,
                "warning_count": 0,
                "critical_count": 0,
                "maintenance_count": 0,
                "total_power_kw": 0.0,
                "active_alerts_count": 0
            }
            
        total_oee = sum(s.health_score for s in states)
        avg_oee = round(total_oee / len(states), 2)
        total_power = round(sum(s.energy_usage for s in states), 2)
        
        healthy = sum(1 for s in states if s.status == "Healthy")
        warning = sum(1 for s in states if s.status == "Warning")
        critical = sum(1 for s in states if s.status == "Critical")
        maintenance = sum(1 for s in states if s.status == "Maintenance")
        
        active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
        
        return {
            "overall_oee": avg_oee,
            "healthy_count": healthy,
            "warning_count": warning,
            "critical_count": critical,
            "maintenance_count": maintenance,
            "total_power_kw": total_power,
            "active_alerts_count": active_alerts
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile factory overview: {str(e)}"
        )

@router.get("/digital-twin/graph", status_code=status.HTTP_200_OK)
def get_machine_graph(db: Session = Depends(get_db)):
    """
    Returns nodes and edges mapping machine dependencies.
    """
    try:
        # Returns static/dynamic mapping of nodes & edges with statuses
        graph = relationship_engine.get_relationship_graph()
        states = {s.machine_id: s.status for s in DigitalTwinStateManager.get_all_states(db)}
        for node in graph["nodes"]:
            node["status"] = states.get(node["id"], "Healthy")
        return graph
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate layout graph: {str(e)}"
        )

@router.get("/digital-twin/dependencies/{machine_id}", status_code=status.HTTP_200_OK)
def get_machine_dependencies(machine_id: str, db: Session = Depends(get_db)):
    """
    Get upstream/downstream dependencies and fail-impact analysis for a specific machine.
    """
    try:
        machine = db.query(Machine).filter(Machine.id == machine_id).first()
        if not machine:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Machine with ID '{machine_id}' does not exist."
            )
        deps = relationship_engine.get_dependencies(machine_id)
        simulation = relationship_engine.simulate_failure_propagation(db, machine_id)
        return {
            "machine_id": machine_id,
            "upstream": deps["upstream"],
            "downstream": deps["downstream"],
            "failure_impact_propagation": simulation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dependency analysis failed for '{machine_id}': {str(e)}"
        )

@router.get("/digital-twin/bottlenecks", status_code=status.HTTP_200_OK)
def get_bottleneck_analysis(db: Session = Depends(get_db)):
    """
    Compile bottleneck diagnostic rankings and upstream/downstream backlog projections.
    """
    try:
        return relationship_engine.analyze_bottlenecks(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate factory bottlenecks: {str(e)}"
        )

@router.get("/digital-twin/energy-insights", status_code=status.HTTP_200_OK)
def get_energy_insights(db: Session = Depends(get_db)):
    """
    Retrieve energy usage rankings, waste anomalies, and potential shift cost savings.
    """
    try:
        from app.services.decision_engine import decision_engine
        return decision_engine.generate_energy_optimization(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile energy insights: {str(e)}"
        )

@router.get("/digital-twin/maintenance-plans", status_code=status.HTTP_200_OK)
def get_maintenance_plans(db: Session = Depends(get_db)):
    """
    Fetch auto-generated preventive maintenance schedules, windows, costs, and priority actions.
    """
    try:
        from app.services.decision_engine import decision_engine
        return decision_engine.generate_maintenance_plans(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile maintenance plans: {str(e)}"
        )

@router.get("/digital-twin/simulation-recommendations", status_code=status.HTTP_200_OK)
def get_simulation_recommendations(db: Session = Depends(get_db)):
    """
    Retrieve recommended sandboxed what-if simulations based on active plant bottlenecks.
    """
    try:
        from app.services.decision_engine import decision_engine
        return decision_engine.recommend_simulations(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch simulation recommendations: {str(e)}"
        )

@router.get("/digital-twin/alerts/prioritized", status_code=status.HTTP_200_OK)
def get_prioritized_alerts(db: Session = Depends(get_db)):
    """
    Fetch active alerts prioritized by cascading dependency severity weight.
    """
    try:
        from app.services.decision_engine import decision_engine
        return decision_engine.prioritize_alerts(db)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prioritize active alerts: {str(e)}"
        )
