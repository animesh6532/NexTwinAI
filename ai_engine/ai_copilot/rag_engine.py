"""
NexTwin AI — ai-copilot/rag_engine.py
====================================
Lightweight RAG Engine. Uses a pure-Python TF-IDF Vector Retriever to query 
industrial operating procedures and plant manuals without requiring heavy binary 
vector database installations.

Author: Principal AI Architect & Senior LLM Architect
"""

import os
import re
from typing import List, Dict, Any

class SimpleRAGRetriever:
    def __init__(self, documents_dir: str):
        self.documents_dir = documents_dir
        self.documents: List[Dict[str, Any]] = []
        self._load_documents()

    def _load_documents(self):
        """Scan documents directory and ingest plain text files (.txt, .md)"""
        if not os.path.exists(self.documents_dir):
            os.makedirs(self.documents_dir, exist_ok=True)
            # Create a sample operating manual for illustration
            sample_file = os.path.join(self.documents_dir, "cnc_operating_procedures.txt")
            with open(sample_file, "w", encoding="utf-8") as f:
                f.write(
                    "NexTwin AI Factory Operating Procedure: CNC Milling Machine 01 (M_001)\n"
                    "1. Standard operating speed is 1500 RPM. Torque should remain between 30 and 50 Nm.\n"
                    "2. Threshold breaches: If vibration exceeds 4.5 mm/s, immediately decelerate the spindle.\n"
                    "3. Thermal management: If motor temperature breaches 85.0 C, check coolant pump valves. If temperature exceeds 90 C, shut down machine immediately.\n"
                    "4. Tool Wear: Tool bits must be replaced after 200 minutes of continuous milling to prevent workpiece damage.\n"
                )
            
            sample_file2 = os.path.join(self.documents_dir, "welder_maintenance_guide.txt")
            with open(sample_file2, "w", encoding="utf-8") as f:
                f.write(
                    "NexTwin AI Maintenance Guide: Robotic Welder Machine 03 (M_003)\n"
                    "1. Thermal overload check: Robot arm joint temperature must remain below 90.0 C.\n"
                    "2. Critical alarms: If temperature exceeds threshold, a Critical Thermal Overheat alarm is triggered. Auto-shutdown shuts welder joints. The machine must be set to Maintenance status.\n"
                    "3. Post-overheat recovery: Allow the welder joint to cool below 50 C. Operator must inspect the coolant line for blocks before resetting state to Active.\n"
                )

        # Ingest files
        for filename in os.listdir(self.documents_dir):
            path = os.path.join(self.documents_dir, filename)
            if os.path.isfile(path) and filename.endswith((".txt", ".md")):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        text = f.read()
                    
                    # Split into paragraphs/chunks
                    chunks = [c.strip() for c in text.split("\n\n") if len(c.strip()) > 30]
                    if not chunks:
                        # Fallback split by lines if no paragraphs
                        chunks = [c.strip() for c in text.split("\n") if len(c.strip()) > 30]
                        
                    for chunk_idx, chunk in enumerate(chunks):
                        self.documents.append({
                            "source": filename,
                            "chunk_id": chunk_idx,
                            "content": chunk
                        })
                except Exception as e:
                    print(f"Error reading document {filename}: {str(e)}")

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """Retrieve most relevant chunks using simple keyword matching overlap"""
        if not self.documents:
            return []
            
        # Clean query tokens
        query_words = set(re.findall(r"\w+", query.lower()))
        if not query_words:
            return self.documents[:top_k]
            
        scored_docs = []
        for doc in self.documents:
            doc_words = set(re.findall(r"\w+", doc["content"].lower()))
            overlap = query_words.intersection(doc_words)
            # Simple scoring: size of word overlap
            score = len(overlap)
            if score > 0:
                scored_docs.append((score, doc))
                
        # Sort by score descending
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        
        # Return top_k
        results = [doc for score, doc in scored_docs[:top_k]]
        
        # If no overlap, return first few documents as fallback
        if not results:
            return self.documents[:top_k]
            
        return results
