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

from app.database.models import CopilotLog, Machine, Alert, Report, CopilotConversation
from app.services.db_helpers import ensure_user
from app.services.relationship_engine import relationship_engine
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

    def ask_copilot(self, db: Session, user_id: Optional[int], prompt: str, history: Optional[List[Dict[str, str]]] = None, conversation_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Main query entrypoint with intent classification, database integrations, and semantic Q&A.
        """
        response_text = ""
        sources = []
        p_low = prompt.strip().lower()

        # Step 1: Intent Classification
        greetings = ["hello", "hi", "good morning", "good afternoon", "good evening", "hey", "greetings", "whats up", "howdy", "welcome", "hola", "yo"]
        is_greeting = any(p_low == g or p_low.startswith(g + " ") or re.match(rf"^{g}[^a-zA-Z]", p_low) for g in greetings)
        
        # Check machine list dynamically
        machines_list = db.query(Machine).all()
        has_machine_mention = any(m.id.lower() in p_low for m in machines_list)

        # Keywords mapping for intents
        is_health = any(w in p_low for w in ["machine health", "how is", "health score", "health status", "equipment condition", "oee", "factory health", "operational status"])
        is_maint = any(w in p_low for w in ["maintenance", "repair", "service", "maintenance queue", "window", "preventive plan", "priority maintenance", "schedule", "lubricat", "replace"])
        is_energy = any(w in p_low for w in ["energy", "power", "consume", "load", "electricity", "utility", "thermal load savings", "energy analytics", "watt", "kw", "heating", "cooling"])
        is_anomaly = any(w in p_low for w in ["anomaly", "abnormal", "deviation", "outlier", "rattle", "noise", "vibration", "unusual", "fault"])
        is_bottleneck = any(w in p_low for w in ["bottleneck", "delay", "congestion", "starvation", "backlog", "flow", "queue", "starv", "clog", "throughput"])
        is_alerts = any(w in p_low for w in ["alert", "alarm", "active alert", "critical alert", "warning alert", "emergency", "incident", "warning"])
        is_reports = any(w in p_low for w in ["report", "audit", "documentation", "generate report", "compile report", "registry", "history", "log"])
        is_sim = any(w in p_low for w in ["simulation", "what-if", "simulated", "drill", "scenario", "sandbox"])

        has_other_intent = is_health or is_maint or is_energy or is_anomaly or is_bottleneck or is_alerts or is_reports or is_sim or has_machine_mention

        # Step 2: Route by Intent
        if is_greeting and not has_other_intent:
            response_text = "Hello, I am NexTwin Copilot. I can help with machine health, maintenance, anomalies, energy optimization, simulations, reports, and factory analytics."
            sources = [{"type": "greeting_intent"}]

        elif is_maint:
            # Query maintenance plans
            from app.services.decision_engine import decision_engine
            plans = decision_engine.generate_maintenance_plans(db)
            if not plans:
                response_text = "### Predictive Maintenance Audit\nAll registered machine nodes are operating inside nominal ranges. No immediate maintenance actions are scheduled."
            else:
                response_text = "### Recommended Maintenance Planner Actions\nBased on failure risk indices and OEE metrics, the following corrective jobs are recommended:\n\n"
                for p in plans:
                    response_text += (
                        f"- **Machine {p['machine_id']}**: Priority **{p['priority']}**\n"
                        f"  - **Current Health**: {p['current_health']:.1f}%\n"
                        f"  - **Failure Prob**: {p['failure_probability']:.1%}\n"
                        f"  - **Timeframe Window**: *{p['maintenance_window']}*\n"
                        f"  - **Estimated Downtime / Cost**: {p['estimated_downtime_minutes']} mins / ${p['estimated_cost_usd']}\n"
                        f"  - **Action Item**: {p['suggested_action']}\n\n"
                    )
            sources = [{"type": "agentic_tool", "tool": "maintenance_planner"}]

        elif is_energy:
            # Query energy insights
            from app.services.decision_engine import decision_engine
            energy_insights = decision_engine.generate_energy_optimization(db)
            ranking = energy_insights["machines_ranking"]
            
            if not ranking:
                response_text = "### Energy Audit\nNo active telemetry logs loaded in energy database."
            else:
                response_text = f"### Factory Energy Footprint & Optimization\n"
                response_text += f"- **Potential Savings Available**: **${energy_insights['total_potential_savings_usd']:.2f}/year**\n"
                response_text += f"- **Peak Load Machines**: {', '.join(energy_insights['peak_load_assets']) or 'None'}\n\n"
                response_text += "**Asset Load Consumption Ranking:**\n"
                for idx, r in enumerate(ranking):
                    response_text += f"{idx+1}. Machine **{r['machine_id']}**: **{r['power_draw_kw']:.1f} kW** | Waste: {r['waste_pct']}% | Potential Savings: ${r['annual_cost_savings_usd']}/yr\n"
                
                response_text += "\n**Optimization Suggestions:**\n"
                for sug in energy_insights["optimization_suggestions"]:
                    response_text += f"- **[{sug['category']}]**: {sug['message']} (Savings: ${sug['estimated_savings_usd']}/yr)\n"
            sources = [{"type": "agentic_tool", "tool": "energy_optimizer"}]

        elif is_anomaly:
            # Query active anomalies
            from app.database.models import AnomalyPrediction
            latest_anomaly = db.query(AnomalyPrediction).order_by(AnomalyPrediction.timestamp.desc()).first()
            if latest_anomaly and latest_anomaly.anomaly_detected:
                response_text = (
                    f"### Sensor Anomaly Audit\n"
                    f"An active anomaly was detected on machine **{latest_anomaly.machine_id}** "
                    f"at {latest_anomaly.timestamp.strftime('%Y-%m-%d %H:%M:%S')} using the **{latest_anomaly.method}** engine.\n\n"
                    f"- **Anomaly Severity**: **{latest_anomaly.severity}**\n"
                    f"- **Anomaly Type**: {latest_anomaly.anomaly_type}\n"
                    f"- **Estimated Cause**: {latest_anomaly.cause}\n"
                    f"- **Failure Impact**: {latest_anomaly.impact_estimation}\n"
                    f"- **Local Confidence Score**: {latest_anomaly.confidence_score:.1%}\n"
                    f"- **Operator Recommendation**: *{latest_anomaly.suggested_action}*"
                )
            else:
                response_text = "### Sensor Anomaly Audit\nNo active anomalies detected across the plant floor. All streams align with standard distributions."
            sources = [{"type": "database_query", "table": "anomaly_predictions"}]

        elif is_bottleneck:
            # Query bottlenecks
            bottlenecks = relationship_engine.analyze_bottlenecks(db)
            ranking = bottlenecks["bottlenecks_ranking"]
            
            if not ranking:
                response_text = "### Production Flow Audit\nNo bottleneck history logged."
            else:
                response_text = "### Production Flow & Bottleneck Diagnostics\n"
                primary = bottlenecks["primary_bottleneck"]
                if primary:
                    response_text += f"**Primary Bottleneck Node**: Machine **{primary['machine_id']}** (Score: {primary['bottleneck_score']}/10 | Delay: {primary['predicted_delay_seconds']}s)\n\n"
                
                response_text += "**Flow Congestion Ranking:**\n"
                for r in ranking:
                    response_text += f"- **Machine {r['machine_id']}**: Score **{r['bottleneck_score']:.1f}** | Congestion Prob: {r['congestion_probability']:.1%} | Status: **{r['status']}**\n"
                
                if bottlenecks["propagation_impact"]:
                    response_text += "\n**Downstream Starvation Impact:**\n"
                    for imp in bottlenecks["propagation_impact"]:
                        response_text += f"- Downstream machine **{imp['downstream_machine_id']}**: Risk increases by +{imp['risk_increase_pct']}% | Expected delay: {imp['expected_cycle_delay_seconds']}s\n"
            sources = [{"type": "agentic_tool", "tool": "bottleneck_analyzer"}]

        elif is_alerts:
            # Query active alerts
            active_alerts = db.query(Alert).filter(Alert.is_resolved == False).all()
            if not active_alerts:
                response_text = "### Alerts Status\nNo active unresolved alerts on the factory floor."
            else:
                response_text = "### Active Unresolved Alerts\n"
                for idx, a in enumerate(active_alerts):
                    response_text += (
                        f"{idx+1}. **{a.title}** ({a.machine_id}) - Severity: **{a.severity}**\n"
                        f"   - **Message**: {a.message}\n"
                        f"   - **Cause**: {a.cause or 'Unknown'}\n"
                        f"   - **Recommendation**: {a.recommendation or 'Inspect immediately'}\n\n"
                    )
            sources = [{"type": "database_query", "table": "alerts"}]

        elif is_reports:
            # Query reports list
            reps = db.query(Report).order_by(Report.created_at.desc()).limit(5).all()
            if not reps:
                response_text = "### Intelligence Reports Registry\nNo performance reports have been compiled yet. Use the Reports panel to generate one."
            else:
                response_text = "### Compiled Plant Audit Reports (Latest 5)\n\n"
                for r in reps:
                    response_text += f"- **{r.title}** ({r.report_type}) - Generated on {r.created_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            sources = [{"type": "database_query", "table": "reports"}]

        elif is_sim:
            # Query simulation runs and recommendations
            from app.services.decision_engine import decision_engine
            recs = decision_engine.recommend_simulations(db)
            response_text = "### What-If Simulation Sandbox Status\n\n**Operator Recommendations:**\n"
            for r in recs[:3]:
                response_text += f"- **{r['scenario_type']} on {r['machine_id']}**: {r['reason']}\n"
            sources = [{"type": "agentic_tool", "tool": "simulation_planner"}]

        elif is_health or (any(m.id.lower() in p_low for m in db.query(Machine).all())):
            # Root cause / Machine health details
            from app.services.decision_engine import decision_engine
            summary_info = decision_engine.summarize_factory_health(db)
            response_text = summary_info["summary_markdown"]
            
            # Append recommended simulations
            sim_recs = decision_engine.recommend_simulations(db)
            if sim_recs:
                response_text += "\n**Recommended Diagnostic Simulations:**\n"
                for rec in sim_recs[:2]:
                    response_text += f"- **{rec['scenario_type']} on {rec['machine_id']}**: {rec['reason']}\n"
            sources = [{"type": "factory_summary", "overall_oee": summary_info["metrics"]["avg_oee"]}]

        # Step 3: Semantic QA Matching using TF-IDF Vector space
        elif self.vectorizer is not None and self.tfidf_matrix is not None and len(self.kb_data) > 0:
            try:
                query_vec = self.vectorizer.transform([prompt])
                similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
                best_match_idx = np.argmax(similarities)
                score = similarities[best_match_idx]
                
                if score >= 0.15:  # threshold of similarity
                    matched_qa = self.kb_data[best_match_idx]
                    base_answer = matched_qa["answer"]
                    
                    # Dynamically inject backend state variables based on QA category
                    from app.services.decision_engine import decision_engine
                    sum_metrics = decision_engine.summarize_factory_health(db)
                    m_metrics = sum_metrics["metrics"]
                    
                    state_msg = ""
                    cat_low = matched_qa.get("category", "").lower()
                    
                    if "health" in cat_low or "oee" in cat_low:
                        state_msg = f"\n\n**Current Live Status**: Overall factory average OEE is currently **{m_metrics['avg_oee']:.1f}%**, with {m_metrics['healthy_count']} healthy machine cells, {m_metrics['warning_count']} warning states, and {m_metrics['critical_count']} critical alerts."
                    elif "energy" in cat_low:
                        e_opt = decision_engine.generate_energy_optimization(db)
                        state_msg = f"\n\n**Current Live Status**: Total plant active energy draw is currently **{m_metrics['total_power_kw']:.1f} kW**. Dynamic calculations project potential annual savings of **${e_opt['total_potential_savings_usd']:.2f}** under shift staging rules."
                    elif "anomaly" in cat_low:
                        state_msg = f"\n\n**Current Live Status**: The platform registers {m_metrics['critical_count'] + m_metrics['warning_count']} active anomalies/alarms."
                    elif "maintenance" in cat_low:
                        plans = decision_engine.generate_maintenance_plans(db)
                        state_msg = f"\n\n**Current Live Status**: There are currently **{len(plans)}** machinery nodes flagged for predictive service scheduler reviews."
                    
                    response_text = base_answer + state_msg
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
        
        # Ensure a conversation session exists
        from app.database.models import CopilotConversation
        if not conversation_id:
            # Check if there is an active conversation or create one
            existing_conv = db.query(CopilotConversation).filter(CopilotConversation.user_id == user_id).order_by(CopilotConversation.created_at.desc()).first()
            if existing_conv:
                conversation_id = existing_conv.id
            else:
                new_conv = CopilotConversation(
                    user_id=user_id,
                    title=f"Session: {prompt[:30]}..."
                )
                db.add(new_conv)
                db.commit()
                db.refresh(new_conv)
                conversation_id = new_conv.id

        db_log = CopilotLog(
            user_id=user_id,
            conversation_id=conversation_id,
            prompt=prompt,
            response=response_text,
            sources=sources,
            created_at=datetime.utcnow()
        )
        db.add(db_log)
        db.commit()
        logger.info(f"Conversational Copilot log saved for User {user_id} in Conversation {conversation_id}")

        return {
            "response": response_text,
            "sources": sources,
            "conversation_id": conversation_id,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

    def get_logs(self, db: Session, user_id: Optional[int] = None, limit: int = 50) -> List[CopilotLog]:
        """Fetch past conversation log history."""
        query = db.query(CopilotLog)
        if user_id:
            query = query.filter(CopilotLog.user_id == user_id)
        return query.order_by(CopilotLog.created_at.desc()).limit(limit).all()

    def get_conversations(self, db: Session, user_id: Optional[int] = None) -> List[CopilotConversation]:
        """Fetch all conversation sessions for a user."""
        query = db.query(CopilotConversation)
        if user_id:
            query = query.filter(CopilotConversation.user_id == user_id)
        return query.order_by(CopilotConversation.created_at.desc()).all()

    def get_conversation_logs(self, db: Session, conversation_id: int) -> List[CopilotLog]:
        """Fetch all chat logs for a specific conversation session."""
        return db.query(CopilotLog).filter(CopilotLog.conversation_id == conversation_id).order_by(CopilotLog.created_at.asc()).all()

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
        from app.services.decision_engine import decision_engine
        p_low = prompt.lower()
        
        # 1. Maintenance plans query
        if any(w in p_low for w in ["maintenance", "need", "repair", "failing", "fail"]):
            plans = decision_engine.generate_maintenance_plans(db)
            if not plans:
                res = "### Predictive Maintenance Audit\nAll registered machine nodes are operating inside nominal ranges. No immediate maintenance actions are scheduled."
            else:
                res = "### Recommended Maintenance Planner Actions\nBased on failure risk indices and OEE metrics, the following corrective jobs are recommended:\n\n"
                for p in plans:
                    res += (
                        f"- **Machine {p['machine_id']}**: Priority **{p['priority']}**\n"
                        f"  - **Current Health**: {p['current_health']:.1f}%\n"
                        f"  - **Failure Prob**: {p['failure_probability']:.1%}\n"
                        f"  - **Timeframe Window**: *{p['maintenance_window']}*\n"
                        f"  - **Estimated Downtime / Cost**: {p['estimated_downtime_minutes']} mins / ${p['estimated_cost_usd']}\n"
                        f"  - **Action Item**: {p['suggested_action']}\n\n"
                    )
            sources = [{"type": "agentic_tool", "tool": "maintenance_planner"}]
            return res, sources

        # 2. Specific machine root-cause analysis
        m_match = re.search(r'(m_\d+)', p_low)
        if m_match or (any(w in p_low for w in ["why", "cause", "reason"]) and any(m.id.lower() in p_low for m in db.query(Machine).all())):
            m_id = m_match.group(1).upper() if m_match else "M_001"
            machine = db.query(Machine).filter(Machine.id == m_id).first()
            if not machine:
                return f"Machine {m_id} is not registered in the system.", []
                
            from app.database.models import HealthPrediction, AnomalyPrediction
            last_health = db.query(HealthPrediction).filter(HealthPrediction.machine_id == m_id).order_by(HealthPrediction.timestamp.desc()).first()
            last_anomaly = db.query(AnomalyPrediction).filter(AnomalyPrediction.machine_id == m_id).order_by(AnomalyPrediction.timestamp.desc()).first()
            active_alerts = db.query(Alert).filter(Alert.machine_id == m_id, Alert.is_resolved == False).all()
            
            res = f"### Root Cause & Diagnostics: Machine **{machine.name} ({m_id})**\n\n"
            
            if last_health:
                res += f"- **OEE Health score**: {last_health.health_score:.1f}/100\n"
                res += f"- **Catastrophic Failure Probability**: {last_health.failure_risk:.1%}\n"
                res += f"- **Maintenance Priority**: **{last_health.maintenance_priority}**\n\n"
                
            reasons = []
            if last_anomaly and last_anomaly.anomaly_detected:
                reasons.append(
                    f"**Sensor Anomaly Flagged** ({last_anomaly.anomaly_type}): "
                    f"Cause: {last_anomaly.cause}. Impact: {last_anomaly.impact_estimation}. Suggested Action: {last_anomaly.suggested_action}."
                )
            for a in active_alerts:
                reasons.append(
                    f"**Active Alert**: {a.title} - Cause: {a.cause}. Impact: {a.impact}. Action: {a.recommendation}."
                )
                
            if not reasons:
                reasons.append("No active alerts, threshold deviations, or telemetry anomalies registered.")
                
            res += "**Contributing Risk Factors:**\n" + "\n".join([f"{idx+1}. {r}" for idx, r in enumerate(reasons)])
            sources = [{"type": "root_cause_analysis", "machine_id": m_id}]
            return res, sources

        # 3. Anomaly explanation
        if any(w in p_low for w in ["anomaly", "abnormal", "strange", "deviat"]):
            from app.database.models import AnomalyPrediction
            latest_anomaly = db.query(AnomalyPrediction).order_by(AnomalyPrediction.timestamp.desc()).first()
            if latest_anomaly and latest_anomaly.anomaly_detected:
                res = (
                    f"### Sensor Anomaly Audit\n"
                    f"An active anomaly was detected on machine **{latest_anomaly.machine_id}** "
                    f"at {latest_anomaly.timestamp.strftime('%Y-%m-%d %H:%M:%S')} using the **{latest_anomaly.method}** engine.\n\n"
                    f"- **Anomaly Severity**: **{latest_anomaly.severity}**\n"
                    f"- **Anomaly Type**: {latest_anomaly.anomaly_type}\n"
                    f"- **Estimated Cause**: {latest_anomaly.cause}\n"
                    f"- **Failure Impact**: {latest_anomaly.impact_estimation}\n"
                    f"- **Local Confidence Score**: {latest_anomaly.confidence_score:.1%}\n"
                    f"- **Operator Recommendation**: *{latest_anomaly.suggested_action}*"
                )
            else:
                res = "### Sensor Anomaly Audit\nNo active anomalies detected across the plant floor. All streams align with standard distributions."
            sources = [{"type": "database_query", "table": "anomaly_predictions"}]
            return res, sources

        # 4. Energy footprint query
        if any(w in p_low for w in ["energy", "electricity", "power", "consume"]):
            energy_insights = decision_engine.generate_energy_optimization(db)
            ranking = energy_insights["machines_ranking"]
            
            if not ranking:
                res = "### Energy Audit\nNo active telemetry logs loaded in energy database."
            else:
                res = f"### Factory Energy Footprint & Optimization\n"
                res += f"- **Potential Savings Available**: **${energy_insights['total_potential_savings_usd']:.2f}/year**\n"
                res += f"- **Peak Load Machines**: {', '.join(energy_insights['peak_load_assets']) or 'None'}\n\n"
                res += "**Asset Load Consumption Ranking:**\n"
                for idx, r in enumerate(ranking):
                    res += f"{idx+1}. Machine **{r['machine_id']}**: **{r['power_draw_kw']:.1f} kW** | Waste: {r['waste_pct']}% | Potential Savings: ${r['annual_cost_savings_usd']}/yr\n"
                
                res += "\n**Optimization Suggestions:**\n"
                for sug in energy_insights["optimization_suggestions"]:
                    res += f"- **[{sug['category']}]**: {sug['message']} (Savings: ${sug['estimated_savings_usd']}/yr)\n"
            sources = [{"type": "agentic_tool", "tool": "energy_optimizer"}]
            return res, sources

        # 5. Bottleneck query
        if any(w in p_low for w in ["bottleneck", "delay", "congestion", "slow"]):
            bottlenecks = relationship_engine.analyze_bottlenecks(db)
            ranking = bottlenecks["bottlenecks_ranking"]
            
            if not ranking:
                res = "### Production Flow Audit\nNo bottleneck history logged."
            else:
                res = "### Production Flow & Bottleneck Diagnostics\n"
                primary = bottlenecks["primary_bottleneck"]
                if primary:
                    res += f"**Primary Bottleneck Node**: Machine **{primary['machine_id']}** (Score: {primary['bottleneck_score']}/10 | Delay: {primary['predicted_delay_seconds']}s)\n\n"
                
                res += "**Flow Congestion Ranking:**\n"
                for r in ranking:
                    res += f"- **Machine {r['machine_id']}**: Score **{r['bottleneck_score']:.1f}** | Congestion Prob: {r['congestion_probability']:.1%} | Status: **{r['status']}**\n"
                
                if bottlenecks["propagation_impact"]:
                    res += "\n**Downstream Starvation Impact:**\n"
                    for imp in bottlenecks["propagation_impact"]:
                        res += f"- Downstream machine **{imp['downstream_machine_id']}**: Risk increases by +{imp['risk_increase_pct']}% | Expected delay: {imp['expected_cycle_delay_seconds']}s\n"
            sources = [{"type": "agentic_tool", "tool": "bottleneck_analyzer"}]
            return res, sources

        # 6. Factory health summary
        if any(w in p_low for w in ["summarize", "summary", "overview", "factory", "shop", "floor", "oee", "downtime"]):
            summary_info = decision_engine.summarize_factory_health(db)
            res = summary_info["summary_markdown"]
            
            # Append recommended simulations
            sim_recs = decision_engine.recommend_simulations(db)
            if sim_recs:
                res += "\n**Recommended Diagnostic Simulations:**\n"
                for rec in sim_recs[:2]:
                    res += f"- **{rec['scenario_type']} on {rec['machine_id']}**: {rec['reason']}\n"
                    
            sources = [{"type": "factory_summary", "overall_oee": summary_info["metrics"]["avg_oee"]}]
            return res, sources

        return self._get_default_response(), []

copilot_service = CopilotService()
