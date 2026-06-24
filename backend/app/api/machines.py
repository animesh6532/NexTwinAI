"""
NexTwin AI — machines.py
========================
REST API endpoints for managing physical factory machine assets.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.machine_service import machine_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class MachineBase(BaseModel):
    id: str = Field(..., description="Unique machine ID, e.g. M_001")
    name: str = Field(..., description="Human-readable name")
    type: str = Field("M", description="Machine grade classification: L, M, H")
    operational_status: str = Field("Active", description="Current status: Active, Idle, Maintenance")
    location: Optional[str] = Field(None, description="Physical site location")

class MachineCreate(MachineBase):
    pass

class MachineUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated human-readable name")
    type: Optional[str] = Field(None, description="Updated grade: L, M, H")
    operational_status: Optional[str] = Field(None, description="Updated status: Active, Idle, Maintenance")
    location: Optional[str] = Field(None, description="Updated location details")

class MachineResponse(MachineBase):
    class Config:
        from_attributes = True

# --- Routes ---

@router.get("/machines", response_model=List[MachineResponse], status_code=status.HTTP_200_OK)
def list_machines(db: Session = Depends(get_db)):
    """
    List all physical machine assets registered in the digital twin.
    """
    return machine_service.get_all_machines(db)

@router.get("/machines/{machine_id}", response_model=MachineResponse, status_code=status.HTTP_200_OK)
def get_machine(machine_id: str, db: Session = Depends(get_db)):
    """
    Get detailed asset configuration by machine ID.
    """
    machine = machine_service.get_machine_by_id(db, machine_id)
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine asset '{machine_id}' not found."
        )
    return machine

@router.post("/machines", response_model=MachineResponse, status_code=status.HTTP_201_CREATED)
def create_machine(payload: MachineCreate, db: Session = Depends(get_db)):
    """
    Register a new machine asset in the factory digital twin network.
    """
    existing = machine_service.get_machine_by_id(db, payload.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Machine with ID '{payload.id}' already exists."
        )
    return machine_service.create_machine(db, payload.dict())

@router.put("/machines/{machine_id}", response_model=MachineResponse, status_code=status.HTTP_200_OK)
def update_machine(machine_id: str, payload: MachineUpdate, db: Session = Depends(get_db)):
    """
    Update machine asset metadata, location, or operational state.
    """
    machine = machine_service.update_machine(db, machine_id, payload.dict(exclude_unset=True))
    if not machine:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine asset '{machine_id}' not found."
        )
    return machine

@router.delete("/machines/{machine_id}", status_code=status.HTTP_200_OK)
def delete_machine(machine_id: str, db: Session = Depends(get_db)):
    """
    Remove machine registration and associated sensors from database.
    """
    success = machine_service.delete_machine(db, machine_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Machine asset '{machine_id}' not found."
        )
    return {"message": f"Machine asset '{machine_id}' has been deleted."}
