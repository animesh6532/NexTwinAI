"""
NexTwin AI — simulations.py
===========================
REST API endpoints for configuring and executing digital twin scenario simulations.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.simulation_service import simulation_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class SimulationCreate(BaseModel):
    name: str = Field(..., description="Name of the simulation scenario, e.g. Speed Up CNC Line")
    description: Optional[str] = Field(None, description="Detailed objective of simulation")
    # Parameters can vary, so we use a flexible dict structure
    parameters: Dict[str, Any] = Field(
        ..., 
        description="Configuration parameters (e.g. {'machine_id': 'M_001', 'adjust_speed_rpm': 100})"
    )

class SimulationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any]
    results: Optional[Dict[str, Any]] = None
    created_at: str = Field(..., description="Timestamp of execution")
    run_by: Optional[int] = None

# --- Routes ---

@router.post("/simulations", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def run_simulation(payload: SimulationCreate, db: Session = Depends(get_db)):
    """
    Run a digital twin simulation scenario. For example, testing how changes in machine 
    parameters (RPM, torque) or building structures (glazing, insulation) affect failure risk 
    and energy loads.
    """
    logger.info(f"Digital Twin Simulation execution requested: {payload.name}")
    try:
        sim = simulation_service.run_scenario(db, payload.dict())
        return SimulationResponse(
            id=sim.id,
            name=sim.name,
            description=sim.description,
            parameters=sim.parameters,
            results=sim.results,
            created_at=sim.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            run_by=sim.run_by
        )
    except ValueError as val_err:
        logger.warning(f"Validation error running simulation: {str(val_err)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err)
        )
    except Exception as e:
        logger.error(f"Failed to execute simulation scenario: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simulation scenario failed: {str(e)}"
        )

@router.get("/simulations", response_model=List[SimulationResponse], status_code=status.HTTP_200_OK)
def list_simulations(limit: int = 20, db: Session = Depends(get_db)):
    """
    List past digital twin simulations and their resulting metrics.
    """
    try:
        records = simulation_service.get_simulations(db, limit)
        return [
            SimulationResponse(
                id=rec.id,
                name=rec.name,
                description=rec.description,
                parameters=rec.parameters,
                results=rec.results,
                created_at=rec.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                run_by=rec.run_by
            )
            for rec in records
        ]
    except Exception as e:
        logger.error(f"Error fetching simulations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/simulations/{simulation_id}", response_model=SimulationResponse, status_code=status.HTTP_200_OK)
def get_simulation_details(simulation_id: int, db: Session = Depends(get_db)):
    """
    Fetch comprehensive config and outcome metrics of a specific simulation by ID.
    """
    sim = simulation_service.get_simulation_by_id(db, simulation_id)
    if not sim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation run with ID {simulation_id} not found."
        )
    return SimulationResponse(
        id=sim.id,
        name=sim.name,
        description=sim.description,
        parameters=sim.parameters,
        results=sim.results,
        created_at=sim.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        run_by=sim.run_by
    )
