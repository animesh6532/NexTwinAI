"""
NexTwin AI — relationship_engine.py
==================================
Industrial machine dependency, relationship graph, and failure propagation service.
Analyzes bottleneck propagation and upstream/downstream impacts.

Author: Principal Industrial AI Architect & Manufacturing Systems Designer
"""

from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from app.database.models import Machine, HealthPrediction, BottleneckPrediction, AnomalyPrediction

# Defined factory layout dependencies
# Upstream -> Downstream relationships
DEPENDENCY_MAP = {
    "M_001": ["M_002", "M_003"],
    "M_002": ["M_004"],
    "M_003": ["M_004"],
    "M_004": ["M_005"],
    "M_005": ["M_006"],
    "M_006": []
}

class MachineRelationshipEngine:
    @staticmethod
    def get_dependencies(machine_id: str) -> Dict[str, List[str]]:
        """Returns upstream and downstream dependencies for a given machine"""
        downstream = DEPENDENCY_MAP.get(machine_id, [])
        upstream = []
        for u_id, d_list in DEPENDENCY_MAP.items():
            if machine_id in d_list:
                upstream.append(u_id)
        
        return {
            "upstream": upstream,
            "downstream": downstream
        }

    @staticmethod
    def get_relationship_graph() -> Dict[str, Any]:
        """Returns the full network graph structure for frontend React Flow"""
        nodes = []
        edges = []
        
        # Hardcoded locations for standard machines to align nicely in layout
        locations = {
            "M_001": {"x": 100, "y": 160, "name": "CNC Mill Machine 01", "type": "M"},
            "M_002": {"x": 440, "y": 40, "name": "Hydraulic Press Machine 02", "type": "H"},
            "M_003": {"x": 440, "y": 280, "name": "Robotic Welder Machine 03", "type": "L"},
            "M_004": {"x": 780, "y": 160, "name": "Main Assembly Line 04", "type": "M"},
            "M_005": {"x": 1120, "y": 160, "name": "Conveyor Stage 2 Node 05", "type": "L"},
            "M_006": {"x": 1460, "y": 160, "name": "Packaging Inspection 06", "type": "H"}
        }

        for m_id, loc in locations.items():
            nodes.append({
                "id": m_id,
                "name": loc["name"],
                "type": loc["type"],
                "x": loc["x"],
                "y": loc["y"]
            })
            
        for source, targets in DEPENDENCY_MAP.items():
            for target in targets:
                edges.append({
                    "id": f"{source}-{target}",
                    "source": source,
                    "target": target
                })
                
        return {"nodes": nodes, "edges": edges}

    @classmethod
    def simulate_failure_propagation(cls, db: Session, failed_machine_id: str) -> Dict[str, Any]:
        """
        Simulates the propagation impact of a machine failure.
        - Downstream machines starve of feedstock, becoming Idle/Offline (Operational status drops, energy drops).
        - Upstream machines accumulate backlogs, backing up queues, causing congestion and potential safety trips.
        """
        dependencies = cls.get_dependencies(failed_machine_id)
        
        # Track propagation breadth-first
        impacted_downstream = []
        queue = list(dependencies["downstream"])
        visited = set()
        while queue:
            node = queue.pop(0)
            if node not in visited:
                visited.add(node)
                impacted_downstream.append(node)
                queue.extend(DEPENDENCY_MAP.get(node, []))

        impacted_upstream = []
        queue = list(dependencies["upstream"])
        visited_up = set()
        while queue:
            node = queue.pop(0)
            if node not in visited_up:
                visited_up.add(node)
                impacted_upstream.append(node)
                # find upstream nodes for this node
                for u_id, d_list in DEPENDENCY_MAP.items():
                    if node in d_list:
                        queue.append(u_id)

        # Estimate impact details
        downstream_starvation_delays = {}
        for d_id in impacted_downstream:
            # Downstream delay increases exponentially the further down the chain
            dist = len(impacted_downstream) - impacted_downstream.index(d_id)
            downstream_starvation_delays[d_id] = {
                "status": "Starved / Idle",
                "starvation_delay_seconds": dist * 45,
                "estimated_throughput_reduction_pct": min(95.0, 50.0 + (dist * 15.0)),
                "suggested_action": "Pause line feeder / Switch to parallel buffer line"
            }

        upstream_backlog_buffers = {}
        for u_id in impacted_upstream:
            # Upstream backlog grows as raw material builds up
            dist = len(impacted_upstream) - impacted_upstream.index(u_id)
            upstream_backlog_buffers[u_id] = {
                "status": "Backlogged / Buffer Overflow",
                "queue_backlog_increase_units": dist * 8,
                "congestion_risk_pct": min(98.0, 60.0 + (dist * 10.0)),
                "suggested_action": "Activate upstream holding lock / Decelerate feed conveyor"
            }

        all_affected = [failed_machine_id] + impacted_downstream + impacted_upstream
        
        # Calculate OEE / Downtime impact estimate
        estimated_downtime_minutes = 120.0  # base repair window
        oee_reduction_pct = 15.0 + (len(all_affected) * 7.5)
        
        return {
            "failed_machine_id": failed_machine_id,
            "status": "Critical Starvation/Backlog Triggered",
            "propagation_depth": max(len(impacted_downstream), len(impacted_upstream)),
            "affected_machines": all_affected,
            "impacted_downstream": downstream_starvation_delays,
            "impacted_upstream": upstream_backlog_buffers,
            "failure_impact_analysis": {
                "overall_factory_oee_impact_pct": round(oee_reduction_pct, 2),
                "estimated_recovery_minutes": estimated_downtime_minutes,
                "severity_level": "Emergency" if len(all_affected) > 3 else "Critical"
            }
        }

    @classmethod
    def analyze_bottlenecks(cls, db: Session) -> Dict[str, Any]:
        """Identifies current active bottleneck nodes in the dependency layout"""
        # Query bottleneck risk indices from BottleneckPrediction
        machines = db.query(Machine).all()
        bottlenecks = []
        
        for m in machines:
            last_bp = db.query(BottleneckPrediction).filter(
                BottleneckPrediction.machine_id == m.id
            ).order_by(BottleneckPrediction.timestamp.desc()).first()
            
            risk_score = last_bp.bottleneck_risk_score if last_bp else 1.0
            delay = last_bp.predicted_production_delay if last_bp else 0.0
            congestion = last_bp.congestion_probability if last_bp else 0.0
            
            # Rank score based on queue and latency
            bottlenecks.append({
                "machine_id": m.id,
                "name": m.name,
                "bottleneck_score": risk_score,
                "congestion_probability": congestion,
                "predicted_delay_seconds": delay,
                "status": "Critical Bottleneck" if risk_score > 7.5 else "Warning" if risk_score > 4.5 else "Nominal"
            })
            
        bottlenecks.sort(key=lambda x: x["bottleneck_score"], reverse=True)
        primary_bottleneck = bottlenecks[0] if bottlenecks else None
        
        # Calculate bottleneck propagation impact on downstream nodes
        propagation_impact = []
        if primary_bottleneck and primary_bottleneck["bottleneck_score"] > 4.5:
            downstream = DEPENDENCY_MAP.get(primary_bottleneck["machine_id"], [])
            for ds_id in downstream:
                propagation_impact.append({
                    "downstream_machine_id": ds_id,
                    "risk_increase_pct": round(primary_bottleneck["bottleneck_score"] * 8.5, 1),
                    "expected_cycle_delay_seconds": round(primary_bottleneck["predicted_delay_seconds"] * 0.7, 1)
                })
                
        return {
            "bottlenecks_ranking": bottlenecks,
            "primary_bottleneck": primary_bottleneck,
            "propagation_impact": propagation_impact
        }

relationship_engine = MachineRelationshipEngine()
