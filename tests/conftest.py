import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
sys.path.insert(0, str(PROJECT_ROOT))
os.environ.setdefault("DATABASE_URL", f"sqlite:///{PROJECT_ROOT / 'backend' / 'app' / 'database' / 'test.db'}")
os.environ.setdefault("AUTO_CREATE_TABLES", "true")
