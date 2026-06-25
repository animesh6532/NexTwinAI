"""
NexTwin AI — sensor_reader.py
=============================
Simulates industrial machinery sensors (Vibration, Temperature, Pressure, Acoustic, Energy).
Generates telemetry aligned with machine cycles and custom error states.

Author: Principal Industrial AI Architect & Edge AI Engineer
"""

import random
import time
import math

class SensorReader:
    def __init__(self, machine_id: str):
        self.machine_id = machine_id
        self.cycle_step = 0
        
    def read_sensors(self, state_preset: str = "Nominal") -> dict:
        """
        Samples physical/acoustic machine sensors based on state presets:
        Presets: Nominal, Warning, Critical, Emergency
        """
        self.cycle_step += 1
        # Add sinusoidal machine load factor based on cycle steps (e.g. representing spindle load cycles)
        cycle_factor = math.sin(self.cycle_step * 0.1) * 0.15 + 1.0
        
        # Default nominal metrics
        vib = random.uniform(1.2, 2.5) * cycle_factor
        temp = random.uniform(55.0, 70.0) * cycle_factor
        press = random.uniform(3.8, 4.8) * cycle_factor
        noise = random.uniform(68.0, 80.0) * cycle_factor
        freq = random.uniform(450.0, 600.0) * cycle_factor
        amp = random.uniform(0.04, 0.08) * cycle_factor
        energy = random.uniform(40.0, 85.0) * cycle_factor
        
        # Inject offsets based on preset states
        if state_preset == "Warning":
            # Vibration instability or minor overheat
            vib = random.uniform(3.2, 4.4)
            temp = random.uniform(75.0, 84.0)
            noise = random.uniform(85.0, 92.0)
            amp = random.uniform(0.12, 0.18)
            energy = random.uniform(90.0, 115.0)
            
        elif state_preset == "Critical":
            # Major friction, wear, or leakage
            vib = random.uniform(4.6, 5.8)
            temp = random.uniform(86.0, 95.0)
            press = random.uniform(5.5, 6.4) if random.choice([True, False]) else random.uniform(2.2, 3.2)
            noise = random.uniform(93.0, 102.0)
            amp = random.uniform(0.20, 0.28)
            energy = random.uniform(120.0, 145.0)
            
        elif state_preset == "Emergency":
            # Direct catastrophic crash condition
            vib = random.uniform(6.5, 12.0)
            temp = random.uniform(98.0, 125.0)
            press = random.uniform(7.0, 11.0) if random.choice([True, False]) else random.uniform(0.5, 1.8)
            noise = random.uniform(105.0, 120.0)
            amp = random.uniform(0.32, 0.55)
            energy = random.uniform(148.0, 185.0)
            
        return {
            "vibration_mm_s": round(vib, 3),
            "temperature_c": round(temp, 2),
            "pressure_bar": round(press, 2),
            "noise_level_db": round(noise, 1),
            "sound_frequency_hz": round(freq, 1),
            "sound_amplitude": round(amp, 4),
            "energy_draw_kw": round(energy, 2),
            "timestamp": time.time()
        }
