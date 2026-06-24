from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

from ai_engine.paths import PROCESSED_DATA_DIR, RAW_DATA_DIR, ensure_project_dirs


MACHINES = ["M_001", "M_002", "M_003"]
MACHINE_TYPES = {"M_001": "L", "M_002": "M", "M_003": "H"}


def generate_raw_data() -> None:
    ensure_project_dirs()
    rng = np.random.default_rng(42)
    date_range = pd.date_range(start="2026-03-24", end="2026-06-22", freq="h")

    utilization_rows = []
    for machine_id in MACHINES:
        base = 75.0 + 10.0 * np.sin(2 * np.pi * date_range.hour.values / 24.0)
        utilization = np.clip(base + rng.normal(0, 5, len(date_range)), 0, 100)
        for idx in np.where(rng.random(len(date_range)) < 0.015)[0]:
            length = int(rng.integers(3, 9))
            utilization[idx : idx + length] = rng.uniform(0, 5, min(length, len(date_range) - idx))

        for dt, rate in zip(date_range, utilization):
            status = "Maintenance" if rate < 5 else "Idle" if rate < 40 else "Active"
            energy = rate * 1.5 + rng.normal(10, 2)
            if status == "Maintenance":
                energy = rng.uniform(1.0, 5.0)
            elif status == "Idle":
                energy = rng.uniform(5.0, 15.0)
            utilization_rows.append(
                {
                    "timestamp": dt,
                    "machine_id": machine_id,
                    "utilization_rate": round(float(rate), 2),
                    "operator_id": f"OP_{int(rng.integers(101, 106))}",
                    "operational_status": status,
                    "energy_draw_kw": round(float(energy), 2),
                }
            )

    production_rows = []
    for dt in date_range:
        for machine_id in MACHINES:
            target = 120.0 if machine_id != "M_003" else 100.0
            shift_efficiency = 0.95 if 6 <= dt.hour < 22 else 0.85
            actual = np.clip(rng.normal(target * shift_efficiency, target * 0.08), 0, target * 1.1)
            defect_count = int(rng.poisson(2.0 * actual / target + (4.0 if machine_id == "M_003" else 1.5)))
            production_rows.append(
                {
                    "timestamp": dt,
                    "machine_id": machine_id,
                    "target_quantity": int(target),
                    "actual_quantity": round(float(actual), 2),
                    "defect_count": defect_count,
                    "cycle_time_s": round(float(3600.0 / max(actual, 1.0)), 2),
                    "oee": round(float((actual / target) * max(0.8, 1 - defect_count / max(actual, 1))), 4),
                }
            )

    sensor_rows = []
    for machine_id in MACHINES:
        for dt in date_range:
            temp = 60.0 + 5.0 * np.sin(2 * np.pi * dt.hour / 24.0) + rng.normal(0, 3)
            vib = np.clip(1.8 + rng.normal(0, 0.4), 0.1, 10.0)
            noise = np.clip(72.0 + rng.normal(0, 2), 40, 120)
            pressure = np.clip(4.2 + rng.normal(0, 0.5), 0.5, 10.0)
            freq = np.clip(520 + rng.normal(0, 45) + (noise - 72.0) * 5, 100, 1500)
            amp = np.clip(0.06 + rng.normal(0, 0.015) + (vib - 1.8) * 0.01, 0.005, 0.3)
            anomaly = int(vib > 4.5 or temp > 85.0 or noise > 92.0 or pressure > 6.2)
            if rng.random() < 0.01:
                anomaly = 1
                vib += rng.uniform(2.5, 4.0)
                noise += rng.uniform(15, 25)
                amp += rng.uniform(0.08, 0.15)
                temp += rng.uniform(10, 20)
            sensor_rows.append(
                {
                    "timestamp": dt,
                    "machine_id": machine_id,
                    "vibration_mm_s": round(float(vib), 3),
                    "temperature_c": round(float(temp), 2),
                    "pressure_bar": round(float(pressure), 2),
                    "noise_level_db": round(float(noise), 1),
                    "sound_frequency_hz": round(float(freq), 1),
                    "sound_amplitude": round(float(amp), 4),
                    "anomaly_label": anomaly,
                }
            )

    RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DATA_DIR / "machine_sounds").mkdir(parents=True, exist_ok=True)
    pd.DataFrame(utilization_rows).to_csv(RAW_DATA_DIR / "machine_utilization.csv", index=False)
    pd.DataFrame(production_rows).to_csv(RAW_DATA_DIR / "production_metrics.csv", index=False)
    pd.DataFrame(sensor_rows).to_csv(RAW_DATA_DIR / "machine_sounds" / "synthetic_factory_data.csv", index=False)


