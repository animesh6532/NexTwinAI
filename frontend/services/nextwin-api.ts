import axios, { AxiosError } from "axios";
import type {
  Alert,
  AnomalyPrediction,
  ApiErrorPayload,
  BottleneckPrediction,
  CopilotMessage,
  DigitalTwinState,
  EnergyPrediction,
  ForecastPrediction,
  HealthPrediction,
  Machine,
  Report,
  Sensor,
  SensorReading,
  SystemHealth,
  ModelsStatusResponse,
  Simulation,
  MachineCreate,
  MachineUpdate,
  AlertCreate,
  SensorCreate,
  ReadingCreate,
} from "../types/nextwin";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  timeout: 20_000,
});

export function getApiError(error: unknown) {
  const axiosError = error as AxiosError<ApiErrorPayload>;
  const detail = axiosError.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => String(item.msg || item.type || "Validation error")).join(", ");
  if (axiosError.message) return axiosError.message;
  return "Unable to reach the NexTwin AI backend.";
}

const path = (route: string) => `/api/v1${route}`;

export const nextwinApi = {
  health: async () => (await api.get<SystemHealth>(path("/health"))).data,
  machines: async () => (await api.get<Machine[]>(path("/machines"))).data,
  machine: async (machineId: string) => (await api.get<Machine>(path(`/machines/${machineId}`))).data,
  sensors: async (machineId?: string) => (await api.get<Sensor[]>(path("/sensors"), { params: { machine_id: machineId } })).data,
  readings: async (sensorId: number, limit = 100) => (await api.get<SensorReading[]>(path(`/sensors/${sensorId}/readings`), { params: { limit } })).data,
  twinState: async () => (await api.get<DigitalTwinState[]>(path("/digital-twin/state"))).data,
  machineTwin: async (machineId: string) => (await api.get<DigitalTwinState>(path(`/digital-twin/machine/${machineId}`))).data,
  anomalyHistory: async (machineId?: string) => (await api.get<AnomalyPrediction[]>(path("/anomalies/history"), { params: { machine_id: machineId, limit: 50 } })).data,
  energyHistory: async (machineId?: string) => (await api.get<EnergyPrediction[]>(path("/energy/history"), { params: { machine_id: machineId, limit: 50 } })).data,
  bottleneckHistory: async (machineId?: string) => (await api.get<BottleneckPrediction[]>(path("/bottlenecks/history"), { params: { machine_id: machineId, limit: 50 } })).data,
  reports: async () => (await api.get<Report[]>(path("/reports"), { params: { limit: 50 } })).data,
  report: async (reportId: number) => (await api.get<Report>(path(`/reports/${reportId}`))).data,
  alerts: async (params?: { machine_id?: string; is_resolved?: boolean; severity?: string }) => (await api.get<Alert[]>(path("/alerts"), { params: { ...params, limit: 100 } })).data,
  copilotHistory: async () => (await api.get<CopilotMessage[]>(path("/copilot/history"))).data,
  predictHealth: async (payload: any) => (
    await api.post<HealthPrediction>(path("/predict/health"), payload)
  ).data,
  predictAnomaly: async (payload: any) => (
    await api.post<AnomalyPrediction>(path("/predict/anomaly"), typeof payload === "string" ? { machine_id: payload } : payload)
  ).data,
  predictEnergy: async (payload: any) => (
    await api.post<EnergyPrediction>(path("/predict/energy"), typeof payload === "string" ? { machine_id: payload } : payload)
  ).data,
  predictBottleneck: async (payload: any) => (
    await api.post<BottleneckPrediction>(path("/predict/bottleneck"), typeof payload === "string" ? { machine_id: payload } : payload)
  ).data,
  predictForecast: async (machineId: string, horizon: 30 | 90) => (
    await api.post<ForecastPrediction>(path("/predict/forecast"), { machine_id: machineId, horizon })
  ).data,
  askCopilot: async (message: string) => (await api.post(path("/copilot/chat"), { prompt: message })).data,
  resolveAlert: async (alertId: number) => (await api.put<Alert>(path(`/alerts/${alertId}/resolve`), { resolved_by: 1 })).data,
  createReport: async (payload: { title: string; report_type: string; parameters?: Record<string, unknown> }) => (
    await api.post<Report>(path("/reports"), { ...payload, generated_by: 1 })
  ).data,
  modelsStatus: async () => (await api.get<ModelsStatusResponse>(path("/models/status"))).data,
  simulations: async (limit = 20) => (await api.get<Simulation[]>(path("/simulations"), { params: { limit } })).data,
  runSimulation: async (payload: { name: string; description?: string; parameters: Record<string, any> }) => (
    await api.post<Simulation>(path("/simulations"), payload)
  ).data,
  registerMachine: async (payload: MachineCreate) => (await api.post<Machine>(path("/machines"), payload)).data,
  updateMachine: async (machineId: string, payload: MachineUpdate) => (await api.put<Machine>(path(`/machines/${machineId}`), payload)).data,
  deleteMachine: async (machineId: string) => (await api.delete(path(`/machines/${machineId}`))).data,
  raiseAlert: async (payload: AlertCreate) => (await api.post<Alert>(path("/alerts"), payload)).data,
  registerSensor: async (payload: SensorCreate) => (await api.post<Sensor>(path("/sensors"), payload)).data,
  recordReading: async (payload: ReadingCreate) => (await api.post<SensorReading>(path("/sensors/readings"), payload)).data,
};
