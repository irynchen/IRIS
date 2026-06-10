from fastapi import APIRouter, Depends
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as Date, timedelta
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class SmartTask(BaseModel):
    id: int
    title: str
    area_name: str
    area_icon: Optional[str] = None
    area_slug: str
    room_id: Optional[int] = None
    next_due: Optional[str] = None
    priority: int
    duration: Optional[str] = None
    energy_level: Optional[str] = None
    slot: str
    slot_label: str
    slot_icon: str


class SmartDayResponse(BaseModel):
    tasks: List[SmartTask]
    health_logged_today: bool
    overdue_total: int


@router.get("/smart", response_model=SmartDayResponse)
async def smart_day(user=Depends(get_current_user)):
    today = Date.today()
    due_threshold = today + timedelta(days=2)

    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT t.id, t.title, t.priority, t.duration, t.energy_level, "
            "t.next_due::text, t.room_id, "
            "a.name AS area_name, a.icon AS area_icon, a.slug AS area_slug "
            "FROM tasks t "
            "JOIN areas a ON t.area_id = a.id "
            "WHERE (t.next_due IS NOT NULL AND t.next_due <= $1) "
            "   OR (t.next_due IS NULL AND t.priority = 3) "
            "ORDER BY t.next_due NULLS LAST, t.priority DESC",
            due_threshold,
        )
        all_tasks = [dict(r) for r in rows]

        overdue_count = sum(
            1 for t in all_tasks
            if t["next_due"] and t["next_due"] < str(today)
        )

        used_ids: set = set()
        result: list = []

        def pick(subset, slot, label, icon, limit):
            count = 0
            for t in subset:
                if t["id"] in used_ids or count >= limit:
                    continue
                used_ids.add(t["id"])
                result.append({**t, "slot": slot, "slot_label": label, "slot_icon": icon})
                count += 1

        # 1 — most overdue (oldest first)
        overdue = sorted(
            [t for t in all_tasks if t["next_due"] and t["next_due"] < str(today)],
            key=lambda t: t["next_due"],
        )
        pick(overdue, "overdue", "Überfällig", "🔥", 1)

        # up to 3 — high priority (priority=3) due soon or overdue
        important = [t for t in all_tasks if t["priority"] == 3]
        pick(important, "important", "Wichtig", "⭐", 3)

        # up to 2 — short tasks
        quick = [t for t in all_tasks if t["duration"] == "short"]
        pick(quick, "quick", "15 Minuten", "⚡", 2)

        # 1 — low energy
        low_e = [t for t in all_tasks if t["energy_level"] == "low"]
        pick(low_e, "low_energy", "Wenn du müde bist", "🌿", 1)

        # Health check
        health_row = await conn.fetchrow(
            "SELECT id FROM health_records WHERE date = $1", today
        )

        return {
            "tasks": result,
            "health_logged_today": health_row is not None,
            "overdue_total": overdue_count,
        }
