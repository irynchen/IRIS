import datetime
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/health/bp", tags=["health-bp"])


class BPReadingIn(BaseModel):
    measured_at: str
    systolic: int
    diastolic: int
    pulse: Optional[int] = None
    notes: Optional[str] = None


class BPReadingPatch(BaseModel):
    measured_at: Optional[str] = None
    systolic: Optional[int] = None
    diastolic: Optional[int] = None
    pulse: Optional[int] = None
    notes: Optional[str] = None


def _bp_status(sys: Optional[int], dia: Optional[int]) -> Optional[str]:
    if sys is None or dia is None:
        return None
    if sys >= 140 or dia >= 90:
        return "high"
    if sys >= 130 or dia >= 80:
        return "elevated"
    return "normal"


def _row_to_reading(row) -> dict:
    return {
        "id": row["id"],
        "measured_at": row["measured_at"].isoformat(),
        "systolic": row["systolic"],
        "diastolic": row["diastolic"],
        "pulse": row["pulse"],
        "notes": row["notes"],
        "status": _bp_status(row["systolic"], row["diastolic"]),
    }


@router.get("/readings")
async def list_readings(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    limit: Optional[int] = Query(None),
    user=Depends(get_current_user),
):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if from_date and to_date:
            since = datetime.datetime.fromisoformat(from_date)
            until = datetime.datetime.fromisoformat(to_date) + datetime.timedelta(days=1)
            rows = await conn.fetch(
                "SELECT id, measured_at, systolic, diastolic, pulse, notes FROM bp_readings "
                "WHERE measured_at >= $1 AND measured_at < $2 ORDER BY measured_at DESC"
                + (" LIMIT $3" if limit else ""),
                *([since, until, limit] if limit else [since, until]),
            )
        else:
            rows = await conn.fetch(
                "SELECT id, measured_at, systolic, diastolic, pulse, notes FROM bp_readings "
                "ORDER BY measured_at DESC LIMIT $1",
                limit or 200,
            )
        return [_row_to_reading(r) for r in rows]


@router.post("/readings")
async def create_reading(item: BPReadingIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO bp_readings (measured_at, systolic, diastolic, pulse, notes) "
            "VALUES ($1, $2, $3, $4, $5) "
            "RETURNING id, measured_at, systolic, diastolic, pulse, notes",
            datetime.datetime.fromisoformat(item.measured_at),
            item.systolic, item.diastolic, item.pulse, item.notes,
        )
        return _row_to_reading(row)


@router.patch("/readings/{reading_id}")
async def patch_reading(reading_id: int, payload: BPReadingPatch, user=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "measured_at" in updates:
        updates["measured_at"] = datetime.datetime.fromisoformat(updates["measured_at"])
    pool = await get_pool()
    async with pool.acquire() as conn:
        if not updates:
            row = await conn.fetchrow(
                "SELECT id, measured_at, systolic, diastolic, pulse, notes FROM bp_readings WHERE id = $1",
                reading_id,
            )
        else:
            set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates))
            row = await conn.fetchrow(
                f"UPDATE bp_readings SET {set_clause} WHERE id = $1 "
                "RETURNING id, measured_at, systolic, diastolic, pulse, notes",
                reading_id, *updates.values(),
            )
        if row is None:
            raise HTTPException(404, "Messung nicht gefunden")
        return _row_to_reading(row)


@router.delete("/readings/{reading_id}")
async def delete_reading(reading_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM bp_readings WHERE id = $1", reading_id)
        if result == "DELETE 0":
            raise HTTPException(404, "Messung nicht gefunden")
        return {"ok": True}


@router.get("/stats")
async def get_bp_stats(days: int = Query(30), user=Depends(get_current_user)):
    pool = await get_pool()
    since = datetime.datetime.now() - datetime.timedelta(days=days)
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT systolic, diastolic, pulse FROM bp_readings WHERE measured_at >= $1",
            since,
        )
        latest = await conn.fetchrow(
            "SELECT id, measured_at, systolic, diastolic, pulse, notes FROM bp_readings "
            "ORDER BY measured_at DESC LIMIT 1"
        )
    sys_vals = [r["systolic"] for r in rows]
    dia_vals = [r["diastolic"] for r in rows]
    return {
        "period_days": days,
        "count": len(rows),
        "avg_systolic": round(sum(sys_vals) / len(sys_vals), 1) if sys_vals else None,
        "avg_diastolic": round(sum(dia_vals) / len(dia_vals), 1) if dia_vals else None,
        "latest": _row_to_reading(latest) if latest else None,
    }


@router.get("/export/pdf")
async def export_pdf(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    user=Depends(get_current_user),
):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    pool = await get_pool()
    async with pool.acquire() as conn:
        if from_date and to_date:
            since = datetime.datetime.fromisoformat(from_date)
            until = datetime.datetime.fromisoformat(to_date) + datetime.timedelta(days=1)
            rows = await conn.fetch(
                "SELECT measured_at, systolic, diastolic, pulse, notes FROM bp_readings "
                "WHERE measured_at >= $1 AND measured_at < $2 ORDER BY measured_at ASC",
                since, until,
            )
        else:
            rows = await conn.fetch(
                "SELECT measured_at, systolic, diastolic, pulse, notes FROM bp_readings "
                "ORDER BY measured_at ASC"
            )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("Blutdruck-Übersicht", styles["Title"]),
        Paragraph(
            f"Zeitraum: {from_date or '(alle)'} – {to_date or '(alle)'} · erstellt am "
            f"{datetime.date.today().strftime('%d.%m.%Y')}",
            styles["Normal"],
        ),
        Spacer(1, 0.6 * cm),
    ]

    data = [["Datum", "Uhrzeit", "Systole", "Diastole", "Puls", "Notiz"]]
    for r in rows:
        dt = r["measured_at"]
        data.append([
            dt.strftime("%d.%m.%Y"),
            dt.strftime("%H:%M"),
            str(r["systolic"]),
            str(r["diastolic"]),
            str(r["pulse"]) if r["pulse"] is not None else "–",
            r["notes"] or "",
        ])

    table = Table(data, colWidths=[2.6 * cm, 2.2 * cm, 2.2 * cm, 2.2 * cm, 1.8 * cm, 5 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6B8F71")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8E2D9")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F7F4EF")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elements.append(table)
    doc.build(elements)

    pdf_bytes = buffer.getvalue()
    buffer.close()
    filename = f"blutdruck_{from_date or 'alle'}_{to_date or 'alle'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
