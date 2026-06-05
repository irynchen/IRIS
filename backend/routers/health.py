from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/health", tags=["health"])


class HealthRecordIn(BaseModel):
    date: str
    weight_kg: Optional[float] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    knee_pain: Optional[int] = None
    knee_swelling: Optional[str] = None
    steps: Optional[int] = None
    mood: Optional[int] = None
    energy: Optional[int] = None
    notes: Optional[str] = None


class HealthRecordOut(HealthRecordIn):
    id: int


@router.get("/records", response_model=List[HealthRecordOut])
async def list_records(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, date::text AS date, weight_kg, bp_systolic, bp_diastolic, pulse, "
            "sleep_hours, sleep_quality, knee_pain, knee_swelling, steps, mood, energy, notes "
            "FROM health_records ORDER BY date DESC LIMIT 200"
        )
        return [dict(r) for r in rows]


@router.post("/records", response_model=HealthRecordOut)
async def create_record(item: HealthRecordIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO health_records (date, weight_kg, bp_systolic, bp_diastolic, pulse, "
            "sleep_hours, sleep_quality, knee_pain, knee_swelling, steps, mood, energy, notes) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) "
            "RETURNING id, date::text AS date, weight_kg, bp_systolic, bp_diastolic, pulse, "
            "sleep_hours, sleep_quality, knee_pain, knee_swelling, steps, mood, energy, notes",
            item.date, item.weight_kg, item.bp_systolic, item.bp_diastolic, item.pulse,
            item.sleep_hours, item.sleep_quality, item.knee_pain, item.knee_swelling,
            item.steps, item.mood, item.energy, item.notes,
        )
        return dict(row)
