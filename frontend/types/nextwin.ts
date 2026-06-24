export type ApiErrorPayload = {
  detail?: string | Array<Record<string, unknown>>;
};

export type SystemHealth = {
  status: string;
  database_connected: boolean;
  timestamp: string;
};

export type Machine = {
  id: string;
  name: string;
  type: string;
  operational_status: string;
  location?: string | null;
};

export type Sensor = {
  id: number;
  machine_id: string;
  name: string;
  sensor_type: string;
  unit: string;
  threshold_min?: number | null;
  threshold_max?: number | null;
  status: string;
  created_at: string;
};

export type SensorReading = {
  id: number;
  sensor_id: number;
  value: number;
  timestamp: string;
};

export type DigitalTwinState = {
  machine_id: string;
  health_score: number;
  failure_probability: number;
  energy_usage: number;
  anomaly_score: number;
  status: "Healthy" | "Warning" | "Critical" | "Maintenance" | string;
};

export type HealthPrediction = {
  machine_id?: string | null;
  failure_predicted: boolean;
  failure_probability: number;
  health_score: number;
  maintenance_priority: string;
  top_factors: string[];
  timestamp: string;
};

export type AnomalyPrediction = {
  machine_id: string;
  timestamp: string;
  anomaly_detected: boolean;
  anomaly_score: number;
  method: string;
  details?: Record<string, unknown> | null;
};

export type EnergyRecommendation = {
  action: string;
  estimated_thermal_load_savings_kw: number;
  priority: string;
};

export type EnergyPrediction = {
  machine_id?: string | null;
  timestamp: string;
  predicted_heating_load: number;
  predicted_cooling_load: number;
  predicted_energy_waste_pct: number;
  energy_optimization_score: number;
  optimization_recommendations: EnergyRecommendation[];
};

export type BottleneckPrediction = {
  machine_id: string;
  timestamp: string;
  bottleneck_risk_score: number;
  predicted_production_delay: number;
  congestion_probability: number;
  congestion_risk_detected: boolean;
};

export type ForecastPrediction = {
  machine_id: string;
  failure_risk_forecast: number[];
  energy_forecast: number[];
  throughput_forecast: number[];
};

export type Alert = {
  id: number;
  machine_id: string;
  title: string;
  message: string;
  severity: string;
  is_resolved: boolean;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: number | null;
};

export type Report = {
  id: number;
  title: string;
  report_type: string;
  parameters?: Record<string, unknown> | null;
  content: Record<string, unknown>;
  created_at: string;
  generated_by: number;
};

export type CopilotMessage = {
  id?: number;
  role?: "user" | "assistant" | string;
  message?: string;
  prompt?: string;
  response?: string;
  created_at?: string;
  timestamp?: string;
};

export type ModelStatusDetail = {
  status: "loaded" | "unloaded" | string;
  path: string;
  version: string;
  training_date: string;
  metrics: Record<string, any>;
};

export type ModelsStatusResponse = {
  health_model: ModelStatusDetail;
  energy_model: ModelStatusDetail;
  anomaly_model: ModelStatusDetail;
  bottleneck_model: ModelStatusDetail;
  forecasting_model: ModelStatusDetail;
};

export type Simulation = {
  id: number;
  name: string;
  description?: string | null;
  parameters: Record<string, any>;
  results?: Record<string, any> | null;
  created_at: string;
  run_by?: number | null;
};

export type MachineCreate = {
  id: string;
  name: string;
  type: string;
  operational_status: string;
  location?: string | null;
};

export type MachineUpdate = {
  name?: string;
  type?: string;
  operational_status?: string;
  location?: string | null;
};

export type AlertCreate = {
  machine_id: string;
  title: string;
  message: string;
  severity?: string;
};

export type SensorCreate = {
  machine_id: string;
  name: string;
  sensor_type: string;
  unit: string;
  threshold_min?: number | null;
  threshold_max?: number | null;
  status?: string;
};

export type ReadingCreate = {
  sensor_id: number;
  value: number;
  timestamp?: string | null;
};
