# Frontend & Backend Feature Matrix Audit

This document presents the detailed audit of all frontend pages and backend endpoints for the NexTwin AI Industrial AI Operating System, highlighting gaps, partially connected features, and broken connections.

---

## 1. Feature Matrix Overview

| Feature Area | Frontend Component / Page | Backend Endpoint | Status | Notes / Gaps |
| :--- | :--- | :--- | :--- | :--- |
| **Machine Management** | `/machines` | `GET /api/v1/machines`<br>`POST /api/v1/machines`<br>`PUT /api/v1/machines/{id}`<br>`DELETE /api/v1/machines/{id}` | **Partially Connected** | **Gaps**: Missing "Add Machine" button, Create/Edit modals, and Decommission confirmation on `/machines` page. Changes don't update instantly in the grid. |
| **Digital Twin Layout** | `/digital-twin` | `GET /api/v1/digital-twin/state`<br>`GET /api/v1/machines` | **Partially Connected** | **Gaps**: Static React Flow layout; missing view selector (Factory Floor, Production Line, Relationships, Status); clicking nodes does not navigate to Machine Details. |
| **Machine Details** | `/machines/[machineId]` | `GET /api/v1/machines/{id}`<br>`GET /api/v1/digital-twin/machine/{id}`<br>`GET /api/v1/sensors` | **Partially Connected** | **Gaps**: Tabs are generic (`3D`, `Twin`, `Analytics`). Missing specified tabs (`Overview`, `Health`, `Energy`, `Anomalies`, `Forecasts`, `Digital Twin`). |
| **Simulation Center** | `/simulation-center` | `GET /api/v1/simulations`<br>`POST /api/v1/simulations` | **Partially Connected** | **Gaps**: Missing "Production Simulation" (bottlenecks) on both UI and backend simulation service; missing Comparison View. |
| **Factory Command Center** | `/command-center` | `GET /api/v1/health`<br>`GET /api/v1/alerts`<br>`GET /api/v1/reports` | **Partially Connected** | **Gaps**: Missing active simulation counters, energy optimization delta charts, and model registry summaries in a premium Bento grid. |
| **AI Copilot Agent** | Floating Widget | `POST /api/v1/copilot/chat`<br>`GET /api/v1/copilot/history` | **Partially Connected / Broken** | **Gaps**: Ollama dependency causes runtime failures. Chat is simple. Missing greeting screen, suggested floor queries, quick actions, and 1000+ QA knowledge base search. |

---

## 2. Detailed Audit & Gap Analysis

### Implemented Features
- **Gateway Metrics**: Core system health check `/api/v1/health` and live database connectivity indicators.
- **Incident Streams**: Real-time alerts fetching, sorting, and manual resolution status updating `/api/v1/alerts/{id}/resolve`.
- **Reports Console**: Dynamic report generation and JSON payload downloads `/api/v1/reports`.
- **Model Status Registry**: Static versioning dashboard displaying active accuracy coefficients `/api/v1/models/status`.
- **Edge Sensors console**: Telemetry console for manually recording metrics and updating local conveyor sensors `/api/v1/sensors`.

### Missing Features
1. **Machine Management on Catalog**:
   - Missing **Create Machine Modal** and **Edit Machine Modal** triggered via active buttons on the `/machines` page.
   - Missing **Decommission Confirmation Modal** preventing accidental node deletions.
   - Missing automatic React Query cache invalidation to update the machine inventory instantly.
2. **Four-View React Flow Digital Twin**:
   - Missing toggles to switch between:
     - **Factory Floor View** (spatial nodes coordinates).
     - **Production Line View** (logical sequence sequence flow).
     - **Machine Relationship View** (sensor-to-machine connectivity links).
     - **Machine Status View** (colorized health alerts overlay).
   - Missing node-click navigation `router.push('/machines/' + node.id)`.
3. **Structured Tab System in Machine Details**:
   - Needs 6 specific tabs: `Overview`, `Health`, `Energy`, `Anomalies`, `Forecasts`, `Digital Twin`.
4. **Production Simulation**:
   - Missing simulation option for Bottleneck/Production constraints (modifying cycle time, queue lengths, and defect ratios) and comparing baseline against simulated output congestion risks.
5. **Deterministic AI Copilot**:
   - Missing `industrial_knowledge_base.json` (1000+ Q&As across 14 categories).
   - Missing semantic similarity QA matcher utilizing lightweight offline bag-of-words / TF-IDF cosine similarity.
   - Missing greeting welcome screen, quick action links, suggested questions, and conversation memory.

### Partially Connected Features
- **Simulation Lab**: Currently supports only Machinery and Energy what-if runs; missing bottleneck simulations.
- **Machines Overview**: Machine details displays metadata but doesn't map to the 6 dedicated tabs requested.
- **Floating Copilot**: UI has no welcome menu, quick commands, or clean chat bubbles.

### Broken API Connections
- **Ollama/LangChain Copilot**: Fails dynamically due to the local Ollama daemon requirement. FALLBACK is used, which lacks general manufacturing knowledge. It must be replaced by a deterministic search engine matched against `industrial_knowledge_base.json` combined with live DB status queries.

### Missing Digital Twin Capabilities
- Animated edge flows that speed up or change color based on actual telemetry values.
- Node detail hover cards displaying OEE, temperature, vibration, and energy parameters in real-time.

### Missing Machine Management Capabilities
- Instant validation of new machine IDs to prevent conflicts.
- Success notifications (success toast message or notification alerts).

### Missing AI Copilot Capabilities
- Intent classification for greeting keywords ("Hi", "Hello") and system diagnostics queries.

---

## 3. Action Plan & Code Changes

### Step 1: Create local industrial knowledge base
- Generate `industrial_knowledge_base.json` inside `backend/app/utils` containing exactly 1,000+ QA pairs across the 14 required categories.

### Step 2: Implement Deterministic NLP Search Engine in Copilot Service
- Replace `copilot_service.py` to:
  1. Remove LangChain and Ollama imports.
  2. Implement `TfidfVectorizer` and `cosine_similarity` using `scikit-learn` to index and search `industrial_knowledge_base.json`.
  3. Support intent matching for greetings and live DB diagnostics (e.g. factory OEE averages, active alerts count, high failure risk assets).
  4. Retain conversation context (history).

### Step 3: Upgrade Machine Management
- Update `/machines` page to display an "Add Machine" button, Create Modal, Edit Modal, and Delete Confirmation Modal. Use backend routes (`GET`, `POST`, `PUT`, `DELETE`).
- Add form validation and React Query invalidation for instant updates.

### Step 4: Expand React Flow Digital Twin Views
- Update `/digital-twin/page.tsx` with a view selector (Factory Floor, Production Line, Machine Relationships, Machine Status).
- Implement node click triggers to open machine details and show animated data flows.

### Step 5: Structure Tabbed Machine Details Page
- Refactor `/machines/[machineId]/page.tsx` into 6 tabs: `Overview`, `Health`, `Energy`, `Anomalies`, `Forecasts`, `Digital Twin`.

### Step 6: Expand Simulation Lab
- Add "Production Simulation" (bottlenecks) on the backend `SimulationService` and the `/simulation-center` page UI.
- Add split comparison layout.
