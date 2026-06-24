"""
NexTwin AI — forecasting.py
===========================
REST API endpoints for time-series forecasting (OEE throughput, energy load, failure risk).

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List

from app.services.forecasting_service import forecasting_service
from app.utils.logger import logger

router = APIRouter()

class ForecastInput(BaseModel):
    machine_id: str = Field("M_001", description="Identifier of target machine")
    horizon: int = Field(30, description="Forecast horizon in days (e.g. 30 or 90)")

class ForecastResponse(BaseModel):
    machine_id: str
    failure_risk_forecast: List[float] = Field(..., description="Daily predicted failure risks")
    energy_forecast: List[float] = Field(..., description="Daily predicted energy total load (kW)")
    throughput_forecast: List[float] = Field(..., description="Daily predicted actual output quantities (units)")

@router.post("/predict/forecast", response_model=ForecastResponse, status_code=status.HTTP_200_OK)
def predict_forecast(payload: ForecastInput):
    """
    Exposes time-series predictive forecasts for machine failure probability,
    total zone energy draw, and production throughput across a 30 or 90 day horizon.
    """
    logger.info(f"Time-Series Forecast requested for Machine ID: {payload.machine_id} (Horizon: {payload.horizon})")
    if payload.horizon not in [30, 90]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported forecast horizon. Choose between 30 and 90 days."
        )
    try:
        prediction = forecasting_service.generate_forecast(payload.machine_id, payload.horizon)
        return ForecastResponse(**prediction)
    except Exception as e:
        logger.error(f"Time-series forecasting failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference gateway forecasting error: {str(e)}"
        )
