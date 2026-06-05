from fastapi import APIRouter
from typing import List
from pydantic import BaseModel
from ..database import get_pool

router = APIRouter(prefix="/api/day", tags=["day"])

class DayPlanIn(BaseModel):
    date: str
    time_from: str | None = None
    time_to: str | None = None
    title: str
    category: str | None = None

class DayPlanOut(DayPlanIn):
    id: int
    completed: bool | None = False

@router.get("/plans", response_model=List[DayPlanOut])
async def list_plans(date: str | None = None):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if date:
            rows = await conn.fetch("SELECT id, date::text AS date, time_from::text, time_to::text, title, category, completed FROM day_plan WHERE date = $1 ORDER BY time_from",
                                    date)
        else:
            rows = await conn.fetch("SELECT id, date::text AS date, time_from::text, time_to::text, title, category, completed FROM day_plan ORDER BY date DESC LIMIT 100")
        return [dict(r) for r in rows]

@router.post("/plans", response_model=DayPlanOut)
async def create_plan(item: DayPlanIn):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("INSERT INTO day_plan (date, time_from, time_to, title, category) VALUES ($1,$2,$3,$4,$5) RETURNING id, date::text AS date, time_from::text, time_to::text, title, category, completed",
                                  item.date, item.time_from, item.time_to, item.title, item.category)
        return dict(row)
