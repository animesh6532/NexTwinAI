"""
NexTwin AI — digital_twin.py
============================
REST API endpoints for retrieving the consolidated Digital Twin state layer.

Author: Principal AI Architect & Digital Twin Systems Engineer
"""

import os
import sys
import importlib.util
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database.db import get_db

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
