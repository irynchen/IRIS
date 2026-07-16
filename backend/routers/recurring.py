from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/recurring", tags=["recurring"])

WEEKDAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


class RecurringIn(BaseModel):
    title: str
    weekdays: List[int]        # 0=Mo … 6=So
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    color: str = "#9B7EBD"


class RecurringOut(BaseModel):
    id: int
    title: str
    weekdays: List[int]
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    color: str
    active: bool


def row_to_out(r) -> dict:
    return {
        "id":        r["id"],
        "title":     r["title"],
        "weekdays":  list(r["weekdays"]),
        "time_from": str(r["time_from"])[:5] if r["time_from"] else None,
        "time_to":   str(r["time_to"])[:5]   if r["time_to"]   else None,
        "color":     r["color"],
        "active":    r["active"],
    }


def parse_time(s: Optional[str]):
    if not s:
        return None
    from datetime import time
    parts = s.split(":")
    return time(int(parts[0]), int(parts[1]))


@router.get("", response_model=List[RecurringOut])
async def list_recurring(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, title, weekdays, time_from, time_to, color, active "
            "FROM recurring_events ORDER BY id"
        )
        return [row_to_out(r) for r in rows]


@router.post("", response_model=RecurringOut)
async def create_recurring(item: RecurringIn, user=Depends(get_current_user)):
    if not item.weekdays:
        raise HTTPException(status_code=400, detail="weekdays must not be empty")
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO recurring_events (title, weekdays, time_from, time_to, color) "
            "VALUES ($1, $2, $3, $4, $5) "
            "RETURNING id, title, weekdays, time_from, time_to, color, active",
            item.title, item.weekdays,
            parse_time(item.time_from), parse_time(item.time_to),
            item.color,
        )
        return row_to_out(row)


@router.patch("/{rec_id}", response_model=RecurringOut)
async def update_recurring(rec_id: int, item: RecurringIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE recurring_events SET title=$2, weekdays=$3, time_from=$4, time_to=$5, color=$6 "
            "WHERE id=$1 "
            "RETURNING id, title, weekdays, time_from, time_to, color, active",
            rec_id, item.title, item.weekdays,
            parse_time(item.time_from), parse_time(item.time_to),
            item.color,
        )
        if not row:
            raise HTTPException(status_code=404)
        return row_to_out(row)


@router.delete("/{rec_id}")
async def delete_recurring(rec_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM recurring_events WHERE id=$1", rec_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404)
    return {"ok": True}
