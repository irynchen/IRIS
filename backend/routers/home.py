from fastapi import APIRouter
from typing import List
from pydantic import BaseModel
from ..database import get_pool

router = APIRouter(prefix="/api/home", tags=["home"])

class RoomIn(BaseModel):
    name: str
    icon: str | None = None

class RoomOut(RoomIn):
    id: int

@router.get("/rooms", response_model=List[RoomOut])
async def list_rooms():
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id, name, icon FROM home_rooms ORDER BY sort_order")
        return [dict(r) for r in rows]

@router.post("/rooms", response_model=RoomOut)
async def create_room(item: RoomIn):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("INSERT INTO home_rooms (name, icon) VALUES ($1,$2) RETURNING id, name, icon", item.name, item.icon)
        return dict(row)
