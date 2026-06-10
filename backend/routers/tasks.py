"""Generic task router — works for any area by slug (beauty, learning, car, …)."""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as Date, timedelta
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

SELECT_TASK = (
    "id, area_id, category_id, room_id, title, notes, priority, "
    "duration, energy_level, frequency_days, "
    "last_done::text, next_due::text"
)


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


def row_to_task(row) -> dict:
    d = dict(row)
    d["status"] = compute_status(d.get("last_done"), d.get("frequency_days"))
    return d


class AreaInfo(BaseModel):
    id: int
    slug: str
    name: str
    icon: Optional[str] = None
    color: Optional[str] = None
    has_rooms: bool


class CategoryOut(BaseModel):
    id: int
    name: str
    icon: Optional[str] = None
    sort_order: int


class AreaTaskIn(BaseModel):
    title: str
    category_id: Optional[int] = None
    priority: int = 2
    notes: Optional[str] = None
    duration: Optional[str] = None
    energy_level: Optional[str] = None
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None
    next_due: Optional[str] = None


class AreaTaskPatch(BaseModel):
    title: Optional[str] = None
    category_id: Optional[int] = None
    priority: Optional[int] = None
    notes: Optional[str] = None
    duration: Optional[str] = None
    energy_level: Optional[str] = None
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None
    next_due: Optional[str] = None


class AreaTaskOut(BaseModel):
    id: int
    area_id: int
    category_id: Optional[int] = None
    room_id: Optional[int] = None
    title: str
    notes: Optional[str] = None
    priority: int
    duration: Optional[str] = None
    energy_level: Optional[str] = None
    frequency_days: Optional[int] = None
    last_done: Optional[str] = None
    next_due: Optional[str] = None
    status: str = "ok"


async def _get_area_id(conn, slug: str) -> int:
    area_id = await conn.fetchval("SELECT id FROM areas WHERE slug = $1", slug)
    if not area_id:
        raise HTTPException(status_code=404, detail=f"Area '{slug}' not found")
    return area_id


@router.get("/{slug}/info", response_model=AreaInfo)
async def get_area_info(slug: str, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, slug, name, icon, color, has_rooms FROM areas WHERE slug = $1", slug
        )
        if not row:
            raise HTTPException(status_code=404, detail=f"Area '{slug}' not found")
        return dict(row)


@router.get("/{slug}/categories", response_model=List[CategoryOut])
async def list_categories(slug: str, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT ac.id, ac.name, ac.icon, ac.sort_order "
            "FROM area_categories ac "
            "JOIN areas a ON ac.area_id = a.id "
            "WHERE a.slug = $1 "
            "ORDER BY ac.sort_order",
            slug,
        )
        return [dict(r) for r in rows]


@router.get("/{slug}", response_model=List[AreaTaskOut])
async def list_tasks(
    slug: str,
    category_id: Optional[int] = None,
    user=Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        area_id = await _get_area_id(conn, slug)
        if category_id:
            rows = await conn.fetch(
                f"SELECT {SELECT_TASK} FROM tasks "
                f"WHERE area_id = $1 AND category_id = $2 "
                f"ORDER BY priority DESC, next_due NULLS LAST, title",
                area_id, category_id,
            )
        else:
            rows = await conn.fetch(
                f"SELECT {SELECT_TASK} FROM tasks "
                f"WHERE area_id = $1 "
                f"ORDER BY priority DESC, next_due NULLS LAST, title",
                area_id,
            )
        return [row_to_task(r) for r in rows]


@router.post("/{slug}", response_model=AreaTaskOut)
async def create_task(slug: str, item: AreaTaskIn, user=Depends(get_current_user)):
    last_done = Date.fromisoformat(item.last_done) if item.last_done else None
    if item.next_due:
        next_due = Date.fromisoformat(item.next_due)
    elif last_done and item.frequency_days:
        next_due = last_done + timedelta(days=item.frequency_days)
    else:
        next_due = None
    pool = await get_pool()
    async with pool.acquire() as conn:
        area_id = await _get_area_id(conn, slug)
        row = await conn.fetchrow(
            f"INSERT INTO tasks "
            f"(area_id, category_id, title, notes, priority, duration, energy_level, "
            f"frequency_days, last_done, next_due) "
            f"VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING {SELECT_TASK}",
            area_id, item.category_id, item.title, item.notes, item.priority,
            item.duration, item.energy_level, item.frequency_days, last_done, next_due,
        )
        return row_to_task(row)


@router.post("/{slug}/{task_id}/done", response_model=AreaTaskOut)
async def mark_done(slug: str, task_id: int, user=Depends(get_current_user)):
    today = Date.today()
    pool = await get_pool()
    async with pool.acquire() as conn:
        area_id = await _get_area_id(conn, slug)
        existing = await conn.fetchrow(
            "SELECT id, frequency_days FROM tasks WHERE id = $1 AND area_id = $2",
            task_id, area_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")
        freq = existing["frequency_days"]
        next_due = today + timedelta(days=freq) if freq else None
        row = await conn.fetchrow(
            f"UPDATE tasks SET last_done = $1, next_due = $2 WHERE id = $3 RETURNING {SELECT_TASK}",
            today, next_due, task_id,
        )
        return row_to_task(row)


@router.patch("/{slug}/{task_id}", response_model=AreaTaskOut)
async def patch_task(slug: str, task_id: int, patch: AreaTaskPatch, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        area_id = await _get_area_id(conn, slug)
        existing = await conn.fetchrow(
            "SELECT id, frequency_days FROM tasks WHERE id = $1 AND area_id = $2",
            task_id, area_id,
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Task not found")

        updates = patch.model_dump(exclude_none=True)

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

        for field in ("last_done", "next_due"):
            if field in updates and isinstance(updates[field], str) and updates[field]:
                from datetime import datetime
                updates[field] = datetime.strptime(updates[field], "%Y-%m-%d").date()

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
        row = await conn.fetchrow(
            f"UPDATE tasks SET {set_clauses} WHERE id = $1 RETURNING {SELECT_TASK}",
            task_id, *list(updates.values()),
        )
        return row_to_task(row)


@router.delete("/{slug}/{task_id}")
async def delete_task(slug: str, task_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        area_id = await _get_area_id(conn, slug)
        result = await conn.execute(
            "DELETE FROM tasks WHERE id = $1 AND area_id = $2", task_id, area_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True}
