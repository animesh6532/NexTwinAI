"""
NexTwin AI — ai-copilot/copilot.py
==================================
Main AI Copilot Agent script. Orchestrates RAG retriever, tool calling, 
and Ollama Llama3 model completions.

Author: Principal AI Architect & Senior LLM Architect
"""

import os
import requests
import json
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional

from ai_engine.ai_copilot.prompts import SYSTEM_PROMPT, COPILOT_INSTRUCTION
from ai_engine.ai_copilot.tools import (
    get_machines_list, get_active_alerts, get_machine_telemetry, check_maintenance_risk
)
from ai_engine.ai_copilot.rag_engine import SimpleRAGRetriever
from app.config.config import settings
from app.utils.logger import logger

class NexTwinCopilotAgent:
    def __init__(self):
        self.ollama_url = f"{settings.OLLAMA_HOST}/api/generate"
        self.model_name = settings.COPILOT_LLM_MODEL
        self.retriever = SimpleRAGRetriever(documents_dir=settings.DOCUMENTS_DIR)

    def run(self, db: Session, query: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Main execution loop:
        1. Query RAG to retrieve relevant operating procedures.
        2. Evaluate database state context using Python tools.
        3. Prompt local Ollama LLM with retrieved context, or run fallback logic.
        """
        # A. Retrieve RAG documents
        rag_hits = self.retriever.retrieve(query, top_k=2)
        rag_context = ""
        sources = []
        for hit in rag_hits:
            rag_context += f"Source [{hit['source']}]: {hit['content']}\n\n"
            sources.append({"type": "manual_document", "document": hit["source"], "passage": hit["content"]})

        # B. Query Database tool states
        db_context = ""
        # Auto-evaluate machine lists or telemetry based on keywords
        p_low = query.lower()
        if any(w in p_low for w in ["machine", "status", "list", "factory"]):
            db_context += "Current Machines State:\n" + get_machines_list(db) + "\n\n"
            sources.append({"type": "database_tool", "tool": "get_machines_list"})
            
        if any(w in p_low for w in ["alert", "warning", "alarm", "critical"]):
            db_context += "Active System Alerts:\n" + get_active_alerts(db) + "\n\n"
            sources.append({"type": "database_tool", "tool": "get_active_alerts"})
            
        # Target specific machine check
        for m_id in ["M_001", "M_002", "M_003"]:
            if m_id.lower() in p_low:
                db_context += get_machine_telemetry(db, m_id) + "\n\n"
                db_context += check_maintenance_risk(db, m_id) + "\n\n"
                sources.append({"type": "database_tool", "tool": f"get_machine_telemetry_{m_id}"})
                sources.append({"type": "database_tool", "tool": f"check_maintenance_risk_{m_id}"})

        # C. Format Instruction Prompt
        hist_str = ""
        if chat_history:
            hist_str = "\n".join([f"{h['role'].capitalize()}: {h['content']}" for h in chat_history])
            
        prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"=== INDUSTRIAL RAG CONTEXT ===\n{rag_context}\n"
            f"=== LIVE DATABASE CONTEXT ===\n{db_context}\n"
            f"=== CONVERSATION HISTORY ===\n{hist_str}\n\n"
            f"Operator Query: {query}\n"
            "Response:"
        )

        # D. Call Ollama API
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.2
            }
        }
        
        try:
            logger.info(f"Dispatching query to Ollama LLM model: {self.model_name}")
            response = requests.post(self.ollama_url, json=payload, timeout=10)
            if response.status_code == 200:
                resp_json = response.json()
                llm_response = resp_json.get("response", "").strip()
                return {
                    "response": llm_response,
                    "sources": sources
                }
            else:
                logger.warning(f"Ollama server returned error code: {response.status_code}. Reverting to local analytics.")
                return self._local_analytical_solver(query, db_context, rag_context, sources)
        except Exception as e:
            logger.warning(f"Ollama LLM endpoint unreachable ({str(e)}). Executing local analytical fallback solver.")
            return self._local_analytical_solver(query, db_context, rag_context, sources)

    def _local_analytical_solver(self, query: str, db_context: str, rag_context: str, sources: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Local analytical reasoning solver when Ollama LLM is offline"""
        p_low = query.lower()
        
        # Build answer using tool details directly
        response = (
            "⚠️ **Notice: Ollama LLM Server is offline. Running Local Analytical Diagnostic Solver.**\n\n"
        )
        
        if db_context:
            response += f"Based on live asset status databases, I have retrieved the following metrics:\n\n{db_context}"
        else:
            response += "I can monitor active alerts, OEE bottlenecks, machine telemetry states, and answer procedures. Try asking about machine statuses or active alerts.\n\n"
            
        if rag_context:
            response += f"**Retrieved Standard Operating Manual chunk:**\n{rag_context}"
            
        return {
            "response": response,
            "sources": sources
        }
# Standard type annotations
Session = Any
