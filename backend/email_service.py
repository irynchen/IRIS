import asyncio
import smtplib
import logging
from datetime import date, datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from database import get_pool
from config import settings

log = logging.getLogger(__name__)


async def fetch_summary() -> dict:
    today    = date.today()
    tomorrow = today + timedelta(days=1)
    in3days  = today + timedelta(days=3)
    pool     = await get_pool()

    async with pool.acquire() as conn:
        overdue = await conn.fetch(
            "SELECT t.title, a.name AS area, t.priority "
            "FROM tasks t JOIN areas a ON t.area_id = a.id "
            "WHERE t.next_due < $1 ORDER BY t.next_due, t.priority DESC LIMIT 20",
            today,
        )
        due_today = await conn.fetch(
            "SELECT t.title, a.name AS area, t.priority "
            "FROM tasks t JOIN areas a ON t.area_id = a.id "
            "WHERE t.next_due = $1 ORDER BY t.priority DESC",
            today,
        )
        due_soon = await conn.fetch(
            "SELECT t.title, a.name AS area, t.next_due::text "
            "FROM tasks t JOIN areas a ON t.area_id = a.id "
            "WHERE t.next_due > $1 AND t.next_due <= $2 ORDER BY t.next_due",
            today, in3days,
        )
        home_overdue = await conn.fetch(
            "SELECT ht.title, r.name AS room, ht.priority "
            "FROM home_tasks ht JOIN home_rooms r ON ht.room_id = r.id "
            "WHERE ht.next_due < $1 ORDER BY ht.next_due, ht.priority DESC LIMIT 10",
            today,
        )
        home_today = await conn.fetch(
            "SELECT ht.title, r.name AS room "
            "FROM home_tasks ht JOIN home_rooms r ON ht.room_id = r.id "
            "WHERE ht.next_due = $1",
            today,
        )

    return {
        "overdue":      [dict(r) for r in overdue],
        "due_today":    [dict(r) for r in due_today],
        "due_soon":     [dict(r) for r in due_soon],
        "home_overdue": [dict(r) for r in home_overdue],
        "home_today":   [dict(r) for r in home_today],
    }


def build_html(data: dict, today: date) -> str:
    day_de = ["Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag","Sonntag"]
    weekday = day_de[today.weekday()]
    date_str = today.strftime("%d.%m.%Y")

    def task_rows(items, cols):
        if not items:
            return "<tr><td colspan='10' style='color:#888;padding:8px 0'>— keine —</td></tr>"
        rows = ""
        for it in items:
            prio_icon = "🔴" if it.get("priority") == 3 else "🟡" if it.get("priority") == 2 else "🟢"
            area_or_room = it.get("area") or it.get("room") or ""
            due = it.get("next_due", "")
            if cols == 3:
                rows += f"<tr><td style='padding:5px 8px'>{prio_icon}</td><td style='padding:5px 8px'>{it['title']}</td><td style='padding:5px 8px;color:#888'>{area_or_room}</td></tr>"
            else:
                rows += f"<tr><td style='padding:5px 8px'>{it['title']}</td><td style='padding:5px 8px;color:#888'>{area_or_room}</td><td style='padding:5px 8px;color:#888'>{due}</td></tr>"
        return rows

    all_overdue  = data["overdue"]  + data["home_overdue"]
    all_today    = data["due_today"] + data["home_today"]
    overdue_cnt  = len(all_overdue)
    today_cnt    = len(all_today)
    soon_cnt     = len(data["due_soon"])

    subject_hint = ""
    if overdue_cnt:
        subject_hint += f"{overdue_cnt} überfällig"
    if today_cnt:
        if subject_hint: subject_hint += ", "
        subject_hint += f"{today_cnt} heute fällig"
    if not subject_hint:
        subject_hint = "Alles im Griff ✓"

    return f"""<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><style>
  body {{ font-family: Georgia, serif; background: #f5f2ec; margin: 0; padding: 20px; color: #2c2c2c; }}
  .card {{ background: #fff; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }}
  h1 {{ font-size: 28px; color: #6B8F71; margin: 0 0 4px; }}
  h2 {{ font-size: 16px; margin: 0 0 12px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 14px; }}
  .badge {{ display: inline-block; background: #ef4444; color: #fff; border-radius: 20px; padding: 2px 10px; font-size: 13px; }}
</style></head>
<body>
<div style="max-width:560px;margin:auto">
  <div class="card">
    <h1>IRIS</h1>
    <p style="color:#888;margin:0">{weekday}, {date_str}</p>
  </div>

  {'<div class="card"><h2>🔥 Überfällig <span class="badge">' + str(overdue_cnt) + '</span></h2><table>' + task_rows(all_overdue, 3) + '</table></div>' if all_overdue else ''}

  {'<div class="card"><h2>📅 Heute fällig</h2><table>' + task_rows(all_today, 3) + '</table></div>' if all_today else ''}

  {'<div class="card"><h2>📋 Demnächst (3 Tage)</h2><table>' + task_rows(data["due_soon"], 4) + '</table></div>' if data["due_soon"] else ''}

  {'<div class="card" style="background:#f0f7f0"><p style="margin:0;color:#4a7a50">✓ Alles erledigt — gut gemacht!</p></div>' if not all_overdue and not all_today and not data["due_soon"] else ''}

  <p style="text-align:center;color:#bbb;font-size:12px;margin-top:8px">
    <a href="https://iris.goeloria.de" style="color:#6B8F71">iris.goeloria.de öffnen</a>
  </p>
</div>
</body></html>"""


async def send_daily_summary():
    if not settings.SMTP_PASSWORD:
        log.warning("SMTP_PASSWORD not set, skipping email")
        return
    try:
        data    = await fetch_summary()
        today   = date.today()
        html    = build_html(data, today)
        total   = len(data["overdue"]) + len(data["home_overdue"]) + len(data["due_today"]) + len(data["home_today"])
        subject = f"IRIS – {today.strftime('%d.%m.')} – "
        if total:
            overdue_cnt = len(data["overdue"]) + len(data["home_overdue"])
            today_cnt   = len(data["due_today"]) + len(data["home_today"])
            parts = []
            if overdue_cnt: parts.append(f"{overdue_cnt} überfällig")
            if today_cnt:   parts.append(f"{today_cnt} heute fällig")
            subject += ", ".join(parts)
        else:
            subject += "Alles erledigt ✓"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = settings.SMTP_USER
        msg["To"]      = settings.NOTIFY_EMAIL
        msg.attach(MIMEText(html, "html", "utf-8"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)

        log.info("Daily summary email sent to %s", settings.NOTIFY_EMAIL)
    except Exception as e:
        log.error("Failed to send email: %s", e)


async def scheduler_loop():
    """Runs daily at NOTIFY_HOUR:00."""
    log.info("Email scheduler started (daily at %02d:00)", settings.NOTIFY_HOUR)
    while True:
        now    = datetime.now()
        target = now.replace(hour=settings.NOTIFY_HOUR, minute=0, second=0, microsecond=0)
        if now >= target:
            target = target.replace(day=target.day + 1)
        wait   = (target - now).total_seconds()
        log.info("Next email in %.0f minutes", wait / 60)
        await asyncio.sleep(wait)
        await send_daily_summary()
