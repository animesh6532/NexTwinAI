"""
NexTwin AI — mqtt_client.py
===========================
Industrial IIoT MQTT Client adapter. Facilitates pub/sub over standard brokers
(e.g., Mosquitto) and implements mock failover for sandbox execution.

Author: Principal Industrial AI Architect & Edge AI Engineer
"""

import json
from app.utils.logger import logger

class IndustrialMQTTClient:
    def __init__(self, broker_host: str = "localhost", port: int = 1883):
        self.host = broker_host
        self.port = port
        self.client = None
        self.connected = False
        
    def connect(self) -> bool:
        """Attempts connection to the industrial MQTT broker"""
        try:
            import paho.mqtt.client as mqtt
            self.client = mqtt.Client()
            self.client.connect(self.host, self.port, keepalive=60)
            self.client.loop_start()
            self.connected = True
            logger.info(f"MQTT Client: Connected successfully to broker {self.host}:{self.port}")
            return True
        except ImportError:
            logger.warning("paho-mqtt library is not installed. Edge AI operating in Mock MQTT Client Mode.")
            self.connected = False
            return False
        except Exception as e:
            logger.warning(f"Failed to connect to physical MQTT broker at {self.host}:{self.port} ({str(e)}). Falling back to mock publication.")
            self.connected = False
            return False

    def publish(self, topic: str, payload: dict) -> bool:
        """Publishes telemetry payload to the specified topic"""
        data_str = json.dumps(payload)
        if self.connected and self.client:
            try:
                self.client.publish(topic, data_str)
                logger.info(f"[MQTT PUBLISH] Topic: '{topic}' | Size: {len(data_str)} bytes")
                return True
            except Exception as e:
                logger.error(f"MQTT Publish failed, message dropped from broker stream: {str(e)}")
                return False
        else:
            # Mock publisher print statement
            print(f"[MOCK MQTT PUBLISH] Topic: '{topic}' | Payload: {data_str}")
            return True
            
    def disconnect(self):
        """Clean disconnect from broker loop"""
        if self.connected and self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.connected = False
            logger.info("MQTT Client disconnected.")
