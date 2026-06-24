-- NexTwin AI Database Schema
-- Target: PostgreSQL 14+
-- Author: Principal AI Architect & Senior FastAPI Engineer

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- 2. Machines Table
CREATE TABLE machines (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL,
    operational_status VARCHAR(20) DEFAULT 'Active',
    location VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_machines_id ON machines(id);

-- 3. Sensors Table
CREATE TABLE sensors (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    threshold_min DOUBLE PRECISION,
    threshold_max DOUBLE PRECISION,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_sensors_machine ON sensors(machine_id);

-- 4. Sensor Readings Table
CREATE TABLE sensor_readings (
    id SERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL REFERENCES sensors(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    value DOUBLE PRECISION NOT NULL
);
CREATE INDEX idx_sensor_readings_sensor_time ON sensor_readings(sensor_id, timestamp);

-- 5. Health Predictions Table
CREATE TABLE health_predictions (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    failure_risk DOUBLE PRECISION NOT NULL,
    health_score DOUBLE PRECISION NOT NULL,
    maintenance_priority VARCHAR(20) NOT NULL,
    details JSONB
);
CREATE INDEX idx_health_predictions_machine_time ON health_predictions(machine_id, timestamp);

-- 6. Energy Predictions Table
CREATE TABLE energy_predictions (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) REFERENCES machines(id) ON DELETE SET NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    relative_compactness DOUBLE PRECISION NOT NULL,
    surface_area DOUBLE PRECISION NOT NULL,
    wall_area DOUBLE PRECISION NOT NULL,
    roof_area DOUBLE PRECISION NOT NULL,
    overall_height DOUBLE PRECISION NOT NULL,
    orientation DOUBLE PRECISION NOT NULL,
    glazing_area DOUBLE PRECISION NOT NULL,
    glazing_area_distribution DOUBLE PRECISION NOT NULL,
    predicted_heating_load DOUBLE PRECISION NOT NULL,
    predicted_cooling_load DOUBLE PRECISION NOT NULL,
    predicted_energy_waste_pct DOUBLE PRECISION NOT NULL,
    energy_optimization_score DOUBLE PRECISION NOT NULL,
    optimization_recommendations JSONB
);
CREATE INDEX idx_energy_predictions_machine ON energy_predictions(machine_id);

-- 7. Bottleneck Predictions Table
CREATE TABLE bottleneck_predictions (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    bottleneck_risk_score DOUBLE PRECISION NOT NULL,
    predicted_production_delay DOUBLE PRECISION NOT NULL,
    congestion_probability DOUBLE PRECISION NOT NULL,
    congestion_risk_detected BOOLEAN DEFAULT FALSE
);
CREATE INDEX idx_bottleneck_predictions_machine ON bottleneck_predictions(machine_id);

-- 8. Anomaly Predictions Table
CREATE TABLE anomaly_predictions (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anomaly_detected BOOLEAN DEFAULT FALSE NOT NULL,
    anomaly_score DOUBLE PRECISION NOT NULL,
    method VARCHAR(50) NOT NULL,
    details JSONB
);
CREATE INDEX idx_anomaly_predictions_machine ON anomaly_predictions(machine_id);

-- 9. Alerts Table
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    machine_id VARCHAR(50) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    is_resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_alerts_machine_resolved ON alerts(machine_id, is_resolved);

-- 10. Simulations Table
CREATE TABLE simulations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    run_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Copilot Logs Table
CREATE TABLE copilot_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    sources JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_copilot_logs_user ON copilot_logs(user_id);

-- 12. Reports Table
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    parameters JSONB,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    generated_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_reports_generated ON reports(generated_by);
