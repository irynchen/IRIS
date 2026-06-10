from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/travel", tags=["travel"])

SELECT = (
    "id, title, country, city, budget_min, budget_max, "
    "season, priority, status, notes, created_at::text"
)


class TravelIdeaIn(BaseModel):
    title: str
    country: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    season: Optional[str] = None
    priority: int = 2
    status: str = "idea"
    notes: Optional[str] = None


class TravelIdeaPatch(BaseModel):
    title: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    season: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TravelIdeaOut(BaseModel):
    id: int
    title: str
    country: Optional[str] = None
    city: Optional[str] = None
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    season: Optional[str] = None
    priority: int
    status: str
    notes: Optional[str] = None
    created_at: str


@router.get("/ideas", response_model=List[TravelIdeaOut])
async def list_ideas(status: Optional[str] = None, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        if status:
            rows = await conn.fetch(
                f"SELECT {SELECT} FROM travel_ideas WHERE status = $1 ORDER BY priority DESC, created_at DESC",
                status,
            )
        else:
            rows = await conn.fetch(
                f"SELECT {SELECT} FROM travel_ideas ORDER BY priority DESC, created_at DESC"
            )
        return [dict(r) for r in rows]


@router.post("/ideas", response_model=TravelIdeaOut)
async def create_idea(item: TravelIdeaIn, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"INSERT INTO travel_ideas "
            f"(title, country, city, budget_min, budget_max, season, priority, status, notes) "
            f"VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING {SELECT}",
            item.title, item.country, item.city, item.budget_min, item.budget_max,
            item.season, item.priority, item.status, item.notes,
        )
        return dict(row)


@router.patch("/ideas/{idea_id}", response_model=TravelIdeaOut)
async def patch_idea(idea_id: int, patch: TravelIdeaPatch, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow("SELECT id FROM travel_ideas WHERE id = $1", idea_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Idea not found")
        updates = patch.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        set_clauses = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
        row = await conn.fetchrow(
            f"UPDATE travel_ideas SET {set_clauses} WHERE id = $1 RETURNING {SELECT}",
            idea_id, *list(updates.values()),
        )
        return dict(row)


@router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: int, user=Depends(get_current_user)):
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM travel_ideas WHERE id = $1", idea_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Idea not found")
    return {"ok": True}
