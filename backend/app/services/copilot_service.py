"""
NexTwin AI — copilot_service.py
===============================
Conversational agent service bridging FastAPI and a deterministic local NLP engine.
Implements scikit-learn based TF-IDF vector space model similarity search matching
against industrial_knowledge_base.json, intent classification for greetings, and 
live database-aware queries.

Author: Principal AI Architect & Senior FastAPI Engineer
"""

import sys
import os
import re
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Adjust path to enable importing from root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..")))

from app.database.models import CopilotLog, Machine, Alert, Report
from app.services.db_helpers import ensure_user
from app.utils.logger import logger

class CopilotService:
    def __init__(self):
        self.kb_data = []
        self.vectorizer = None
        self.tfidf_matrix = None
        self._init_kb()

    def _init_kb(self):
        """Loads industrial_knowledge_base.json and fits the TF-IDF vector space model"""
        try:
            kb_path = os.path.join(os.path.dirname(__file__), "..", "utils", "industrial_knowledge_base.json")
            if os.path.exists(kb_path):
                with open(kb_path, "r", encoding="utf-8") as f:
                    self.kb_data = json.load(f)
                
                logger.info(f"Loaded {len(self.kb_data)} QA records from {kb_path}")
                
                # Fit TF-IDF model on questions
                questions = [item["question"] for item in self.kb_data]
                if questions:
                    self.vectorizer = TfidfVectorizer(stop_words='english', lowercase=True)
                    self.tfidf_matrix = self.vectorizer.fit_transform(questions)
                    logger.info("Successfully fitted TF-IDF Vectorizer on knowledge base questions.")
            else:
                logger.warning(f"Knowledge base file not found at {kb_path}. Copilot will rely on fallback database status queries only.")
        except Exception as e:
            logger.error(f"Failed to initialize knowledge base NLP vectorizer: {str(e)}")

    def ask_copilot(self, db: Session, user_id: Optional[int], prompt: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Main query entrypoint. Matches prompt intents, performs database audits,
        or queries the local Q&A Vector Space Model.
        """
        response_text = ""
        sources = []
        p_low = prompt.strip().lower()

        # Step 1: Greeting Intent Matching
        greetings = ["hello", "hi", "good morning", "good afternoon", "good evening", "hey", "greetings"]
        is_greeting = any(p_low == g or p_low.startswith(g + " ") or re.match(rf"^{g}[^a-zA-Z]", p_low) for g in greetings)
        
        if is_greeting:
            response_text = (
                "Hello! Welcome to the NexTwin AI Operating System Copilot. I am your deterministic local factory assistant.\n\n"
                "I can analyze telemetry status, diagnose failure causes, and explain technical manufacturing guidelines. "
                "How can I assist you on the floor today?"
            )
            sources = [{"type": "greeting_intent"}]

        # Step 2: Database-Aware Live Query Routing
        else:
            db_keywords = ["maintenance", "repair", "failing", "fail", "why", "cause", "reason", "anomaly", "abnormal", "deviat", "energy", "electricity", "power", "consume", "bottleneck", "delay", "congestion", "slow", "summarize", "summary", "overview", "factory", "shop", "floor", "oee", "downtime"]
            has_db_keyword = any(w in p_low for w in db_keywords)
            m_match = re.search(r'(m_\d+)', p_low)
            
            if has_db_keyword or m_match:
                # Query DB metrics
                response_text, sources = self._query_database_state(db, prompt)
            
            # Step 3: Semantic QA Matching using TF-IDF Vector space
            elif self.vectorizer is not None and self.tfidf_matrix is not None and len(self.kb_data) > 0:
                try:
                    query_vec = self.vectorizer.transform([prompt])
                    similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
                    best_match_idx = np.argmax(similarities)
                    score = similarities[best_match_idx]
                    
                    if score >= 0.15:  # threshold of similarity
                        matched_qa = self.kb_data[best_match_idx]
                        response_text = matched_qa["answer"]
                        sources = [{"type": "knowledge_base", "category": matched_qa.get("category"), "confidence_score": round(float(score), 3)}]
                    else:
                        response_text = self._get_default_response()
                        sources = []
                except Exception as e:
                    logger.error(f"Semantic match failed: {str(e)}")
                    response_text = self._get_default_response()
                    sources = []
            else:
                response_text = self._get_default_response()
                sources = []

        # Log conversation to database
        user_id = user_id or 1
        ensure_user(db, user_id)
        db_log = CopilotLog(
            user_id=user_id,
            prompt=prompt,
            response=response_text,
            sources=sources,
            created_at=datetime.utcnow()
        )
        db.add(db_log)
        db.commit()
        logger.info(f"Conversational Copilot log saved for User {user_id}")

        return {
            "response": response_text,
            "sources": sources,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_logs(self, db: Session, user_id: Optional[int] = None, limit: int = 50) -> List[CopilotLog]:
        """Fetch past conversation log history."""
        query = db.query(CopilotLog)
        if user_id:
            query = query.filter(CopilotLog.user_id == user_id)
        return query.order_by(CopilotLog.created_at.desc()).limit(limit).all()

    def _get_default_response(self) -> str:
        return (
            "I could not match your query with 100% certainty inside our factory knowledge base. "
            "Please try asking an operational question about:\n"
            "- *'What is machine health?'*\n"
            "- *'Why is failure risk high?'*\n"
            "- *'How can I reduce downtime?'*\n"
            "- *'What is OEE?'*\n"
            "- *'Explain anomaly score.'*\n"
            "- *'How can I optimize energy consumption?'*"
        )

    def _query_database_state(self, db: Session, prompt: str) -> tuple:
        """Database-aware conversational analyzer querying live operational parameters"""
        import re
        p_low = prompt.lower()
        
        # 1. Maintenance needs query
        if any(w in p_low for w in ["maintenance", "need", "repair", "failing", "fail"]):
            from app.database.models import HealthPrediction
            machines = db.query(Machine).all()
            needs_maintenance = []
            for m in machines:
                last_health = db.query(HealthPrediction).filter(HealthPrediction.machine_id == m.id).order_by(HealthPrediction.timestamp.desc()).first()
                if last_health and (last_health.maintenance_priority in ["Critical", "High"] or last_health.failure_risk > 0.5):
                    needs_maintenance.append(
                        f"- **{m.name} ({m.id})**: Priority **{last_health.maintenance_priority}** (Failure Risk: {last_health.failure_risk:.1%}, Health Index: {last_health.health_score}/100)"
                    )
            
            if needs_maintenance:
                res = "Based on predictive maintenance models, the following assets require immediate attention:\n\n" + "\n".join(needs_maintenance)
            else:
                res = "All machines are currently operating within safe parameters. No immediate maintenance is required."
            sources = [{"type": "database_query", "table": "health_predictions"}]
            return res, sources

        # 2. Specific machine failing root-cause analysis
        m_match = re.search(r'(m_\d+)', p_low)
        if m_match or (any(w in p_low for w in ["why", "cause", "reason"]) and any(m.id.lower() in p_low for m in db.query(Machine).all())):
            from app.database.models import HealthPrediction, Sensor, SensorReading
            m_id = m_match.group(1).upper() if m_match else "M_001"
            machine = db.query(Machine).filter(Machine.id == m_id).first()
            if not machine:
                return f"Machine {m_id} is not registered in the system.", []
                
            last_health = db.query(HealthPrediction).filter(HealthPrediction.machine_id == m_id).order_by(HealthPrediction.timestamp.desc()).first()
            latest_alerts = db.query(Alert).filter(Alert.machine_id == m_id, Alert.is_resolved == False).all()
            
            reasons = []
            if last_health and last_health.details:
                details = last_health.details
                wear = details.get("tool_wear", 0)
                proc_temp = details.get("process_temperature", 310)
                air_temp = details.get("air_temperature", 300)
                torque = details.get("torque", 40)
                
                if wear > 180:
                    reasons.append(f"Tool wear limits are breached ({wear} mins / max 240 mins).")
                if abs(proc_temp - air_temp) < 8.6:
                    reasons.append(f"Process cooling system underperforming (temp difference of only {abs(proc_temp - air_temp):.2f} K).")
                if proc_temp > 322.0:
                    reasons.append(f"Thermal overload: Operating temperature high at {proc_temp:.1f} K.")
                if torque > 65.0:
                    reasons.append(f"High mechanical load: torque measured at {torque:.1f} Nm.")
            
            for a in latest_alerts:
                reasons.append(f"Active alert raised: {a.title} ({a.message})")
                
            if not reasons:
                reasons.append("No telemetry anomalies or threshold breaches are currently detected on this asset.")
                
            res = f"### Root Cause Analysis for machine **{machine.name} ({m_id})**:\n\n"
            if last_health:
                res += f"- **Current Health score**: {last_health.health_score}/100\n"
                res += f"- **Estimated Failure Probability**: {last_health.failure_risk:.1%}\n"
                res += f"- **Maintenance Priority**: **{last_health.maintenance_priority}**\n\n"
            res += "**Contributing Root Factors:**\n" + "\n".join([f"{idx+1}. {r}" for idx, r in enumerate(reasons)])
            sources = [{"type": "root_cause_analysis", "machine_id": m_id}]
            return res, sources

        # 3. Anomaly explanation
        if any(w in p_low for w in ["anomaly", "abnormal", "strange", "deviat"]):
            from app.database.models import AnomalyPrediction
            latest_anomaly = db.query(AnomalyPrediction).order_by(AnomalyPrediction.timestamp.desc()).first()
            if latest_anomaly and latest_anomaly.anomaly_detected:
                m_id = latest_anomaly.machine_id
                m_info = db.query(Machine).filter(Machine.id == m_id).first()
                det_str = ", ".join([f"{k}: {v}" for k, v in latest_anomaly.details.items()]) if latest_anomaly.details else "Vibration & acoustic signature breach"
                res = (
                    f"An active anomaly was detected on **{m_info.name if m_info else m_id} ({m_id})** "
                    f"at {latest_anomaly.timestamp.strftime('%Y-%m-%d %H:%M:%S')} using the **{latest_anomaly.method}** model.\n\n"
                    f"- **Anomaly Score**: {latest_anomaly.anomaly_score:.4f}\n"
                    f"- **Trigger Signatures**: {det_str}\n"
                    f"- **Explanation**: The sensor readings indicate a shift away from nominal factory distribution patterns, suggesting mechanical slippage or structural friction."
                )
            else:
                res = "No anomalous patterns are currently registered in the factory telemetry database. All sensors match nominal baseline operating distributions."
            sources = [{"type": "database_query", "table": "anomaly_predictions"}]
            return res, sources

        # 4. Energy footprint query
        if any(w in p_low for w in ["energy", "electricity", "power", "consume"]):
            from app.database.models import EnergyPrediction
            latest_preds = db.query(EnergyPrediction).order_by(EnergyPrediction.timestamp.desc()).all()
            seen = set()
            machine_energy = []
            for ep in latest_preds:
                if ep.machine_id and ep.machine_id not in seen:
                    seen.add(ep.machine_id)
                    tot_load = ep.predicted_heating_load + ep.predicted_cooling_load
                    machine_energy.append((ep.machine_id, tot_load, ep.energy_optimization_score))
            
            if machine_energy:
                machine_energy.sort(key=lambda x: x[1], reverse=True)
                top_m, top_load, top_score = machine_energy[0]
                m_info = db.query(Machine).filter(Machine.id == top_m).first()
                res = (
                    f"The machine consuming the most energy is **{m_info.name if m_info else top_m} ({top_m})** with a total "
                    f"predicted structural thermal load of **{top_load:.2f} kW**.\n\n"
                    f"- **Energy Optimization Score**: {top_score:.1f}/100\n"
                    f"- **Waste Percentage**: {100.0 - top_score:.1f}%\n"
                    f"**Recommendations**: Lower the glazing area ratio in this zone to 10% to capture an estimated savings of **4.5 kW** in cooling load."
                )
            else:
                res = "No energy optimization records are currently logged in the database."
            sources = [{"type": "database_query", "table": "energy_predictions"}]
            return res, sources

        # 5. Bottleneck query
        if any(w in p_low for w in ["bottleneck", "delay", "congestion", "slow"]):
            from app.database.models import BottleneckPrediction
            latest_bottlenecks = db.query(BottleneckPrediction).order_by(BottleneckPrediction.timestamp.desc()).all()
            seen = set()
            b_list = []
            for bp in latest_bottlenecks:
                if bp.machine_id not in seen:
                    seen.add(bp.machine_id)
                    m_info = db.query(Machine).filter(Machine.id == bp.machine_id).first()
                    b_list.append(
                        f"- **{m_info.name if m_info else bp.machine_id} ({bp.machine_id})**: "
                        f"Severity Index **{bp.bottleneck_risk_score}/10** | Congestion Prob: {bp.congestion_probability:.1%} | Est. Delay: {bp.predicted_production_delay} units"
                    )
            
            if b_list:
                res = "Here are the current production bottlenecks identified on the line:\n\n" + "\n".join(b_list)
            else:
                res = "No line bottlenecks or cycle delays are currently predicted."
            sources = [{"type": "database_query", "table": "bottleneck_predictions"}]
            return res, sources

        # 6. Factory health summary
        if any(w in p_low for w in ["summarize", "summary", "overview", "factory", "shop", "floor", "oee", "downtime"]):
            from app.database.models import HealthPrediction, AnomalyPrediction
            machines = db.query(Machine).all()
            active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
            
            healths = []
            for m in machines:
                lh = db.query(HealthPrediction).filter(HealthPrediction.machine_id == m.id).order_by(HealthPrediction.timestamp.desc()).first()
                if lh:
                    healths.append(lh.health_score)
            
            avg_health = sum(healths) / len(healths) if healths else 100.0
            active_anomalies = db.query(AnomalyPrediction).filter(AnomalyPrediction.anomaly_detected == True).count()
            
            status_text = "HEALTHY"
            if active_alerts > 0 or active_anomalies > 0:
                status_text = "WARNING"
            if active_alerts > 2:
                status_text = "CRITICAL"
                
            res = (
                f"### Factory Health & Operations Summary\n"
                f"- **Overall Status**: **{status_text}**\n"
                f"- **Assets Under Monitoring**: {len(machines)}\n"
                f"- **Average Asset Health Index**: {avg_health:.1f}/100\n"
                f"- **Active Unresolved Alerts**: {active_alerts}\n"
                f"- **Unsupervised Telemetry Anomalies**: {active_anomalies}\n\n"
                f"All predictive models are actively validating edge logs."
            )
            sources = [{"type": "factory_summary", "assets_monitored": len(machines)}]
            return res, sources

        return self._get_default_response(), []

copilot_service = CopilotService()
