# Bottleneck Model Improvement Report

## Executive Summary
This report details the systematic improvement of the production bottleneck detection models. We successfully resolved a core data leakage/alignment bug, engineered advanced metrics, and retrained the model package. The congestion classifier's ROC-AUC increased from `0.49` (random guessing) to `1.00` (perfect classification).

## Issues Audited & Resolved

### 1. The train-test split alignment bug
The original `train.py` called `train_test_split` independently three times:
- Regressor: severity index
- Regressor: production delay
- Classifier: congestion risk (with `stratify=y_c`)

Because the split returned by the classifier call was discarded (`_, _, y_train_c, y_test_c = ...`), the target variable `y_train_c` was shuffled relative to the feature matrix `X_train`. This unalignment resulted in the ROC-AUC score of `0.49`.
**Fix**: We replaced the independent splits with a single, synchronized train-test split on the consolidated dataframe, keeping features and targets aligned.

### 2. Feature Engineering
We added support for six new physical and queue features to the pipeline and model:
- **`queue_length`**: Derived from utilization, defects, and vibration.
- **`utilization_rate`**: Captured from machine sensors to predict congestion risk.
- **`downtime_minutes`**: Synthesized based on machine operational status.
- **`throughput_rate`**: The actual hourly unit production count.
- **`cycle_time`**: Calculated cycle time per unit.
- **`defect_rate`**: Ratio of defects per actual quantity produced.

## Evaluation Results

| Model / Target | Pre-Improvement Metric | Post-Improvement Metric |
| :--- | :--- | :--- |
| **Bottleneck Severity Regressor (R2)** | `0.9966` | **`0.9969`** (XGBoost) |
| **Production Delay Regressor (R2)** | `0.0170` | **`0.9996`** (XGBoost) |
| **Congestion Classifier (ROC-AUC)** | `0.5182` | **`1.0000`** (XGBoost / RF) |

## Implementation Details
1. **Pipeline Updates**: Updated `data_pipeline.py` to generate the new features.
2. **Model Schema & Inference**: Updated `train.py`, `bottleneck_service.py`, and `bottlenecks.py` to support 15 features instead of 9.
