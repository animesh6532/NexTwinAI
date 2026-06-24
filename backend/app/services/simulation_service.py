"""
NexTwin AI — simulation_service.py
==================================
Business logic layer executing digital twin what-if scenarios. Evaluates operational 
and physical adjustments on predictive indexes.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, Any, List, Optional

from app.database.models import Simulation, Machine, Sensor
from app.services.db_helpers import ensure_user
from app.services.health_service import health_service
from app.services.energy_service import energy_service
from app.services.sensor_service import sensor_service
from app.utils.logger import logger

class SimulationService:
    def run_scenario(self, db: Session, scenario_data: Dict[str, Any]) -> Simulation:
        """
        Runs digital twin scenario simulations (what-if analysis) by adjusting baseline 
        asset parameters and comparing simulated output risks and loads.
        """
        name = scenario_data.get("name")
        desc = scenario_data.get("description", "")
        params = scenario_data.get("parameters", {})
        
        results = {}
        
        # Determine scenario type based on parameter configurations
        if "machine_id" in params:
            if "adjust_cycle_time" in params or "adjust_queue_length" in params or "adjust_defect_count" in params:
                # 3. Production/Bottleneck simulation
                results = self._simulate_production_scenario(db, params)
            else:
                # 1. Machine speed/operational load simulation
                results = self._simulate_machine_scenario(db, params)
        elif "surface_area" in params or "glazing_area" in params:
            # 2. Building envelope energy efficiency simulation
            results = self._simulate_energy_scenario(db, params)
        else:
            raise ValueError(
                "Unsupported simulation parameters. Include 'machine_id' with load/speed "
                "or bottleneck adjustments, or building envelope variables for energy scenarios."
            )
            
        # Log simulation to database
        run_by = scenario_data.get("run_by", 1)
        ensure_user(db, run_by)
        db_sim = Simulation(
            name=name,
            description=desc,
            parameters=params,
            results=results,
            created_at=datetime.utcnow(),
            run_by=run_by
        )
        db.add(db_sim)
        db.commit()
        db.refresh(db_sim)
        logger.info(f"Digital Twin Simulation '{name}' finished and logged (ID: {db_sim.id}).")
        return db_sim

    def get_simulations(self, db: Session, limit: int = 20) -> List[Simulation]:
        """Fetch past simulation logs."""
        return db.query(Simulation).order_by(Simulation.created_at.desc()).limit(limit).all()

    def get_simulation_by_id(self, db: Session, sim_id: int) -> Optional[Simulation]:
        """Fetch simulation by ID."""
        return db.query(Simulation).filter(Simulation.id == sim_id).first()

    def _simulate_machine_scenario(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Runs what-if prediction comparing machine speeds and loading parameters"""
        m_id = params.get("machine_id")
        machine = db.query(Machine).filter(Machine.id == m_id).first()
        if not machine:
            raise ValueError(f"Target machine '{m_id}' not found.")
            
        # Get baseline features
        sensors = sensor_service.get_sensors_by_machine(db, m_id)
        
        base_features = {
            "type": machine.type,
            "air_temperature": 300.0,
            "process_temperature": 310.0,
            "rotational_speed": 1500.0,
            "torque": 40.0,
            "tool_wear": 50.0,
            "machine_health_score": 100.0,
            "failure_risk_index": 0.0
        }
        
        # Populate features from database sensors if present
        for sensor in sensors:
            readings = sensor_service.get_sensor_readings(db, sensor.id, limit=1)
            if readings:
                val = readings[0].value
                if "temperature" in sensor.name.lower():
                    base_features["process_temperature"] = val
                    base_features["air_temperature"] = val - 10.0
                elif "vibration" in sensor.name.lower():
                    base_features["torque"] = val * 22.0
                elif "energy" in sensor.name.lower():
                    base_features["rotational_speed"] = val * 15.0

        # Predict baseline
        base_pred = health_service.predict_health(db, base_features)
        
        # Simulate changes
        sim_features = base_features.copy()
        sim_features["rotational_speed"] += params.get("adjust_speed_rpm", 0.0)
        sim_features["torque"] += params.get("adjust_torque_nm", 0.0)
        sim_features["tool_wear"] += params.get("adjust_tool_wear_min", 0.0)
        
        if params.get("adjust_speed_rpm", 0.0) > 0:
            sim_features["process_temperature"] += (params.get("adjust_speed_rpm") / 100.0) * 1.5
            
        # Run simulated prediction
        sim_pred = health_service.predict_health(db, sim_features)
        
        return {
            "target": f"Machine asset {m_id}",
            "baseline": {
                "air_temp": base_features["air_temperature"],
                "process_temp": base_features["process_temperature"],
                "speed_rpm": base_features["rotational_speed"],
                "torque_nm": base_features["torque"],
                "tool_wear_min": base_features["tool_wear"],
                "failure_risk": base_pred["failure_probability"],
                "health_score": base_pred["health_score"],
                "maintenance_priority": base_pred["maintenance_priority"]
            },
            "simulated": {
                "air_temp": sim_features["air_temperature"],
                "process_temp": sim_features["process_temperature"],
                "speed_rpm": sim_features["rotational_speed"],
                "torque_nm": sim_features["torque"],
                "tool_wear_min": sim_features["tool_wear"],
                "failure_risk": sim_pred["failure_probability"],
                "health_score": sim_pred["health_score"],
                "maintenance_priority": sim_pred["maintenance_priority"]
            },
            "risk_delta": round(sim_pred["failure_probability"] - base_pred["failure_probability"], 4),
            "health_score_delta": round(sim_pred["health_score"] - base_pred["health_score"], 2)
        }

    def _simulate_energy_scenario(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Runs what-if simulation comparing structural layout variations"""
        base_features = {
            "relative_compactness": params.get("relative_compactness", 0.76),
            "surface_area": params.get("surface_area", 680.0),
            "wall_area": params.get("wall_area", 310.0),
            "roof_area": params.get("roof_area", 180.0),
            "overall_height": params.get("overall_height", 5.0),
            "orientation": params.get("orientation", 3.0),
            "glazing_area": params.get("glazing_area", 0.20),
            "glazing_area_distribution": params.get("glazing_area_distribution", 2.0)
        }
        
        # Predict baseline
        base_pred = energy_service.predict_energy(db, base_features)
        
        # Simulate changes
        sim_features = base_features.copy()
        if "sim_glazing_area" in params:
            sim_features["glazing_area"] = params["sim_glazing_area"]
        if "sim_overall_height" in params:
            sim_features["overall_height"] = params["sim_overall_height"]
        if "sim_roof_area" in params:
            sim_features["roof_area"] = params["sim_roof_area"]
            
        # Predict simulated
        sim_pred = energy_service.predict_energy(db, sim_features)
        
        baseline_total = base_pred["predicted_heating_load"] + base_pred["predicted_cooling_load"]
        simulated_total = sim_pred["predicted_heating_load"] + sim_pred["predicted_cooling_load"]
        savings = baseline_total - simulated_total
        
        return {
            "target": "Building Envelope zone",
            "baseline": {
                "heating_load_kw": base_pred["predicted_heating_load"],
                "cooling_load_kw": base_pred["predicted_cooling_load"],
                "total_load_kw": round(baseline_total, 2),
                "energy_waste_pct": base_pred["predicted_energy_waste_pct"],
                "efficiency_score": base_pred["energy_optimization_score"]
            },
            "simulated": {
                "heating_load_kw": sim_pred["predicted_heating_load"],
                "cooling_load_kw": sim_pred["predicted_cooling_load"],
                "total_load_kw": round(simulated_total, 2),
                "energy_waste_pct": sim_pred["predicted_energy_waste_pct"],
                "efficiency_score": sim_pred["energy_optimization_score"]
            },
            "estimated_load_savings_kw": round(savings, 2),
            "efficiency_score_gain": round(sim_pred["energy_optimization_score"] - base_pred["energy_optimization_score"], 2)
        }

    def _simulate_production_scenario(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Runs what-if prediction comparing production queue bottlenecks and cycle delays"""
        m_id = params.get("machine_id")
        machine = db.query(Machine).filter(Machine.id == m_id).first()
        if not machine:
            raise ValueError(f"Target machine '{m_id}' not found.")
            
        from app.services.bottleneck_service import bottleneck_service
        
        # Build baseline parameters
        base_features = {
            "machine_id": m_id,
            "vibration_mm_s": 1.8,
            "temperature_c": 60.0,
            "pressure_bar": 4.2,
            "noise_level_db": 72.0,
            "sound_frequency_hz": 520.0,
            "sound_amplitude": 0.06,
            "defect_count": 0.0,
            "energy_draw_kw": 65.0,
            "queue_length": 5,
            "utilization_rate": 75.0,
            "downtime_minutes": 2.0,
            "throughput_rate": 108.0,
            "cycle_time": 33.3,
            "defect_rate": 0.0
        }
        
        # Populate dynamic baseline from actual machine sensor readings if available
        sensors = sensor_service.get_sensors_by_machine(db, m_id)
        for sensor in sensors:
            readings = sensor_service.get_sensor_readings(db, sensor.id, limit=1)
            if readings:
                val = readings[0].value
                if "vibration" in sensor.name.lower():
                    base_features["vibration_mm_s"] = val
                elif "temperature" in sensor.name.lower():
                    base_features["temperature_c"] = val
                elif "pressure" in sensor.name.lower():
                    base_features["pressure_bar"] = val
                elif "noise" in sensor.name.lower():
                    base_features["noise_level_db"] = val
                elif "energy" in sensor.name.lower():
                    base_features["energy_draw_kw"] = val
                    
        # Predict baseline bottleneck
        base_pred = bottleneck_service.predict_bottleneck(db, base_features)
        
        # Simulated parameters
        sim_features = base_features.copy()
        sim_features["cycle_time"] = max(1.0, base_features["cycle_time"] + params.get("adjust_cycle_time", 0.0))
        sim_features["queue_length"] = max(0, base_features["queue_length"] + params.get("adjust_queue_length", 0))
        sim_features["defect_count"] = max(0.0, base_features["defect_count"] + params.get("adjust_defect_count", 0.0))
        
        # Re-calculate defect rates based on simulated parameters
        sim_features["defect_rate"] = sim_features["defect_count"] / max(sim_features["throughput_rate"], 1.0)
        
        # Predict simulated bottleneck
        sim_pred = bottleneck_service.predict_bottleneck(db, sim_features)
        
        return {
            "target": f"Production Line Node {m_id}",
            "baseline": {
                "cycle_time": base_features["cycle_time"],
                "queue_length": base_features["queue_length"],
                "defect_count": base_features["defect_count"],
                "bottleneck_risk": base_pred["bottleneck_risk_score"],
                "predicted_delay": base_pred["predicted_production_delay"],
                "congestion_probability": base_pred["congestion_probability"],
                "congestion_risk_detected": base_pred["congestion_risk_detected"]
            },
            "simulated": {
                "cycle_time": sim_features["cycle_time"],
                "queue_length": sim_features["queue_length"],
                "defect_count": sim_features["defect_count"],
                "bottleneck_risk": sim_pred["bottleneck_risk_score"],
                "predicted_delay": sim_pred["predicted_production_delay"],
                "congestion_probability": sim_pred["congestion_probability"],
                "congestion_risk_detected": sim_pred["congestion_risk_detected"]
            },
            "risk_delta": round(sim_pred["bottleneck_risk_score"] - base_pred["bottleneck_risk_score"], 2),
            "delay_delta": round(sim_pred["predicted_production_delay"] - base_pred["predicted_production_delay"], 2),
            "congestion_probability_delta": round(sim_pred["congestion_probability"] - base_pred["congestion_probability"], 4)
        }

simulation_service = SimulationService()
