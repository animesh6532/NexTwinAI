"""
NexTwin AI — local_inference.py
==============================
Edge-native predictive analytics. Classifies anomalies, scores health indices,
and extracts diagnostic metrics locally from raw physical waveforms.

Author: Principal Industrial AI Architect & Edge AI Engineer
"""

class LocalInferenceEngine:
    @staticmethod
    def evaluate_telemetry(telemetry: dict) -> dict:
        """
        Runs edge rules to detect anomalies, classify failure modes,
        and assign severity, cause, confidence, impact and suggested actions.
        """
        vib = telemetry["vibration_mm_s"]
        temp = telemetry["temperature_c"]
        press = telemetry["pressure_bar"]
        noise = telemetry["noise_level_db"]
        
        anomaly_detected = False
        severity = "Info"
        anomaly_type = "Nominal"
        cause = None
        confidence = 0.95
        impact = None
        suggested_action = "Continue standard operations check"
        failure_prob = 0.02
        
        # Heuristics mimicking trained Isolation Forest and rule boundaries
        reasons = []
        if vib > 4.5:
            reasons.append("high_vibration")
        if temp > 85.0:
            reasons.append("high_temperature")
        if press > 6.2 or press < 3.5:
            reasons.append("pressure_instability")
        if noise > 92.0:
            reasons.append("high_noise_rattle")
            
        if reasons:
            anomaly_detected = True
            # Determine severity and mode
            if len(reasons) >= 3 or vib > 6.0 or temp > 95.0:
                severity = "Emergency"
                failure_prob = 0.92
                confidence = 0.98
                anomaly_type = "Multimodal breakdown"
                cause = "Lubrication starvation and spindle bearing alignment failure"
                impact = "High downtime hazard, catastrophic mechanical seizure imminent"
                suggested_action = "TRIGGER EMERGENCY MANUAL OVERRIDE SHUTDOWN"
            elif vib > 4.5 or temp > 85.0:
                severity = "Critical"
                failure_prob = 0.78
                confidence = 0.90
                anomaly_type = "Spindle bearing fatigue" if vib > 4.5 else "Thermal friction wear"
                cause = "Spindle alignment belt looseness or bearing degradation"
                impact = "Significant vibration rattle, accelerated belt and gear teeth wear"
                suggested_action = "Schedule spindle alignment correction and belt tensioning"
            else:
                severity = "Warning"
                failure_prob = 0.45
                confidence = 0.88
                anomaly_type = "Hydraulic pressure delta" if (press > 6.2 or press < 3.5) else "Acoustic distortion"
                cause = "Hydraulic valve leakage or air lock in lines"
                impact = "Marginal drop in mechanical stroke efficiency, slight sound amplification"
                suggested_action = "Perform fluid top-up and check hydraulic seals"
        else:
            # Nominal base failure calculations
            failure_prob = round(0.01 + (vib * 0.01) + (temp * 0.0005), 4)
            
        health_score = max(0.0, min(100.0, 100.0 * (1.0 - failure_prob)))
        
        maintenance_priority = "Low"
        if failure_prob > 0.8:
            maintenance_priority = "Critical"
        elif failure_prob > 0.5:
            maintenance_priority = "High"
        elif failure_prob > 0.2:
            maintenance_priority = "Medium"
            
        return {
            "anomaly_detected": anomaly_detected,
            "anomaly_score": round(float(len(reasons) * 0.3 + (vib * 0.05)), 4),
            "anomaly_severity": severity,
            "anomaly_type": anomaly_type,
            "cause": cause,
            "confidence_score": round(confidence, 2),
            "impact_estimation": impact,
            "suggested_action": suggested_action,
            "failure_probability": round(failure_prob, 4),
            "health_score": round(health_score, 2),
            "maintenance_priority": maintenance_priority
        }
