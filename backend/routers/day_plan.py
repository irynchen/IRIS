from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/day", tags=["day"])


class DayPlanIn(BaseModel):
    date: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    title: str
    category: Optional[str] = None
    priority: int = 2
    notes: Optional[str] = None


class DayPlanPatch(BaseModel):
    completed: Optional[bool] = None
    title: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = None
    notes: Optional[str] = None
    time_from: Optional[str] = None
    time_to: Optional[str] = None


class DayPlanOut(BaseModel):
    id: int
    date: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    title: str
    category: Optional[str] = None
    priority: int
    completed: bool
    notes: Optional[str] = None


@router.get("/plans", response_model=List[DayPlanOut])
async def list_plans(date: Optional[str] = None, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if date:
            rows = await conn.fetch(
                "SELECT id, date::text AS date, time_from::text, time_to::text, title, "
                "category, priority, completed, notes FROM day_plan WHERE date = $1 ORDER BY time_from NULLS LAST, id",
                date,
            )
        else:
            rows = await conn.fetch(
                "SELECT id, date::text AS date, time_from::text, time_to::text, title, "
                "category, priority, completed, notes FROM day_plan ORDER BY date DESC, time_from NULLS LAST LIMIT 200"
            )
        return [dict(r) for r in rows]


@router.post("/plans", response_model=DayPlanOut)
async def create_plan(item: DayPlanIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO day_plan (date, time_from, time_to, title, category, priority, notes) "
            "VALUES ($1,$2,$3,$4,$5,$6,$7) "
            "RETURNING id, date::text AS date, time_from::text, time_to::text, title, category, priority, completed, notes",
            item.date, item.time_from, item.time_to, item.title, item.category, item.priority, item.notes,
        )
        return dict(row)


@router.patch("/plans/{plan_id}", response_model=DayPlanOut)
async def patch_plan(plan_id: int, patch: DayPlanPatch, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM day_plan WHERE id = $1", plan_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Plan not found")

        updates = patch.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
        values = list(updates.values())
        row = await conn.fetchrow(
            f"UPDATE day_plan SET {set_clauses} WHERE id = $1 "
            "RETURNING id, date::text AS date, time_from::text, time_to::text, title, category, priority, completed, notes",
            plan_id, *values,
        )
        return dict(row)


@router.delete("/plans/{plan_id}")
async def delete_plan(plan_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM day_plan WHERE id = $1", plan_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Plan not found")
    return {"ok": True}
