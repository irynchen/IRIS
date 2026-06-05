from fastapi import APIRouter, Depends, HTTPException
from typing import List
from pydantic import BaseModel
from ..database import get_pool

router = APIRouter(prefix="/api/health", tags=["health"])

class HealthRecordIn(BaseModel):
    date: str
    weight_kg: float | None = None
    notes: str | None = None

class HealthRecordOut(HealthRecordIn):
    id: int

@router.get("/records", response_model=List[HealthRecordOut])
async def list_records():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, date::text AS date, weight_kg, notes FROM health_records ORDER BY date DESC LIMIT 100")
        return [dict(r) for r in rows]

@router.post("/records", response_model=HealthRecordOut)
async def create_record(item: HealthRecordIn):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("INSERT INTO health_records (date, weight_kg, notes) VALUES ($1, $2, $3) RETURNING id, date::text AS date, weight_kg, notes",
                                  item.date, item.weight_kg, item.notes)
        return dict(row)
