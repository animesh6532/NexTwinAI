import os
import numpy as np
import pandas as pd

def generate_data():
    print("Initializing synthetic data generation for NexTwin AI...")
    
    np.random.seed(42)
    
    # 90 days of hourly data
    date_range = pd.date_range(start="2026-03-24", end="2026-06-22", freq="h")
    n_hours = len(date_range)
    
    raw_dir = os.path.join("datasets", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(os.path.join(raw_dir, "machine_sounds"), exist_ok=True)
    
    # -----------------
    # 1. Machine Utilization Data
    # -----------------
    print("Generating machine_utilization.csv...")
    machines = ["M_001", "M_002", "M_003"]
    util_records = []
    
    for machine in machines:
        # Base utilization rate with daily sine wave pattern
        base_util = 75.0 + 10.0 * np.sin(2 * np.pi * date_range.hour.values / 24.0)
        noise = np.random.normal(0, 5, n_hours)
        util_rate = np.clip(base_util + noise, 0, 100)
        
        # Introduce occasional maintenance periods (low utilization)
        maint_probs = np.random.rand(n_hours)
        maint_indices = np.where(maint_probs < 0.015)[0]
        for idx in maint_indices:
            # maintenance lasts 3-8 hours
            m_len = np.random.randint(3, 9)
            util_rate[idx:idx+m_len] = np.random.uniform(0, 5, min(m_len, n_hours - idx))
            
        for i, dt in enumerate(date_range):
            rate = float(util_rate[i])
            # Determine status based on utilization
            if rate < 5.0:
                status = "Maintenance"
            elif rate < 40.0:
                status = "Idle"
            else:
                status = "Active"
                
            # Assign operator
            operator = f"OP_{np.random.randint(101, 106)}"
            # Energy draw correlated with utilization
            energy = rate * 1.5 + np.random.normal(10, 2)
            if status == "Maintenance":
                energy = np.random.uniform(1.0, 5.0)
            elif status == "Idle":
                energy = np.random.uniform(5.0, 15.0)
                
            util_records.append({
                "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "machine_id": machine,
                "utilization_rate": round(rate, 2),
                "operator_id": operator,
                "operational_status": status,
                "energy_draw_kw": round(energy, 2)
            })
            
    df_util = pd.DataFrame(util_records)
    util_path = os.path.join(raw_dir, "machine_utilization.csv")
    df_util.to_csv(util_path, index=False)
    print(f"Machine utilization generated. Shape: {df_util.shape}")
    
    # -----------------
    # 2. Production Metrics Data
    # -----------------
    print("Generating production_metrics.csv...")
    lines = ["Line_A", "Line_B"]
    prod_records = []
    
    for line in lines:
        target_qty = 120.0
        # Line B is slightly slower but has fewer defects
        if line == "Line_B":
            target_qty = 100.0
            
        for dt in date_range:
            # Actual quantity is a function of target with random efficiency drops
            hour_val = dt.hour
            # Diurnal efficiency fluctuations (lower productivity during night shift)
            shift_efficiency = 0.95 if (6 <= hour_val < 22) else 0.85
            base_actual = target_qty * shift_efficiency
            actual_qty = np.clip(np.random.normal(base_actual, target_qty * 0.08), 0, target_qty * 1.1)
            
            # Defect count (higher when running faster/over target)
            speed_factor = actual_qty / target_qty
            defect_mean = 2.0 * speed_factor + (4.0 if line == "Line_A" else 1.5)
            defect_cnt = int(np.random.poisson(defect_mean))
            
            # oee score calculation (simulated composite)
            avail = np.random.uniform(0.85, 0.99)
            perf = np.clip(actual_qty / target_qty, 0, 1.0)
            qual = np.clip((actual_qty - defect_cnt) / max(actual_qty, 1), 0, 1.0)
            oee = avail * perf * qual
            
            # Average cycle time per unit in seconds
            cycle_time = (3600.0 / actual_qty) + np.random.normal(0, 2) if actual_qty > 0 else 0
            
            prod_records.append({
                "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "line_id": line,
                "target_quantity": int(target_qty),
                "actual_quantity": round(float(actual_qty), 2),
                "defect_count": int(defect_cnt),
                "cycle_time_s": round(float(cycle_time), 2),
                "oee": round(float(oee), 4)
            })
            
    df_prod = pd.DataFrame(prod_records)
    prod_path = os.path.join(raw_dir, "production_metrics.csv")
    df_prod.to_csv(prod_path, index=False)
    print(f"Production metrics generated. Shape: {df_prod.shape}")
    
    # -----------------
    # 3. Synthetic Factory Data (Acoustic Sensor logs)
    # -----------------
    print("Generating synthetic_factory_data.csv...")
    fac_records = []
    
    for machine in machines:
        # Vibration (mm/s), Temp (C), Pressure (bar), Noise Level (dB), Sound Freq (Hz), Sound Amp
        for dt in date_range:
            # Base values
            base_temp = 60.0 + 5.0 * np.sin(2 * np.pi * dt.hour / 24.0)
            base_vib = 1.8
            base_noise = 72.0
            base_pressure = 4.2
            
            # Add normal noise
            temp = base_temp + np.random.normal(0, 3)
            vib = np.clip(base_vib + np.random.normal(0, 0.4), 0.1, 10.0)
            noise = np.clip(base_noise + np.random.normal(0, 2), 40, 120)
            press = np.clip(base_pressure + np.random.normal(0, 0.5), 0.5, 10.0)
            
            freq = np.clip(520 + np.random.normal(0, 45) + (noise - base_noise) * 5, 100, 1500)
            amp = np.clip(0.06 + np.random.normal(0, 0.015) + (vib - base_vib) * 0.01, 0.005, 0.3)
            
            # Determine anomalies (around 2% rate)
            anomaly = 0
            # Condition-based anomalies (thresholds exceeded)
            if (vib > 4.5) or (temp > 85.0) or (noise > 92.0) or (press > 6.2):
                anomaly = 1
                
            # Random spontaneous anomalies (no obvious threshold breach in base sensor values)
            if np.random.rand() < 0.01:
                anomaly = 1
                vib += np.random.uniform(2.5, 4.0)
                noise += np.random.uniform(15, 25)
                amp += np.random.uniform(0.08, 0.15)
                temp += np.random.uniform(10, 20)
                
            fac_records.append({
                "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
                "machine_id": machine,
                "vibration_mm_s": round(float(vib), 3),
                "temperature_c": round(float(temp), 2),
                "pressure_bar": round(float(press), 2),
                "noise_level_db": round(float(noise), 1),
                "sound_frequency_hz": round(float(freq), 1),
                "sound_amplitude": round(float(amp), 4),
                "anomaly_label": int(anomaly)
            })
            
    df_fac = pd.DataFrame(fac_records)
    fac_path = os.path.join(raw_dir, "machine_sounds", "synthetic_factory_data.csv")
    df_fac.to_csv(fac_path, index=False)
    print(f"Synthetic factory data generated. Shape: {df_fac.shape}")
    print("All synthetic datasets generated successfully!")

if __name__ == "__main__":
    generate_data()
