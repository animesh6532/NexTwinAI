"""
NexTwin AI — main.py
===================
Entry point for the FastAPI Gateway. This file configures the application instance,
applies CORS middlewares, registers the v1 API routes, sets up global exception
handling, and registers lifecycle events using the modern lifespan context manager.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

# Logging & Configuration
from app.config.config import settings
from app.utils.logger import setup_logging, logger
from app.database.db import Base, engine
from app.database import models  # noqa: F401

# API Routers
from app.api.health import router as health_router
from app.api.machines import router as machines_router
from app.api.sensors import router as sensors_router
from app.api.bottlenecks import router as bottlenecks_router
from app.api.energy import router as energy_router
from app.api.anomalies import router as anomalies_router
from app.api.simulations import router as simulations_router
from app.api.reports import router as reports_router
from app.api.alerts import router as alerts_router
from app.api.copilot import router as copilot_router
from app.api.digital_twin import router as digital_twin_router
from app.api.forecasting import router as forecasting_router
from app.api.models_api import router as models_status_router
from app.api.websocket import router as ws_router


# Setup system logging
setup_logging()

# Modern FastAPI Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle event handler for the FastAPI application.
    Executes database connectivity checks on startup and logs shutdown events.
    """
    logger.info("Initializing NexTwin AI Platform Gateway...")
    
    # Validate database connection
    try:
        if settings.AUTO_CREATE_TABLES:
            Base.metadata.create_all(bind=engine)
        with engine.connect() as connection:
            logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.critical(f"Database connection failed on startup: {str(e)}")
        # We do not crash the app immediately so that diagnostics can run,
        # but logging is flagged critical.

    logger.info("FastAPI Application has started successfully.")
    yield
    logger.info("Shutting down NexTwin AI Platform Gateway...")
    logger.info("FastAPI Application has shutdown successfully.")

# Initialize FastAPI App
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="NexTwin AI - Edge-AI Powered Manufacturing Digital Twin Platform REST API gateway.",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan,
)

# CORS Configuration
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Execution Time & Logging Middleware
@app.middleware("http")
async def add_process_time_and_log(request: Request, call_next):
    start_time = time.perf_counter()
    logger.info(f"Incoming Request: {request.method} {request.url.path}")
    
    try:
        response: Response = await call_next(request)
        process_time = time.perf_counter() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        logger.info(
            f"Request completed: {request.method} {request.url.path} "
            f"Status Code: {response.status_code} | Process Time: {process_time:.4f}s"
        )
        return response
    except Exception as exc:
        process_time = time.perf_counter() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path} | "
            f"Error: {str(exc)} | Process Time: {process_time:.4f}s",
            exc_info=True
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred during request processing."},
        )

# Global Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTPException on {request.url.path}: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error on {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred during request processing."}
    )

# Register Routes
app.include_router(health_router, prefix=settings.API_V1_STR, tags=["Health"])
app.include_router(machines_router, prefix=settings.API_V1_STR, tags=["Machines"])
app.include_router(sensors_router, prefix=settings.API_V1_STR, tags=["Sensors"])
app.include_router(bottlenecks_router, prefix=settings.API_V1_STR, tags=["Bottlenecks"])
app.include_router(energy_router, prefix=settings.API_V1_STR, tags=["Energy Optimization"])
app.include_router(anomalies_router, prefix=settings.API_V1_STR, tags=["Anomaly Detection"])
app.include_router(simulations_router, prefix=settings.API_V1_STR, tags=["Simulation"])
app.include_router(reports_router, prefix=settings.API_V1_STR, tags=["Reports"])
app.include_router(alerts_router, prefix=settings.API_V1_STR, tags=["Alerts"])
app.include_router(copilot_router, prefix=settings.API_V1_STR, tags=["AI Copilot"])
app.include_router(digital_twin_router, prefix=settings.API_V1_STR, tags=["Digital Twin"])
app.include_router(forecasting_router, prefix=settings.API_V1_STR, tags=["Time-Series Forecasting"])
app.include_router(models_status_router, prefix=settings.API_V1_STR, tags=["Models Status Monitoring"])
app.include_router(ws_router, prefix=settings.API_V1_STR, tags=["WebSocket Live Telemetry"])
