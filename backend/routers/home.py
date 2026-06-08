from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as Date, timedelta
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/home", tags=["home"])

# Subquery used in every task query to scope to the Zuhause area
HOME_AREA = "(SELECT id FROM areas WHERE slug = 'home')"


def compute_status(last_done_str: Optional[str], frequency_days: Optional[int]) -> str:
    if not frequency_days:
        return "ok"
    today = Date.today()
    if not last_done_str:
        return "overdue"
    from datetime import datetime
    last_done = datetime.strptime(last_done_str, "%Y-%m-%d").date()
    next_due = last_done + timedelta(days=frequency_days)
    days_left = (next_due - today).days
    if days_left < 0:
        return "overdue"
    if days_left <= 2:
        return "due_soon"
    return "ok"


SELECT_TASK = (
    "id, room_id, title, frequency_days, last_done::text, next_due::text, priority, notes"
)


class RoomIn(BaseModel):
    name: str
    icon: Optional[str] = None
    sort_order: int = 0


class RoomOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    sort_order: int


class TaskIn(BaseModel):
    room_id: int
    title: str
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None
    priority: int = 2
    notes: Optional[str] = None


class TaskPatch(BaseModel):
    title: Optional[str] = None
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None       # empty string "" means reset to NULL
    next_due: Optional[str] = None        # empty string "" means reset to NULL
    priority: Optional[int] = None
    notes: Optional[str] = None


class TaskOut(BaseModel):
    id: int
    room_id: int
    title: str
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None
    next_due: Optional[str] = None
    priority: int
    notes: Optional[str] = None
    status: str = "ok"


def row_to_task(row) -> dict:
    d = dict(row)
    d["status"] = compute_status(d.get("last_done"), d.get("frequency_days"))
    return d


@router.get("/rooms", response_model=List[RoomOut])
async def list_rooms(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, icon, sort_order FROM home_rooms ORDER BY sort_order")
        return [dict(r) for r in rows]


@router.post("/rooms", response_model=RoomOut)
async def create_room(item: RoomIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO home_rooms (name, icon, sort_order) VALUES ($1,$2,$3) "
            "RETURNING id, name, icon, sort_order",
            item.name, item.icon, item.sort_order,
        )
        return dict(row)


@router.get("/tasks", response_model=List[TaskOut])
async def list_tasks(room_id: Optional[int] = None, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if room_id:
            rows = await conn.fetch(
                f"SELECT {SELECT_TASK} FROM tasks "
                f"WHERE area_id = {HOME_AREA} AND room_id = $1 ORDER BY priority, title",
                room_id,
            )
        else:
            rows = await conn.fetch(
                f"SELECT {SELECT_TASK} FROM tasks "
                f"WHERE area_id = {HOME_AREA} ORDER BY priority, next_due NULLS LAST"
            )
        return [row_to_task(r) for r in rows]


@router.get("/today", response_model=List[TaskOut])
async def today_tasks(user=Depends(get_current_user)):
    """Tasks that are overdue or due within 2 days."""
    two_days = Date.today() + timedelta(days=2)
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT {SELECT_TASK} FROM tasks "
            f"WHERE area_id = {HOME_AREA} AND next_due IS NOT NULL AND next_due <= $1 "
            "ORDER BY next_due, priority",
            two_days,
        )
        return [row_to_task(r) for r in rows]


@router.post("/tasks", response_model=TaskOut)
async def create_task(item: TaskIn, user=Depends(get_current_user)):
    last_done = Date.fromisoformat(item.last_done) if item.last_done else None
    next_due = None
    if last_done and item.frequency_days:
        next_due = last_done + timedelta(days=item.frequency_days)
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"INSERT INTO tasks (area_id, room_id, title, frequency_days, last_done, next_due, priority, notes) "
            f"VALUES ({HOME_AREA},$1,$2,$3,$4,$5,$6,$7) RETURNING {SELECT_TASK}",
            item.room_id, item.title, item.frequency_days, last_done, next_due, item.priority, item.notes,
        )
        return row_to_task(row)


@router.post("/tasks/{task_id}/done", response_model=TaskOut)
async def mark_done(task_id: int, user=Depends(get_current_user)):
    today = Date.today()
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            f"SELECT id, frequency_days FROM tasks WHERE id = $1 AND area_id = {HOME_AREA}",
            task_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        freq = existing["frequency_days"]
        next_due = today + timedelta(days=freq) if freq else None
        row = await conn.fetchrow(
            f"UPDATE tasks SET last_done = $1, next_due = $2 WHERE id = $3 "
            f"RETURNING {SELECT_TASK}",
            today, next_due, task_id,
        )
        return row_to_task(row)


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def patch_task(task_id: int, patch: TaskPatch, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            f"SELECT id, frequency_days FROM tasks WHERE id = $1 AND area_id = {HOME_AREA}",
            task_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        updates = patch.model_dump(exclude_none=True)

        # empty string "" → NULL (reset date fields)
        for field in ("last_done", "next_due"):
            if field in updates and updates[field] == "":
                updates[field] = None

        if "last_done" in updates and "next_due" not in updates:
            freq = existing["frequency_days"]
            if freq and updates["last_done"]:
                from datetime import datetime
                ld = datetime.strptime(updates["last_done"], "%Y-%m-%d").date()
                updates["next_due"] = ld + timedelta(days=freq)
            elif not updates["last_done"]:
                updates["next_due"] = None

        # convert date strings to date objects for asyncpg
        for field in ("last_done", "next_due"):
            if field in updates and isinstance(updates[field], str) and updates[field]:
                from datetime import datetime
                updates[field] = datetime.strptime(updates[field], "%Y-%m-%d").date()

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
        values = list(updates.values())
        row = await conn.fetchrow(
            f"UPDATE tasks SET {set_clauses} WHERE id = $1 RETURNING {SELECT_TASK}",
            task_id, *values,
        )
        return row_to_task(row)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            f"DELETE FROM tasks WHERE id = $1 AND area_id = {HOME_AREA}",
            task_id,
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}


@router.get("/overdue-count")
async def overdue_count(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"SELECT COUNT(*) AS count FROM tasks "
            f"WHERE area_id = {HOME_AREA} AND next_due < CURRENT_DATE"
        )
        return {"count": row["count"]}
