# Alert Automation Report

## Executive Summary
This report summarizes the design and implementation of the event-driven Automatic Alert Engine in the NexTwin AI backend. We have embedded predictive rule guards directly inside the business logic services, allowing the platform to raise critical and warning alerts in response to ML model inferences automatically.

## Alerting Rules & Thresholds

We implemented four automated alert check pipelines:

### 1. High Failure Probability Guard (Predictive Maintenance)
- **Service**: [health_service.py](file:///d:/NexTwinAI/backend/app/services/health_service.py)
- **Rule**: `failure_probability > 0.80` (80.00%)
- **Action**: Raises a **Critical** alert (`"Critical Failure Risk Breach"`) and automatically transitions the machine's operational status to `Maintenance` (handled by machine_service).

### 2. Physical Signatures Anomaly Guard (Acoustics & Vibration)
- **Service**: [anomaly_service.py](file:///d:/NexTwinAI/backend/app/services/anomaly_service.py)
- **Rule**: `anomaly_detected == True` (from unsupervised autoencoder/isolation forest)
- **Action**: Raises a **Warning** alert (`"Telemetry Anomaly Alarm"`) outlining the score and method used.

### 3. Thermal Envelope & Energy Waste Guard (Infrastructure)
- **Service**: [energy_service.py](file:///d:/NexTwinAI/backend/app/services/energy_service.py)
- **Rule**: `waste_pct > 15.0%` (15.00%)
- **Action**: Raises a **Warning** alert (`"High Energy Waste Alarm"`) indicating thermal load inefficiencies.

### 4. Line Congestion & Bottleneck Guard (Operations)
- **Service**: [bottleneck_service.py](file:///d:/NexTwinAI/backend/app/services/bottleneck_service.py)
- **Rule**: `bottleneck_risk_score > 7.00` (on a 0-10 continuous scale)
- **Action**: Raises a **Warning** alert (`"Production Line Bottleneck Alarm"`) flagging production OEE delay risks.

## Spam Suppression Logic
To prevent flooding the active alerts dashboard with identical notifications during continuous telemetry processing, the services check the database for any active, unresolved alerts with the same headline for that specific asset before dispatching a new record.
