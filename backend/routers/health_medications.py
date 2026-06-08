from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/medications", tags=["medications"])


class MedicationIn(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    stock_count: Optional[int] = None
    notes: Optional[str] = None
    active: bool = True


class MedicationPatch(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    stock_count: Optional[int] = None
    notes: Optional[str] = None
    active: Optional[bool] = None


def _row_to_med(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "dosage": row["dosage"],
        "frequency": row["frequency"],
        "stock_count": row["stock_count"],
        "notes": row["notes"],
        "active": row["active"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


@router.get("")
async def list_medications(user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM medications ORDER BY active DESC, name ASC"
        )
    return [_row_to_med(r) for r in rows]


@router.post("")
async def create_medication(body: MedicationIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO medications (name, dosage, frequency, stock_count, notes, active) "
            "VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
            body.name, body.dosage, body.frequency, body.stock_count, body.notes, body.active
        )
    return _row_to_med(row)


@router.patch("/{med_id}")
async def update_medication(med_id: int, body: MedicationPatch, user=Depends(get_current_user)):
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(400, "Keine Änderungen")
    pool = await get_pool()
    async with pool.acquire() as conn:
        sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(data))
        vals = list(data.values())
        row = await conn.fetchrow(
            f"UPDATE medications SET {sets} WHERE id=$1 RETURNING *",
            med_id, *vals
        )
        if not row:
            raise HTTPException(404, "Medikament nicht gefunden")
    return _row_to_med(row)


@router.delete("/{med_id}")
async def delete_medication(med_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM medications WHERE id=$1", med_id)
    return {"ok": True}
