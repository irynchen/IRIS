from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import date
from database import get_pool
from auth.jwt import get_current_user
from email_service import send_daily_summary

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class NotificationCounts(BaseModel):
    overdue: int
    due_today: int
    total: int


@router.get("/counts", response_model=NotificationCounts)
async def get_counts(user=Depends(get_current_user)):
    today = date.today()
    pool  = await get_pool()

    async with pool.acquire() as conn:
        # Generic area tasks
        row = await conn.fetchrow(
            "SELECT "
            "  COUNT(*) FILTER (WHERE next_due < $1) AS overdue, "
            "  COUNT(*) FILTER (WHERE next_due = $1) AS due_today "
            "FROM tasks WHERE next_due IS NOT NULL",
            today,
        )
        task_overdue    = row["overdue"]
        task_due_today  = row["due_today"]

        # Home tasks
        row = await conn.fetchrow(
            "SELECT "
            "  COUNT(*) FILTER (WHERE next_due < $1) AS overdue, "
            "  COUNT(*) FILTER (WHERE next_due = $1) AS due_today "
            "FROM home_tasks WHERE next_due IS NOT NULL",
            today,
        )
        home_overdue    = row["overdue"]
        home_due_today  = row["due_today"]

    overdue   = task_overdue   + home_overdue
    due_today = task_due_today + home_due_today

    return NotificationCounts(
        overdue=overdue,
        due_today=due_today,
        total=overdue + due_today,
    )


@router.post("/send-test")
async def send_test(user=Depends(get_current_user)):
    await send_daily_summary()
    return {"status": "ok"}
