from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/shopping", tags=["shopping"])


# ── Models ──────────────────────────────────────────────────────────────────

class ShoppingListIn(BaseModel):
    name: str
    icon: str = "🛒"
    sort_order: int = 0

class ShoppingListPatch(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None

class ShoppingListOut(BaseModel):
    id: int
    name: str
    icon: str
    sort_order: int
    item_count: int = 0
    checked_count: int = 0

class ShoppingItemIn(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    notes: Optional[str] = None
    sort_order: int = 0

class ShoppingItemPatch(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    checked: Optional[bool] = None
    notes: Optional[str] = None
    sort_order: Optional[int] = None

class ShoppingItemOut(BaseModel):
    id: int
    list_id: int
    name: str
    quantity: Optional[float] = None
    unit: Optional[str] = None
    category: Optional[str] = None
    barcode: Optional[str] = None
    checked: bool
    notes: Optional[str] = None
    sort_order: int

class CatalogEntry(BaseModel):
    barcode: str
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None

class CheckAllIn(BaseModel):
    list_id: int
    checked: bool


# ── List endpoints ───────────────────────────────────────────────────────────

@router.get("/lists", response_model=List[ShoppingListOut])
async def get_lists(pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                l.id, l.name, l.icon, l.sort_order,
                COUNT(i.id)                              AS item_count,
                COUNT(i.id) FILTER (WHERE i.checked)    AS checked_count
            FROM shopping_lists l
            LEFT JOIN shopping_items i ON i.list_id = l.id
            GROUP BY l.id
            ORDER BY l.sort_order, l.id
        """)
    return [dict(r) for r in rows]


@router.post("/lists", response_model=ShoppingListOut, status_code=201)
async def create_list(body: ShoppingListIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO shopping_lists (name, icon, sort_order) VALUES ($1,$2,$3) RETURNING id, name, icon, sort_order",
            body.name, body.icon, body.sort_order
        )
    return {**dict(row), "item_count": 0, "checked_count": 0}


@router.patch("/lists/{list_id}", response_model=ShoppingListOut)
async def update_list(list_id: int, body: ShoppingListPatch, pool=Depends(get_pool), _=Depends(get_current_user)):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "Keine Felder")
    sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(fields))
    vals = list(fields.values())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE shopping_lists SET {sets} WHERE id=$1 RETURNING id, name, icon, sort_order",
            list_id, *vals
        )
        if not row:
            raise HTTPException(404, "Liste nicht gefunden")
        counts = await conn.fetchrow(
            "SELECT COUNT(*) AS item_count, COUNT(*) FILTER (WHERE checked) AS checked_count FROM shopping_items WHERE list_id=$1",
            list_id
        )
    return {**dict(row), **dict(counts)}


@router.delete("/lists/{list_id}", status_code=204)
async def delete_list(list_id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM shopping_lists WHERE id=$1", list_id)


# ── Item endpoints ────────────────────────────────────────────────────────────

@router.get("/lists/{list_id}/items", response_model=List[ShoppingItemOut])
async def get_items(list_id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, list_id, name, quantity, unit, category, barcode, checked, notes, sort_order "
            "FROM shopping_items WHERE list_id=$1 ORDER BY checked, sort_order, id",
            list_id
        )
    return [dict(r) for r in rows]


@router.post("/lists/{list_id}/items", response_model=ShoppingItemOut, status_code=201)
async def add_item(list_id: int, body: ShoppingItemIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT id FROM shopping_lists WHERE id=$1", list_id)
        if not exists:
            raise HTTPException(404, "Liste nicht gefunden")
        row = await conn.fetchrow(
            """INSERT INTO shopping_items
               (list_id, name, quantity, unit, category, barcode, notes, sort_order)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               RETURNING id, list_id, name, quantity, unit, category, barcode, checked, notes, sort_order""",
            list_id, body.name, body.quantity, body.unit,
            body.category, body.barcode, body.notes, body.sort_order
        )
    return dict(row)


@router.patch("/items/{item_id}", response_model=ShoppingItemOut)
async def update_item(item_id: int, body: ShoppingItemPatch, pool=Depends(get_pool), _=Depends(get_current_user)):
    fields = body.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "Keine Felder")
    sets = ", ".join(f"{k}=${i+2}" for i, k in enumerate(fields))
    vals = list(fields.values())
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE shopping_items SET {sets} WHERE id=$1 "
            "RETURNING id, list_id, name, quantity, unit, category, barcode, checked, notes, sort_order",
            item_id, *vals
        )
        if not row:
            raise HTTPException(404, "Artikel nicht gefunden")
    return dict(row)


@router.delete("/items/{item_id}", status_code=204)
async def delete_item(item_id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM shopping_items WHERE id=$1", item_id)


@router.delete("/lists/{list_id}/checked", status_code=204)
async def delete_checked(list_id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM shopping_items WHERE list_id=$1 AND checked=TRUE", list_id)


@router.post("/items/check-all", status_code=204)
async def check_all(body: CheckAllIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE shopping_items SET checked=$2 WHERE list_id=$1",
            body.list_id, body.checked
        )


# ── Catalog (scanned products) ────────────────────────────────────────────────

@router.get("/catalog/{barcode}", response_model=CatalogEntry)
async def get_catalog_entry(barcode: str, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT barcode, name, brand, category, unit FROM shopping_catalog WHERE barcode=$1",
            barcode
        )
    if not row:
        raise HTTPException(404, "Produkt nicht gefunden")
    return dict(row)


@router.post("/catalog", response_model=CatalogEntry, status_code=201)
async def upsert_catalog(entry: CatalogEntry, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO shopping_catalog (barcode, name, brand, category, unit)
               VALUES ($1,$2,$3,$4,$5)
               ON CONFLICT (barcode) DO UPDATE SET
                 name=EXCLUDED.name, brand=EXCLUDED.brand,
                 category=EXCLUDED.category, unit=EXCLUDED.unit,
                 updated_at=NOW()
               RETURNING barcode, name, brand, category, unit""",
            entry.barcode, entry.name, entry.brand, entry.category, entry.unit
        )
    return dict(row)


@router.get("/suggestions", response_model=List[str])
async def get_suggestions(pool=Depends(get_pool), _=Depends(get_current_user)):
    """Häufig hinzugefügte Artikel (Top 20 nach Häufigkeit)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT name, COUNT(*) AS cnt
               FROM shopping_items
               GROUP BY name
               ORDER BY cnt DESC, name
               LIMIT 20"""
        )
    return [r["name"] for r in rows]
