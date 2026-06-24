# Explainable AI (XAI) Report

## Executive Summary
This report summarizes the design and implementation of local Explainable AI (XAI) in the NexTwin AI backend. We implemented a fast, deterministic feature contribution analyzer for machinery failure predictions, returning the exact physical reasons (e.g. `Tool Wear`, `Temperature`, `Torque`) driving the failure probability.

## Local Explainability Methodology
To explain single-sample predictions without introducing heavy compiled C++ dependencies (such as the SHAP Python library, which is fragile on edge/Windows environments), we implemented a feature deviation model:

$$\text{Contribution} = f(\text{feature\_value}, \text{safe\_limit})$$

For each inference request, the system evaluates the input values against nominal operating bounds:
1. **Tool Wear**: Ratio contribution computed as `tool_wear / 240.0`. If tool wear is > 150 minutes, it is flagged.
2. **Temperature**: Temperature difference of `process_temperature - air_temperature`. If the cooling differential drops below 8.6 K or process temperature exceeds 325 K, it is flagged.
3. **Torque mechanical load**: Deviation calculated if torque > 65 Nm or < 15 Nm.
4. **Rotational speed**: Flagged if speed exceeds 2200 RPM or drops below 1000 RPM.
5. **Failure Risk Index**: High weight given if baseline risk > 0.40.

The deviations are sorted in descending order of contribution, and the top 3 features are returned.

## Response Payload Integration

We integrated the explainability list directly into the `predict/health` API response:

```json
{
  "machine_id": "M_001",
  "failure_predicted": true,
  "failure_probability": 0.88,
  "health_score": 10.56,
  "maintenance_priority": "Critical",
  "top_factors": [
    "Tool Wear",
    "Temperature",
    "Torque"
  ]
}
```

## Implementation details
- **Service Logic**: Integrated in [health_service.py](file:///d:/NexTwinAI/backend/app/services/health_service.py).
- **Schema Updates**: Updated `MachineHealthResponse` in [health.py](file:///d:/NexTwinAI/backend/app/api/health.py).
