import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/doctors", tags=["doctors"])


class DoctorIn(BaseModel):
    name: str
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class DoctorPatch(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class AppointmentIn(BaseModel):
    date: str
    time: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: str = "planned"


class AppointmentPatch(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    reason: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


def _row_to_doctor(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "specialty": row["specialty"],
        "phone": row["phone"],
        "email": row["email"],
        "address": row["address"],
        "notes": row["notes"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


def _row_to_appt(row) -> dict:
    return {
        "id": row["id"],
        "doctor_id": row["doctor_id"],
        "date": str(row["date"]),
        "time": str(row["time"])[:5] if row["time"] else None,
        "reason": row["reason"],
        "notes": row["notes"],
        "status": row["status"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.get("")
async def list_doctors(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM doctors ORDER BY name ASC")
    return [_row_to_doctor(r) for r in rows]


@router.post("")
async def create_doctor(body: DoctorIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO doctors (name, specialty, phone, email, address, notes) "
            "VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            body.name, body.specialty, body.phone, body.email, body.address, body.notes
        )
    return _row_to_doctor(row)


@router.get("/{doctor_id}")
async def get_doctor(doctor_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM doctors WHERE id=$1", doctor_id)
        if not row:
            raise HTTPException(404, "Arzt nicht gefunden")
        appts = await conn.fetch(
            "SELECT * FROM doctor_appointments WHERE doctor_id=$1 ORDER BY date DESC",
            doctor_id
        )
    return {**_row_to_doctor(row), "appointments": [_row_to_appt(a) for a in appts]}


@router.patch("/{doctor_id}")
async def update_doctor(doctor_id: int, body: DoctorPatch, user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "Keine Änderungen")
    pool = await get_pool()
    async with pool.acquire() as conn:
        sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(data))
        vals = list(data.values())
        row = await conn.fetchrow(
            f"UPDATE doctors SET {sets} WHERE id=$1 RETURNING *",
            doctor_id, *vals
        )
        if not row:
            raise HTTPException(404, "Arzt nicht gefunden")
    return _row_to_doctor(row)


@router.delete("/{doctor_id}")
async def delete_doctor(doctor_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM doctors WHERE id=$1", doctor_id)
    return {"ok": True}


@router.post("/{doctor_id}/appointments")
async def create_appointment(doctor_id: int, body: AppointmentIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        doc = await conn.fetchval("SELECT id FROM doctors WHERE id=$1", doctor_id)
        if not doc:
            raise HTTPException(404, "Arzt nicht gefunden")
        time_val = datetime.time.fromisoformat(body.time) if body.time else None
        row = await conn.fetchrow(
            "INSERT INTO doctor_appointments (doctor_id, date, time, reason, notes, status) "
            "VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            doctor_id,
            datetime.date.fromisoformat(body.date),
            time_val,
            body.reason,
            body.notes,
            body.status,
        )
    return _row_to_appt(row)


@router.patch("/appointments/{appt_id}")
async def update_appointment(appt_id: int, body: AppointmentPatch, user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "Keine Änderungen")
    pool = await get_pool()
    async with pool.acquire() as conn:
        if "date" in data:
            data["date"] = datetime.date.fromisoformat(data["date"])
        if "time" in data:
            data["time"] = datetime.time.fromisoformat(data["time"]) if data["time"] else None
        sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(data))
        vals = list(data.values())
        row = await conn.fetchrow(
            f"UPDATE doctor_appointments SET {sets} WHERE id=$1 RETURNING *",
            appt_id, *vals
        )
        if not row:
            raise HTTPException(404, "Termin nicht gefunden")
    return _row_to_appt(row)


@router.delete("/appointments/{appt_id}")
async def delete_appointment(appt_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM doctor_appointments WHERE id=$1", appt_id)
    return {"ok": True}
