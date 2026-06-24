import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { nextwinApi } from "../services/nextwin-api";
import type { 
  Machine, 
  MachineCreate, 
  MachineUpdate, 
  AlertCreate, 
  SensorCreate, 
  ReadingCreate 
} from "../types/nextwin";

export const queryKeys = {
  health: ["health"] as const,
  machines: ["machines"] as const,
  sensors: (machineId?: string) => ["sensors", machineId || "all"] as const,
  readings: (sensorId?: number) => ["readings", sensorId || "none"] as const,
  twin: ["digital-twin"] as const,
  machineTwin: (machineId?: string) => ["digital-twin", machineId || "none"] as const,
  anomalyHistory: (machineId?: string) => ["anomaly-history", machineId || "all"] as const,
  energyHistory: (machineId?: string) => ["energy-history", machineId || "all"] as const,
  bottleneckHistory: (machineId?: string) => ["bottleneck-history", machineId || "all"] as const,
  reports: ["reports"] as const,
  alerts: ["alerts"] as const,
  copilotHistory: ["copilot-history"] as const,
};

export function useCoreFactoryData() {
  const health = useQuery({ queryKey: queryKeys.health, queryFn: nextwinApi.health, refetchInterval: 30_000 });
  const machines = useQuery({ queryKey: queryKeys.machines, queryFn: nextwinApi.machines, refetchInterval: 30_000 });
  const twin = useQuery({ queryKey: queryKeys.twin, queryFn: nextwinApi.twinState, refetchInterval: 20_000 });
  const alerts = useQuery({ queryKey: queryKeys.alerts, queryFn: () => nextwinApi.alerts(), refetchInterval: 20_000 });
  const reports = useQuery({ queryKey: queryKeys.reports, queryFn: nextwinApi.reports, refetchInterval: 60_000 });
  return { health, machines, twin, alerts, reports };
}

export function useMachine(machineId?: string) {
  const machine = useQuery({
    queryKey: ["machine", machineId],
    queryFn: () => nextwinApi.machine(machineId || ""),
    enabled: Boolean(machineId),
  });
  const twin = useQuery({
    queryKey: queryKeys.machineTwin(machineId),
    queryFn: () => nextwinApi.machineTwin(machineId || ""),
    enabled: Boolean(machineId),
    refetchInterval: 20_000,
  });
  const sensors = useQuery({
    queryKey: queryKeys.sensors(machineId),
    queryFn: () => nextwinApi.sensors(machineId),
    enabled: Boolean(machineId),
  });
  return { machine, twin, sensors };
}

export function usePredictionMutations() {
  const queryClient = useQueryClient();
  return {
    health: useMutation({ mutationFn: (payload: any) => nextwinApi.predictHealth(payload) }),
    anomaly: useMutation({
      mutationFn: (payload: any) => nextwinApi.predictAnomaly(payload),
      onSuccess: (_, payload) => {
        const machineId = typeof payload === "string" ? payload : payload?.machine_id;
        if (machineId) queryClient.invalidateQueries({ queryKey: queryKeys.anomalyHistory(machineId) });
      },
    }),
    energy: useMutation({
      mutationFn: (payload: any) => nextwinApi.predictEnergy(payload),
      onSuccess: (_, payload) => {
        const machineId = typeof payload === "string" ? payload : payload?.machine_id;
        if (machineId) queryClient.invalidateQueries({ queryKey: queryKeys.energyHistory(machineId) });
      },
    }),
    bottleneck: useMutation({
      mutationFn: (payload: any) => nextwinApi.predictBottleneck(payload),
      onSuccess: (_, payload) => {
        const machineId = typeof payload === "string" ? payload : payload?.machine_id;
        if (machineId) queryClient.invalidateQueries({ queryKey: queryKeys.bottleneckHistory(machineId) });
      },
    }),
    forecast: useMutation({ mutationFn: ({ machineId, horizon }: { machineId: string; horizon: 30 | 90 }) => nextwinApi.predictForecast(machineId, horizon) }),
  };
}

export function useModelsStatus() {
  return useQuery({
    queryKey: ["models-status"],
    queryFn: nextwinApi.modelsStatus,
    refetchInterval: 30_000,
  });
}

export function useSimulations() {
  return useQuery({
    queryKey: ["simulations"],
    queryFn: () => nextwinApi.simulations(),
    refetchInterval: 30_000,
  });
}

export function useRunSimulation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.runSimulation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["simulations"] });
    },
  });
}

export function useRegisterMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.registerMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    },
  });
}

export function useUpdateMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ machineId, payload }: { machineId: string; payload: MachineUpdate }) => 
      nextwinApi.updateMachine(machineId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["machine", variables.machineId] });
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    },
  });
}

export function useDeleteMachine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.deleteMachine,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.machines });
    },
  });
}

export function useRaiseAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.raiseAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useRegisterSensor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.registerSensor,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sensors(variables.machine_id) });
    },
  });
}

export function useRecordReading() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: nextwinApi.recordReading,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.readings(variables.sensor_id) });
    },
  });
}
