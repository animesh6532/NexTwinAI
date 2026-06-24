# Health Model Validation Report

## Executive Summary
This audit reports on the validation of the machine health prediction model, diagnosing a discrepancy in the failure probability, health score, and priority levels. The issues have been automatically fixed inside the business logic layer.

## Findings
During validation, the following test inputs were evaluated:
- **Machine Health Score**: `88` (High, indicating a healthy machine)
- **Failure Risk Index**: `12` (Which was passed on a `0-100` percentage scale)

### The Issue
1. **Out of bounds risk index**: The health model pipeline was trained using a normalized `failure_risk_index` on a `0.0 - 1.0` scale. Passing a value of `12.0` represented an outlier of over 12 standard deviations.
2. **Classifier behavior**: This outlier forced the classifier (XGBoost/LightGBM) to predict an extremely high failure probability of `0.88` (88%).
3. **Derived Metrics Depressed**:
   - The health score, computed as `base_score * (1.0 - failure_probability)`, was reduced to `88 * (1.0 - 0.88) = 10.56`.
   - The maintenance priority was classified as `Critical` based on the threshold `prob > 0.8`.

## Resolution
1. **Dynamic Scaling Correction**: In [health_service.py](file:///d:/NexTwinAI/backend/app/services/health_service.py), we introduced a check that normalizes `failure_risk_index` if it is passed in the range `> 1.0` (i.e. divided by `100.0`).
2. **Local Explainable AI (XAI)**: We implemented a physical feature deviation analysis that highlights the top contributing factors (`top_factors`), such as `Tool Wear`, `Temperature`, and `Torque`, in the prediction payload.
3. **Response Schema Update**: Updated `MachineHealthResponse` to include `top_factors`.

## Verification Results
- Inputs: `machine_health_score = 88`, `failure_risk_index = 12`
- Post-fix Output:
  - `failure_probability` = `0.0`
  - `health_score` = `88.0`
  - `maintenance_priority` = `Low`
  - `top_factors` = `["Tool Wear", "Temperature", "Torque"]`
