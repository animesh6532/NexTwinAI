/**
 * NexTwin AI — esp32_edge.ino (ESP32)
 * ===================================
 * Arduino C++ sketch simulating ESP32 edge deployment.
 * Connects to local Wi-Fi, samples raw pins, runs threshold inference, 
 * and publishes state over industrial MQTT (using PubSubClient).
 * 
 * Author: Principal AI Architect & Industrial IoT Expert
 */

#include <WiFi.h>
#include <PubSubClient.h>

// WiFi Configuration
const char* ssid = "Factory_WiFi_Secure";
const char* password = "SSID_PASSWORD_SECRET";

// MQTT Broker Configuration
const char* mqtt_server = "192.168.1.50"; // Local Factory Broker
const int mqtt_port = 1883;
const char* machine_id = "M_001";
const char* mqtt_topic = "factory/shopfloor/M_001/telemetry";

WiFiClient espClient;
PubSubClient client(espClient);

// Sensor Analog Pins Simulation
const int vibrationPin = 34;
const int tempPin = 35;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to Wi-Fi SSID: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 15) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected successfully.");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection failed. Running in Local Offline Fallback Mode.");
  }
}

void reconnect() {
  while (!client.connected() && WiFi.status() == WL_CONNECTED) {
    Serial.print("Attempting MQTT connection...");
    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("Connected to broker.");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" trying again in 5 seconds");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected() && WiFi.status() == WL_CONNECTED) {
    reconnect();
  }
  client.loop();

  // 1. Simulating Sensor Readings (A/D sampling)
  float vibration = (analogRead(vibrationPin) / 4095.0) * 8.0; // 0-8 mm/s range
  // Heuristic mock float mapping
  if (vibration < 0.1) {
    vibration = random(10, 45) / 10.0; // 1.0 - 4.5 mm/s default
  }
  float temperature = 60.0 + (random(-10, 350) / 10.0); // 50-95 C range
  float pressure = 4.2 + (random(-15, 25) / 10.0); // 2.7 - 6.7 bar range
  float noise = 72.0 + (random(-100, 250) / 10.0); // 62 - 97 dB range

  // 2. Running Local Edge Threshold Inference
  bool edge_alarm = false;
  const char* priority = "Low";
  
  if (vibration > 4.5 || temperature > 85.0 || pressure > 6.2) {
    edge_alarm = true;
    priority = "Critical";
  } else if (vibration > 3.0 || temperature > 75.0) {
    priority = "Warning";
  }

  // 3. Construct JSON Payload
  String payload = "{";
  payload += "\"machine_id\":\"" + String(machine_id) + "\",";
  payload += "\"telemetry\":{";
  payload += "\"vibration\":" + String(vibration, 3) + ",";
  payload += "\"temperature\":" + String(temperature, 2) + ",";
  payload += "\"pressure\":" + String(pressure, 2) + ",";
  payload += "\"noise\":" + String(noise, 1);
  payload += "},";
  payload += "\"edge_inference\":{";
  payload += "\"alarm\":" + String(edge_alarm ? "true" : "false") + ",";
  payload += "\"priority\":\"" + String(priority) + "\"";
  payload += "}";
  payload += "}";

  // Print to console
  Serial.print("Sampled State: ");
  Serial.println(payload);

  // 4. Publish to MQTT Broker
  if (client.connected()) {
    if (client.publish(mqtt_topic, payload.c_str())) {
      Serial.println("MQTT Publish Success.");
    } else {
      Serial.println("MQTT Publish Failed.");
    }
  } else {
    Serial.println("Offline: Telemetry buffered locally.");
  }

  delay(3000); // 3 second sample interval
}
