# Forecasting API Report

## Executive Summary
This report summarizes the implementation and exposure of the time-series forecasting gateways in the NexTwin AI backend. We created a consolidated endpoint that combines Prophet, XGBoost lag, and PyTorch LSTM models to predict factory parameters over a future time horizon (30 or 90 days).

## REST Endpoint Specification

### `POST /api/v1/predict/forecast`

#### Request Payload
```json
{
  "machine_id": "M_001",
  "horizon": 30
}
```
- **`machine_id`**: String identifier of the target machine.
- **`horizon`**: Time horizon in days (`30` or `90`).

#### Response Body
```json
{
  "machine_id": "M_001",
  "failure_risk_forecast": [0.052, 0.054, ...],
  "energy_forecast": [68.22, 67.95, ...],
  "throughput_forecast": [182.11, 185.34, ...]
}
```

## Backend Forecasting Architecture
Managed by the new service [forecasting_service.py](file:///d:/NexTwinAI/backend/app/services/forecasting_service.py), the forecasting models are lazy loaded:

1. **OEE Production Throughput**: Fit via Facebook/Meta **Prophet** to predict daily sums of units produced. Fallback trend extrapolation runs if the libraries are offline.
2. **Energy Load footprint**: Fit via recursive **XGBoost Regressor** lag variables (`lag_1`, `lag_7`, `lag_14`) to forecast total daily kW loads.
3. **Asset Failure Probability Risk**: Fit via recursive PyTorch **LSTM** (Recurrent Neural Network) to forecast machine utilization, from which failure probability is dynamically mapped.

## Integration & Implementation details
- Exposed router inside [forecasting.py](file:///d:/NexTwinAI/backend/app/api/forecasting.py).
- Registered router inside [main.py](file:///d:/NexTwinAI/backend/app/main.py) under the prefix `/api/v1` and tag `"Time-Series Forecasting"`.
