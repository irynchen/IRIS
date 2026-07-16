from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from pydantic import BaseModel
from datetime import date as Date, timedelta
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


class CalendarEvent(BaseModel):
    id: str
    type: str           # "day_plan" | "task" | "appointment" | "recurring"
    date: str
    time_from: Optional[str] = None
    time_to: Optional[str] = None
    title: str
    color: str
    area_icon: Optional[str] = None
    area_slug: Optional[str] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None
    source_id: int


@router.get("/events", response_model=List[CalendarEvent])
async def get_events(
    from_date: str = Query(alias="from"),
    to_date: str = Query(alias="to"),
    user=Depends(get_current_user),
):
    d_from = Date.fromisoformat(from_date)
    d_to   = Date.fromisoformat(to_date)
    pool   = await get_pool()
    events = []

    async with pool.acquire() as conn:
        # ── day_plan ────────────────────────────────────────────────────────
        rows = await conn.fetch(
            "SELECT id, date::text, time_from::text, time_to::text, "
            "title, priority, completed "
            "FROM day_plan WHERE date >= $1 AND date <= $2 "
            "ORDER BY date, time_from NULLS LAST",
            d_from, d_to,
        )
        for r in rows:
            events.append(CalendarEvent(
                id=f"dp_{r['id']}",
                type="day_plan",
                date=r["date"],
                time_from=r["time_from"],
                time_to=r["time_to"],
                title=r["title"],
                color="#6B8F71",
                priority=r["priority"],
                completed=r["completed"],
                source_id=r["id"],
            ))

        # ── tasks with next_due ─────────────────────────────────────────────
        rows = await conn.fetch(
            "SELECT t.id, t.next_due::text, t.title, t.priority, "
            "a.icon AS area_icon, a.slug AS area_slug, a.color "
            "FROM tasks t JOIN areas a ON t.area_id = a.id "
            "WHERE t.next_due >= $1 AND t.next_due <= $2 "
            "ORDER BY t.next_due, t.priority DESC",
            d_from, d_to,
        )
        for r in rows:
            events.append(CalendarEvent(
                id=f"task_{r['id']}",
                type="task",
                date=r["next_due"],
                title=r["title"],
                color=r["color"] or "#C4A882",
                area_icon=r["area_icon"],
                area_slug=r["area_slug"],
                priority=r["priority"],
                source_id=r["id"],
            ))

        # ── doctor appointments ─────────────────────────────────────────────
        rows = await conn.fetch(
            "SELECT a.id, a.date::text, a.time::text AS time_from, "
            "a.reason, a.status, d.name AS doctor_name "
            "FROM doctor_appointments a JOIN doctors d ON a.doctor_id = d.id "
            "WHERE a.date >= $1 AND a.date <= $2 "
            "ORDER BY a.date, a.time NULLS LAST",
            d_from, d_to,
        )
        for r in rows:
            events.append(CalendarEvent(
                id=f"appt_{r['id']}",
                type="appointment",
                date=r["date"],
                time_from=r["time_from"],
                title=r["reason"] or f"Dr. {r['doctor_name']}",
                color="#4A7FA5",
                source_id=r["id"],
            ))

        # ── recurring events ────────────────────────────────────────────────────
        rows = await conn.fetch(
            "SELECT id, title, weekdays, time_from, time_to, color "
            "FROM recurring_events WHERE active = true"
        )
        recurring = [dict(r) for r in rows]

    # generate recurring instances for each day in range
    cur = d_from
    while cur <= d_to:
        dow = cur.weekday()   # 0=Mon … 6=Sun
        for rec in recurring:
            if dow in rec["weekdays"]:
                tf = str(rec["time_from"])[:5] if rec["time_from"] else None
                tt = str(rec["time_to"])[:5]   if rec["time_to"]   else None
                events.append(CalendarEvent(
                    id=f"rec_{rec['id']}_{cur.isoformat()}",
                    type="recurring",
                    date=cur.isoformat(),
                    time_from=tf,
                    time_to=tt,
                    title=rec["title"],
                    color=rec["color"] or "#9B7EBD",
                    source_id=rec["id"],
                ))
        cur += timedelta(days=1)

    events.sort(key=lambda e: (e.date, e.time_from or ""))
    return events
