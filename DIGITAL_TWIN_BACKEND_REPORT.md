# Digital Twin Backend Engine Report

## Executive Summary
This report summarizes the design and implementation of the real-time Digital Twin state layer for NexTwin AI. We have introduced a state layer that consolidates telemetry and multi-service model predictions into a single representation of asset status.

## Architecture & State Layer Design
The Digital Twin state layer is managed by the new [state_manager.py](file:///d:/NexTwinAI/digital-twin/state/state_manager.py) module. It acts as an orchestrator, querying live database tables on-demand to construct a unified view of machine operations.

### Data Model (`DigitalTwinState`)
For each physical asset, the Digital Twin consolidates the following parameters:
- **`machine_id`**: Asset identifier (e.g. `M_001`).
- **`health_score`**: Asset health index (`0-100`) from the latest failure risk predictions.
- **`failure_probability`**: Live classification probability of machine failure.
- **`energy_usage`**: Live reading from power draw sensors (`kW`) or estimated loads.
- **`anomaly_score`**: Autoencoder reconstruction error or isolation forest score.
- **`status`**: Health classification: `Healthy`, `Warning`, `Critical`, or `Maintenance`.

## REST API Gateways
We created the endpoints inside [digital_twin.py](file:///d:/NexTwinAI/backend/app/api/digital_twin.py):
1. **`GET /api/v1/digital-twin/state`**
   - Retrieves the consolidated operational state for all registered machine assets.
2. **`GET /api/v1/digital-twin/machine/{machine_id}`**
   - Retrieves the detailed state for a specific machine asset, raising `404 Not Found` if the identifier is invalid.

## Integration & Implementation details
- **Import Resolution**: Because the package `digital-twin` contains a hyphen, standard imports like `import digital-twin` would fail with syntax errors. We resolved this by using Python's `importlib.util` module to load the state manager dynamically, keeping the imports clean and independent of search paths.
- **FastAPI Registration**: Registered the router in [main.py](file:///d:/NexTwinAI/backend/app/main.py) under the tag `"Digital Twin"`.
