# NexTwin AI — Frontend-Backend Feature Matrix & Gap Audit

This document presents a comprehensive audit of the backend API endpoints and their corresponding integration status within the Next.js frontend codebase, highlighting integration gaps and outlining the plan to upgrade the platform to a premium Industrial AI Operating System.

---

## 1. Implemented Backend Endpoints in UI

* **`GET /api/v1/health`**: Connected to System Status diagnostics in the navigation layout bar.
* **`GET /api/v1/machines`**: Connected to dashboard stats and basic asset pages.
* **`GET /api/v1/machines/{machine_id}`**: Connected to dynamic dynamic machine detail pages.
* **`GET /api/v1/sensors`**: Displays sensor names on machine details pages.
* **`GET /api/v1/sensors/{id}/readings`**: Retrieves sensor readings for telemetry display.
* **`GET /api/v1/digital-twin/state`**: Fetches consolidated OEE health and load statuses.
* **`GET /api/v1/digital-twin/machine/{machine_id}`**: Retrieves single machine twin states.
* **`GET /api/v1/anomalies/history`**: Retrieves historical isolation forest alerts.
* **`GET /api/v1/energy/history`**: Fetches past cooling and heating predictions.
* **`GET /api/v1/bottlenecks/history`**: Fetches production delay metrics.
* **`GET /api/v1/reports`** / `GET /api/v1/reports/{id}`: Exposes report registries and content parameters.
* **`POST /api/v1/reports`**: Generates new PDF/JSON factory audits.
* **`GET /api/v1/alerts`**: Lists alerts on the main alerts log.
* **`PUT /api/v1/alerts/{id}/resolve`**: Marks notifications as resolved in the database.
* **`GET /api/v1/models/status`**: Powers the Model Registry status dashboard.
* **`GET /api/v1/simulations`** / `POST /api/v1/simulations`: Connected to What-If simulation center scenario testing.

---

## 2. Partially Implemented Backend Endpoints

* **`POST /api/v1/predict/health`**: Used to calculate OEE remaining useful life (RUL), but only passes `machine_id` and `type` from the UI. The model's raw inputs (air temperature, process temperature, speed, torque, tool wear) are completely omitted from the user interface and cannot be adjusted.
* **`POST /api/v1/predict/anomaly`**: Evaluates telemetry inputs, but only passes `machine_id` and relies on default values for vibration, temperature, acoustic frequencies, and standard methods.
* **`POST /api/v1/predict/energy`**: Evaluates building envelope variables, but only passes `machine_id`, omitting compactness, areas, heights, orientation, and glazing ratios.
* **`POST /api/v1/predict/bottleneck`**: Predicts line congestion, but only passes `machine_id` and ignores cycle times, defect rates, and utilization rates.
* **`POST /api/v1/predict/forecast`**: Predicts 30/90-day time-series forecasts, but has basic visualization grids.

---

## 3. Not Implemented Backend Endpoints

* **`POST /api/v1/machines`**: Endpoint to register a new physical machine asset is not exposed anywhere in the UI.
* **`PUT /api/v1/machines/{machine_id}`**: Endpoint to update machine metadata, location details, or grade status is not exposed.
* **`DELETE /api/v1/machines/{machine_id}`**: Endpoint to decommission and delete a machine asset is not exposed.
* **`POST /api/v1/alerts`**: Endpoint to manually trigger a custom system alert or warning threshold breach is not exposed.
* **`POST /api/v1/sensors`**: Endpoint to register a new physical sensor module on a machine is not exposed.
* **`POST /api/v1/sensors/readings`**: Endpoint to stream telemetry readings directly to sensors is not exposed in the UI.

---

## 4. Broken API Integrations

* **`POST /api/v1/copilot/chat` (Conversational Message Payload Mismatch)**:
  * **Discrepancy:** The frontend calls `askCopilot(message)` passing `{ message: "..." }` as the request body. However, the FastAPI backend `ChatRequest` schema expects `{ prompt: "..." }`. This results in `422 Unprocessable Entity` errors when chatting with the Copilot.
  * **Fix:** Modify the request payload in `nextwin-api.ts` to pass `{ prompt: message }`.
* **`GET /api/v1/copilot/history` (History Prompt Key Mismatch)**:
  * **Discrepancy:** The backend returns conversation history records as `{ prompt: "...", response: "..." }`. The frontend tries to render `{ message: "...", response: "..." }`. As a result, the user's sent prompts appear empty in the chat logs UI.
  * **Fix:** Update the message thread component to evaluate `item.prompt || item.message`.

---

## 5. Missing Pages & Visualizations

1. **Sensors Center (Telemetry Dashboard)**: Expose `GET /api/v1/sensors` and let users add readings (`POST /api/v1/sensors/readings`) with real-time dial gauges and timeline diagnostics.
2. **Machine Operations Controls**: Add controls inside the Asset Catalog or Detail Pages to create (`POST /machines`), update (`PUT /machines`), and delete (`DELETE /machines`) assets.
3. **Simulation Center Scenario builders**: Build scenario editors for both Machinery Speed/Wear tests and Energy Envelope thermal efficiency changes with visual comparisons.
4. **Interactive Topology Layout relationships**: Spatially arrange machine cards on the Digital Twin page with visible connection ports, input/output wires, and multi-indicator displays.

---

## 6. Premium Upgrade Checklist

### Digital Twin Page
- [ ] Render connecting ports and port pins on nodes.
- [ ] Display Health, Load, Failure Risk, and Anomaly Score simultaneously.
- [ ] Add flow indicator directions.
- [ ] Add sidebar displaying live system metrics.

### 3D Machine Explorer
- [ ] Implement rotation, zooming, and panning.
- [ ] Add structural exploded view offsets.
- [ ] Overlay color-coded material strain visual highlights (Health, Failure Risk, Anomaly, Energy load).

### Simulation Center
- [ ] Build interactive sliders for RPM, Torque, Tooling, and Compactness factors.
- [ ] Graph simulated predictions side-by-side with baseline metrics.
- [ ] Expose Simulation History results drawer.

### AI Copilot (Floating Assistant)
- [ ] Pulse AI assistant bubble on the bottom right.
- [ ] Expose quick action selectors:
  * Factory Summary
  * Suggested Actions
  * Risk Insights
  * Maintenance Insights
  * Root Cause Analysis

### Predictive Centers (Maintenance, Anomaly, Energy, Bottleneck, Forecast)
- [ ] Expose input sliders to test parameters (`process_temperature`, `glazing_area`, `utilization_rate`, etc.).
- [ ] Add interactive charts for Failure Forecasts and Energy Loads.