def prepare_processed_data(force: bool = False) -> None:
    ensure_project_dirs()
    required_raw = [
        RAW_DATA_DIR / "machine_utilization.csv",
        RAW_DATA_DIR / "production_metrics.csv",
        RAW_DATA_DIR / "machine_sounds" / "synthetic_factory_data.csv",
    ]
    if force or any(not path.exists() for path in required_raw):
        generate_raw_data()

    sensors = pd.read_csv(required_raw[2], parse_dates=["timestamp"])
    utilization = pd.read_csv(required_raw[0], parse_dates=["timestamp"])
    production = pd.read_csv(required_raw[1], parse_dates=["timestamp"])

    cleaned = sensors.drop_duplicates().ffill().bfill()
    cleaned.to_csv(PROCESSED_DATA_DIR / "cleaned_synthetic_factory_data.csv", index=False)

    joined = (
        cleaned.merge(utilization, on=["timestamp", "machine_id"], how="left")
        .merge(production, on=["timestamp", "machine_id"], how="left")
        .sort_values(["machine_id", "timestamp"])
    )
    joined["defect_count"] = joined["defect_count"].fillna(0)
    joined["energy_draw_kw"] = joined["energy_draw_kw"].fillna(joined["energy_draw_kw"].median())
    joined["utilization_rate"] = joined["utilization_rate"].fillna(75.0)
    joined["target_quantity"] = joined["target_quantity"].fillna(100.0)
    joined["actual_quantity"] = joined["actual_quantity"].fillna(joined["target_quantity"] * 0.9)
    
    # Advanced engineered features for bottleneck detection
    rng = np.random.default_rng(42)
    joined["queue_length"] = np.clip(
        (joined["utilization_rate"] / 100.0) * 8.0 
        + joined["defect_count"] * 0.8 
        + joined["vibration_mm_s"] * 0.5 
        + rng.poisson(1, len(joined)), 
        0, 20
    ).round().astype(int)
    
    joined["downtime_minutes"] = np.where(
        joined["operational_status"] == "Maintenance", 
        45.0 + joined["vibration_mm_s"] * 10, 
        np.where(
            joined["operational_status"] == "Idle", 
            15.0 + joined["vibration_mm_s"] * 2, 
            np.clip(joined["vibration_mm_s"] * 1.5, 0, 10)
        )
    ).round(2)
    
    joined["throughput_rate"] = joined["actual_quantity"].round(2)
    joined["cycle_time"] = joined["cycle_time_s"].round(2)
    joined["defect_rate"] = (joined["defect_count"] / np.maximum(joined["actual_quantity"], 1.0)).round(4)

    joined["bottleneck_severity_index"] = np.clip(
        (joined["utilization_rate"] / 100.0) * 3.0
        + joined["queue_length"] * 0.2
        + joined["downtime_minutes"] * 0.02
        + joined["defect_rate"] * 5.0
        + joined["vibration_mm_s"] * 0.5
        + np.maximum(0, joined["temperature_c"] - 75.0) * 0.08,
        0,
        10,
    )
    joined.to_csv(PROCESSED_DATA_DIR / "engineered_mfg_bottleneck.csv", index=False)

    health = pd.DataFrame(
        {
            "type": joined["machine_id"].map(MACHINE_TYPES).fillna("M"),
            "air_temperature": joined["temperature_c"] + 273.15 - 10.0,
            "process_temperature": joined["temperature_c"] + 273.15,
            "rotational_speed": np.clip(1200 + joined["utilization_rate"] * 8 - joined["vibration_mm_s"] * 35, 800, 3000),
            "torque": np.clip(35 + joined["vibration_mm_s"] * 8 + joined["defect_count"], 5, 100),
            "tool_wear": np.clip(joined.groupby("machine_id").cumcount() % 240, 0, 240),
            "machine_health_score": np.clip(100 - joined["bottleneck_severity_index"] * 5 - joined["anomaly_label"] * 20, 0, 100),
            "failure_risk_index": np.clip(
                joined["anomaly_label"] * 0.5 + joined["defect_count"] * 0.05 + joined["vibration_mm_s"] * 0.03,
                0,
                1,
            ),
        }
    )
    health["machine_failure"] = (
        (health["failure_risk_index"] > 0.45)
        | (health["tool_wear"] > 210)
        | (health["machine_health_score"] < 45)
    ).astype(int)
    health.to_csv(PROCESSED_DATA_DIR / "engineered_machine_health.csv", index=False)

    rng = np.random.default_rng(7)
    n = max(768, len(joined) // 3)
    relative_compactness = rng.uniform(0.62, 0.98, n)
    surface_area = rng.uniform(514.5, 808.5, n)
    wall_area = rng.uniform(245.0, 416.5, n)
    roof_area = rng.uniform(110.25, 220.5, n)
    overall_height = rng.choice([3.5, 7.0], n)
    orientation = rng.integers(2, 6, n)
    glazing_area = rng.choice([0.0, 0.1, 0.25, 0.4], n)
    glazing_dist = rng.integers(0, 6, n)
    heating_load = (
        surface_area * 0.035
        + wall_area * 0.025
        + overall_height * 2.2
        + glazing_area * 18.0
        - relative_compactness * 10.0
        + rng.normal(0, 1.5, n)
    )
    cooling_load = (
        surface_area * 0.03
        + roof_area * 0.018
        + overall_height * 2.5
        + glazing_area * 24.0
        + orientation * 0.4
        + rng.normal(0, 1.5, n)
    )
    total_load = heating_load + cooling_load
    waste = np.clip(5 + glazing_area * 30 + (overall_height > 5).astype(float) * 8 + rng.normal(0, 1.2, n), 0, 40)
    optimization = np.clip(100 - waste * 2.2 - total_load * 0.15, 0, 100)
    energy = pd.DataFrame(
        {
            "relative_compactness": relative_compactness,
            "surface_area": surface_area,
            "wall_area": wall_area,
            "roof_area": roof_area,
            "overall_height": overall_height,
            "orientation": orientation,
            "glazing_area": glazing_area,
            "glazing_area_distribution": glazing_dist,
            "heating_load": heating_load,
            "cooling_load": cooling_load,
            "total_load": total_load,
            "energy_waste_pct": waste,
            "energy_optimization_score": optimization,
        }
    )
    energy.to_csv(PROCESSED_DATA_DIR / "engineered_energy.csv", index=False)


if __name__ == "__main__":
    force = "--force" in sys.argv
    prepare_processed_data(force=force)
    print(f"Processed datasets are ready in {PROCESSED_DATA_DIR}")
