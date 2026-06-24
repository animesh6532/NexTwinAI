"""
NexTwin AI — edge_inference.py (Raspberry Pi)
==============================================
Simulates a Raspberry Pi edge gateway. Samples physical sensor telemetry (vibration, 
temperature, noise, pressure), runs a lightweight local edge classifier (predictive maintenance),
and dispatches logs to the central backend. Integrates mock MQTT and HTTP protocols.

Author: Principal AI Architect & Industrial IoT Expert
"""

import time
import random
import requests
import json

# Configuration
BACKEND_API_URL = "http://localhost:8000/api/v1"
MACHINE_ID = "M_001"
SAMPLE_INTERVAL = 2.0  # seconds

# Mock MQTT Client to demonstrate industrial edge publish behavior
class MockMQTTClient:
    def __init__(self, broker_host="localhost", port=1883):
        self.broker = broker_host
        self.port = port
        print(f"[MQTT CLIENT] Initialized connected to broker {self.broker}:{self.port}")

    def publish(self, topic: str, payload: dict):
        print(f"[MQTT PUBLISH] Topic: '{topic}' | Payload: {json.dumps(payload)}")

def read_edge_sensors() -> dict:
    """Simulates raw ADC/modbus readings from machine sensors"""
    vibration = round(random.uniform(0.5, 5.5), 3)  # mm/s
    temperature = round(random.uniform(50.0, 95.0), 2)  # C
    pressure = round(random.uniform(3.0, 7.0), 2)  # bar
    noise = round(random.uniform(65.0, 100.0), 1)  # dB
    
    return {
        "vibration_mm_s": vibration,
        "temperature_c": temperature,
        "pressure_bar": pressure,
        "noise_level_db": noise
    }

def run_local_edge_inference(sensors: dict) -> dict:
    """Lightweight rule-based classifier running directly on edge hardware"""
    local_risk = 0.05
    reasons = []
    
    # 1. Vibration limits check
    if sensors["vibration_mm_s"] > 4.5:
        local_risk += 0.35
        reasons.append("VIBRATION_WARN")
        
    # 2. Temperature limits check
    if sensors["temperature_c"] > 85.0:
        local_risk += 0.25
        reasons.append("TEMPERATURE_WARN")
        
    # 3. Pressure bounds check
    if sensors["pressure_bar"] > 6.2 or sensors["pressure_bar"] < 3.5:
        local_risk += 0.20
        reasons.append("PRESSURE_WARN")
        
    # Determine local priority
    priority = "Low"
    if local_risk > 0.70:
        priority = "Critical"
    elif local_risk > 0.45:
        priority = "High"
    elif local_risk > 0.20:
        priority = "Medium"
        
    return {
        "failure_predicted": local_risk > 0.50,
        "failure_probability": round(local_risk, 3),
        "maintenance_priority": priority,
        "anomalous_flags": reasons
    }

def main():
    print("="*60)
    print("NexTwin AI - Starting Edge AI Simulation Loop (Raspberry Pi)")
    print("="*60)
    
    mqtt = MockMQTTClient()
    
    while True:
        try:
            # 1. Sensor Sampling
            telemetry = read_edge_sensors()
            print(f"\n[SENSOR SAMPLE] Telemetry: {telemetry}")
            
            # 2. Edge Inference
            prediction = run_local_edge_inference(telemetry)
            print(f"[EDGE PREDICTION] Result: {prediction}")
            
            # 3. Publish to Industrial MQTT Broker (Simulation)
            mqtt_payload = {
                "machine_id": MACHINE_ID,
                "timestamp": time.time(),
                "telemetry": telemetry,
                "edge_inference": prediction
            }
            mqtt.publish(f"factory/shopfloor/{MACHINE_ID}/state", mqtt_payload)
            
            # 4. Transmit to platform database via backend REST API (Simulation)
            # Create a sensor reading payload
            headers = {"Content-Type": "application/json"}
            
            # Simulate endpoint update to Central Gateway
            # In a real setup, edge telemetry logs to backend API gateway:
            api_payload = {
                "machine_id": MACHINE_ID,
                "type": "M",
                "air_temperature": float(telemetry["temperature_c"] + 273.15 - 10.0),
                "process_temperature": float(telemetry["temperature_c"] + 273.15),
                "rotational_speed": 1500.0,
                "torque": 40.0,
                "tool_wear": 50.0,
                "machine_health_score": float(100.0 - (telemetry["vibration_mm_s"] * 10.0)),
                "failure_risk_index": prediction["failure_probability"]
            }
            
            # Try HTTP transmission (silently fail if backend server offline during standalone edge runs)
            try:
                response = requests.post(
                    f"{BACKEND_API_URL}/predict/health", 
                    json=api_payload, 
                    headers=headers, 
                    timeout=1.0
                )
                if response.status_code == 200:
                    print(f"[HTTP POST] Successfully logged edge state. Response: {response.json().get('maintenance_priority')}")
                else:
                    print(f"[HTTP POST] Warning: Backend returned status code {response.status_code}")
            except requests.exceptions.RequestException:
                print("[HTTP POST] Failed to connect to central gateway. Edge operating in local buffer mode.")
                
        except KeyboardInterrupt:
            print("\nShutting down Edge AI simulation.")
            break
            
        time.sleep(SAMPLE_INTERVAL)

if __name__ == "__main__":
    main()
