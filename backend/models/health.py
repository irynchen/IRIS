# Pydantic models for health (if needed by internal code)
from pydantic import BaseModel
from typing import Optional

class HealthRecord(BaseModel):
    id: Optional[int]
    date: str
    weight_kg: Optional[float]
    notes: Optional[str]
