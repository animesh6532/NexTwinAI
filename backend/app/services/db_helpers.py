from __future__ import annotations

import hashlib
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import Machine, User


def ensure_machine(db: Session, machine_id: Optional[str], machine_type: str = "M") -> Optional[Machine]:
    if not machine_id:
        return None
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if machine:
        return machine
    machine = Machine(
        id=machine_id,
        name=f"Auto-registered {machine_id}",
        type=machine_type or "M",
        operational_status="Active",
        location="Digital Twin",
    )
    db.add(machine)
    db.flush()
    return machine


def ensure_user(db: Session, user_id: Optional[int] = 1) -> Optional[User]:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return user
    user = User(
        id=user_id,
        username=f"system_user_{user_id}",
        email=f"system_user_{user_id}@nextwin.local",
        hashed_password=hashlib.sha256(f"system_user_{user_id}".encode("utf-8")).hexdigest(),
        role="operator",
        is_active=True,
    )
    db.add(user)
    db.flush()
    return user
