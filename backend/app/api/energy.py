"""
NexTwin AI — energy.py
======================
REST API endpoints for predicting thermal load, energy waste, and providing 
energy-saving design recommendations.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.energy_service import energy_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class EnergyInput(BaseModel):
    machine_id: Optional[str] = Field(None, description="Optional machine ID linked to structural zone")
    relative_compactness: float = Field(0.76, description="Relative compactness of building envelope")
    surface_area: float = Field(680.0, description="Zone surface area (m²)")
    wall_area: float = Field(310.0, description="Zone wall area (m²)")
    roof_area: float = Field(180.0, description="Zone roof area (m²)")
    overall_height: float = Field(5.0, description="Overall vertical height (m)")
    orientation: float = Field(3.0, description="Structural orientation orientation angle class (1-4)")
    glazing_area: float = Field(0.20, description="Glazing area window ratio (0.0 - 0.4)")
    glazing_area_distribution: float = Field(2.0, description="Glazing distribution position class (1-5)")

class RecommendationItem(BaseModel):
    action: str = Field(..., description="Actionable optimization recommendation")
    estimated_thermal_load_savings_kw: float = Field(..., description="Projected energy reduction in kW")
    priority: str = Field(..., description="Priority classification: Low, Medium, High")

class EnergyResponse(BaseModel):
    machine_id: Optional[str] = None
    timestamp: str = Field(..., description="Timestamp of model execution")
    predicted_heating_load: float = Field(..., description="Predicted heating thermal load in kW")
    predicted_cooling_load: float = Field(..., description="Predicted cooling thermal load in kW")
    predicted_energy_waste_pct: float = Field(..., description="Estimated percentage of energy waste")
    energy_optimization_score: float = Field(..., description="Overall efficiency score (0-100)")
    optimization_recommendations: List[RecommendationItem] = Field([], description="List of structural modifications suggested")

# --- Routes ---

@router.post("/predict/energy", response_model=EnergyResponse, status_code=status.HTTP_200_OK)
def predict_energy(payload: EnergyInput, db: Session = Depends(get_db)):
    """
    Evaluate structural heating/cooling load, calculate energy waste percentage, and generate 
    operational layout adjustments to optimize power configurations using multi-output XGBoost.
    """
    logger.info(f"Energy Optimization check requested for machine zone: {payload.machine_id}")
    try:
        prediction = energy_service.predict_energy(db, payload.dict())
        return EnergyResponse(**prediction)
    except Exception as e:
        logger.error(f"Failed to execute energy prediction: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Energy engine execution failure: {str(e)}"
        )

@router.get("/energy/history", response_model=List[EnergyResponse], status_code=status.HTTP_200_OK)
def get_energy_history(machine_id: Optional[str] = None, limit: int = 50, db: Session = Depends(get_db)):
    """
    Get historical energy prediction and optimization records.
    """
    try:
        records = energy_service.get_prediction_history(db, machine_id, limit)
        return [
            EnergyResponse(
                machine_id=rec.machine_id,
                timestamp=rec.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                predicted_heating_load=rec.predicted_heating_load,
                predicted_cooling_load=rec.predicted_cooling_load,
                predicted_energy_waste_pct=rec.predicted_energy_waste_pct,
                energy_optimization_score=rec.energy_optimization_score,
                optimization_recommendations=rec.optimization_recommendations or []
            )
            for rec in records
        ]
    except Exception as e:
        logger.error(f"Error fetching energy prediction records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
