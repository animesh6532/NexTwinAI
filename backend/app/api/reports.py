"""
NexTwin AI — reports.py
======================
REST API endpoints for generating and listing factory performance and analytical reports.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.database.db import get_db
from app.services.report_service import report_service
from app.utils.logger import logger

router = APIRouter()

# --- Request / Response Schemas ---

class ReportCreate(BaseModel):
    title: str = Field(..., description="Report title, e.g. CNC Line A Weekly OEE Report")
    report_type: str = Field(..., description="Report category: OEE, Energy, Bottleneck, Maintenance")
    parameters: Optional[Dict[str, Any]] = Field(
        None, 
        description="Parameters configuration, e.g. {'machine_id': 'M_001', 'days': 7}"
    )
    generated_by: int = Field(1, description="ID of the user generating the report")

class ReportResponse(BaseModel):
    id: int
    title: str
    report_type: str
    parameters: Optional[Dict[str, Any]] = None
    content: Dict[str, Any] = Field(..., description="Key-value metrics and summaries generated")
    created_at: str = Field(..., description="Date of generation")
    generated_by: int

# --- Routes ---

@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(payload: ReportCreate, db: Session = Depends(get_db)):
    """
    Compile a plant analysis report (OEE, Energy, Bottleneck, or Maintenance) 
    summarizing factory state over a configured time window.
    """
    logger.info(f"Generating plant report: {payload.title} of type: {payload.report_type}")
    try:
        rep = report_service.generate_report(db, payload.dict())
        return ReportResponse(
            id=rep.id,
            title=rep.title,
            report_type=rep.report_type,
            parameters=rep.parameters,
            content=rep.content,
            created_at=rep.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            generated_by=rep.generated_by
        )
    except Exception as e:
        logger.error(f"Failed to generate report: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compile report: {str(e)}"
        )

@router.get("/reports", response_model=List[ReportResponse], status_code=status.HTTP_200_OK)
def list_reports(limit: int = 20, db: Session = Depends(get_db)):
    """
    List past generated reports with summary statistics.
    """
    try:
        records = report_service.get_reports(db, limit)
        return [
            ReportResponse(
                id=rec.id,
                title=rec.title,
                report_type=rec.report_type,
                parameters=rec.parameters,
                content=rec.content,
                created_at=rec.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                generated_by=rec.generated_by
            )
            for rec in records
        ]
    except Exception as e:
        logger.error(f"Error fetching reports: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/reports/{report_id}", response_model=ReportResponse, status_code=status.HTTP_200_OK)
def get_report_details(report_id: int, db: Session = Depends(get_db)):
    """
    Retrieve comprehensive report outputs by ID.
    """
    rep = report_service.get_report_by_id(db, report_id)
    if not rep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID {report_id} not found."
        )
    return ReportResponse(
        id=rep.id,
        title=rep.title,
        report_type=rep.report_type,
        parameters=rep.parameters,
        content=rep.content,
        created_at=rep.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        generated_by=rep.generated_by
    )
