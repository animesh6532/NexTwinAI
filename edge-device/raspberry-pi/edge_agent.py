"""
NexTwin AI — edge_agent.py (Raspberry Pi Simulator)
===================================================
Orchestration agent running on the Raspberry Pi edge device simulation.
Coordinates sensor readers, edge diagnostics, offline buffering, and syncing.

Author: Principal Industrial AI Architect & Edge AI Engineer
"""

import time
import os
import json
import requests
from sensor_reader import SensorReader
from local_inference import LocalInferenceEngine
from mqtt_client import IndustrialMQTTClient

# Configurations
BACKEND_API_URL = "http://localhost:8000/api/v1"
MACHINE_ID = "M_001"
SAMPLE_INTERVAL = 2.0  # seconds
BUFFER_FILE = "edge_buffer.json"

def read_buffer() -> list:
    """Reads buffered payloads from local disk"""
    if os.path.exists(BUFFER_FILE):
        try:
            with open(BUFFER_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def write_buffer(buffer_data: list):
    """Writes buffered payloads to local disk"""
    try:
        with open(BUFFER_FILE, "w") as f:
            json.dump(buffer_data, f, indent=2)
    except Exception as e:
        print(f"[EDGE AGENT] Local buffer write failed: {str(e)}")

def clear_buffer():
    """Removes the local buffer file once synced"""
    if os.path.exists(BUFFER_FILE):
        try:
            os.remove(BUFFER_FILE)
            print("[EDGE AGENT] Local buffer sync complete, file cleared.")
        except Exception as e:
            print(f"[EDGE AGENT] Failed to delete buffer file: {str(e)}")

def sync_buffer():
    """Attempts to upload buffered telemetry data to the central gateway"""
    buffer_data = read_buffer()
    if not buffer_data:
        return True
        
    print(f"[EDGE AGENT] Connection restored. Synchronizing {len(buffer_data)} buffered frames...")
    try:
        url = f"{BACKEND_API_URL}/edge/telemetry/sync"
        response = requests.post(url, json=buffer_data, timeout=3.0)
        if response.status_code == 201:
            clear_buffer()
            return True
        else:
            print(f"[EDGE AGENT] Gateway returned error during sync: {response.status_code}")
            return False
    except Exception as e:
        print(f"[EDGE AGENT] Gateway synchronization failed: {str(e)}")
        return False

def main():
    print("="*60)
    print("NexTwin AI - Edge AI Agent running (Raspberry Pi Gateway)")
    print(f"Target Asset: {MACHINE_ID} | Sample Interval: {SAMPLE_INTERVAL}s")
    print("="*60)

    reader = SensorReader(MACHINE_ID)
    mqtt = IndustrialMQTTClient(broker_host="localhost", port=1883)
    mqtt.connect()

    loop_count = 0
    preset = "Nominal"

    while True:
        try:
            # 1. Simulate changing machine presets to demonstrate alarms/warnings
            loop_count += 1
            if loop_count % 15 == 0:
                preset = "Warning"
                print("\n[EDGE STATE] Simulating slight mechanical bearing slippage (Preset: Warning)...")
            elif loop_count % 35 == 0:
                preset = "Critical"
                print("\n[EDGE STATE] Simulating severe coolant blockage overheat (Preset: Critical)...")
            elif loop_count % 60 == 0:
                preset = "Emergency"
                print("\n[EDGE STATE] Simulating catastrophic gear casing rupture (Preset: Emergency)...")
            else:
                preset = "Nominal"

            # 2. Read physical waveforms
            telemetry = reader.read_sensors(preset)
            
            # 3. Local edge inference (Predictive maintenance classification)
            local_inference = LocalInferenceEngine.evaluate_telemetry(telemetry)
            
            # Compile package
            payload = {
                "machine_id": MACHINE_ID,
                "telemetry": telemetry,
                "local_inference": local_inference,
                "timestamp": telemetry["timestamp"]
            }

            print(f"\n[SAMPLE] Temp: {telemetry['temperature_c']}°C | Vib: {telemetry['vibration_mm_s']} mm/s | Pres: {telemetry['pressure_bar']} bar")
            print(f"[LOCAL AI] Health: {local_inference['health_score']}% | Severity: {local_inference['anomaly_severity']} | Mode: {local_inference['anomaly_type']}")

            # 4. Dispatch via MQTT (demonstration broker)
            mqtt.publish(f"factory/shopfloor/{MACHINE_ID}/state", payload)

            # 5. Dispatch to central platform API with offline buffer fallback
            is_gateway_online = False
            try:
                url = f"{BACKEND_API_URL}/edge/telemetry"
                response = requests.post(url, json=payload, timeout=2.0)
                if response.status_code == 201:
                    is_gateway_online = True
                    print("[GATEWAY] Dispatch success.")
                else:
                    print(f"[GATEWAY] Warning: Returned status {response.status_code}")
            except Exception as e:
                print(f"[GATEWAY] Connection down: Gateway API unreachable.")

            if not is_gateway_online:
                # Buffer locally (Offline Mode)
                buffer_data = read_buffer()
                buffer_data.append(payload)
                write_buffer(buffer_data)
                print(f"[BUFFER] Saved offline data point. Current buffer size: {len(buffer_data)}")
            else:
                # Gateway is online, check and sync past logs if any exist
                sync_buffer()

        except KeyboardInterrupt:
            print("\nShutting down Edge AI Pi Agent.")
            mqtt.disconnect()
            break
            
        time.sleep(SAMPLE_INTERVAL)

if __name__ == "__main__":
    main()
