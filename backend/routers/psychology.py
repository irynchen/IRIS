"""Psychology module — sessions, items, Claude analysis proxy."""
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from database import get_pool
from auth.jwt import get_current_user
from config import settings
from routers.settings import get_setting

router = APIRouter(prefix="/api/psychology", tags=["psychology"])


def _row(row) -> dict:
    """asyncpg returns JSONB columns as strings — parse them back to dicts."""
    d = dict(row)
    if isinstance(d.get('data'), str):
        try:
            d['data'] = json.loads(d['data'])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


# ── Models ────────────────────────────────────────────────────────────────────

class SessionIn(BaseModel):
    mode: str
    title: Optional[str] = None
    data: dict


class ItemIn(BaseModel):
    type: str
    data: dict


class ItemPatch(BaseModel):
    data: Optional[dict] = None
    active: Optional[bool] = None


class AnalyzeIn(BaseModel):
    situation: str
    importance: int
    what_remains: Optional[str] = None


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions")
async def list_sessions(mode: Optional[str] = None, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        if mode:
            rows = await conn.fetch(
                "SELECT id, mode, title, data, created_at::text FROM psych_sessions "
                "WHERE mode=$1 ORDER BY created_at DESC LIMIT 100",
                mode,
            )
        else:
            rows = await conn.fetch(
                "SELECT id, mode, title, data, created_at::text FROM psych_sessions "
                "ORDER BY created_at DESC LIMIT 100"
            )
        return [_row(r) for r in rows]


@router.post("/sessions", status_code=201)
async def create_session(body: SessionIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO psych_sessions (mode, title, data) VALUES ($1,$2,$3) "
            "RETURNING id, mode, title, data, created_at::text",
            body.mode, body.title, json.dumps(body.data),
        )
        return _row(row)


@router.patch("/sessions/{id}")
async def update_session(id: int, body: SessionIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE psych_sessions SET title=$2, data=$3 WHERE id=$1 "
            "RETURNING id, mode, title, data, created_at::text",
            id, body.title, json.dumps(body.data),
        )
        if not row:
            raise HTTPException(404, "Session nicht gefunden")
        return _row(row)


@router.delete("/sessions/{id}", status_code=204)
async def delete_session(id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM psych_sessions WHERE id=$1", id)


# ── Items (slides, pendulums, future_self) ────────────────────────────────────

@router.get("/items")
async def list_items(type: Optional[str] = None, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        if type:
            rows = await conn.fetch(
                "SELECT id, type, data, active, created_at::text FROM psych_items "
                "WHERE type=$1 ORDER BY created_at DESC",
                type,
            )
        else:
            rows = await conn.fetch(
                "SELECT id, type, data, active, created_at::text FROM psych_items "
                "ORDER BY created_at DESC"
            )
        return [_row(r) for r in rows]


@router.post("/items", status_code=201)
async def create_item(body: ItemIn, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO psych_items (type, data) VALUES ($1,$2) "
            "RETURNING id, type, data, active, created_at::text",
            body.type, json.dumps(body.data),
        )
        return _row(row)


@router.patch("/items/{id}")
async def update_item(id: int, body: ItemPatch, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        if body.data is not None:
            await conn.execute(
                "UPDATE psych_items SET data=$1, updated_at=NOW() WHERE id=$2",
                json.dumps(body.data), id,
            )
        if body.active is not None:
            await conn.execute(
                "UPDATE psych_items SET active=$1, updated_at=NOW() WHERE id=$2",
                body.active, id,
            )
        row = await conn.fetchrow(
            "SELECT id, type, data, active, created_at::text FROM psych_items WHERE id=$1", id
        )
        if not row:
            raise HTTPException(404, "Item not found")
        return _row(row)


@router.delete("/items/{id}", status_code=204)
async def delete_item(id: int, pool=Depends(get_pool), _=Depends(get_current_user)):
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM psych_items WHERE id=$1", id)


# ── Claude proxy ──────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze_situation(body: AnalyzeIn, _=Depends(get_current_user), pool=Depends(get_pool)):
    # DB setting takes priority over env var
    api_key = await get_setting("anthropic_api_key", pool) or settings.ANTHROPIC_API_KEY
    if not api_key:
        return {"text": "⚠️ API-ключ Claude не настроен. Перейди в Настройки и введи ANTHROPIC_API_KEY."}

    prompt = f"""Ты — тёплый, мудрый коуч по методу Трансёрфинга реальности Вадима Зеланда.

Пользовательница описывает ситуацию:
«{body.situation}»

Уровень важности (1–10): {body.importance}
Что останется, даже если всё пойдёт не так: «{body.what_remains or "не указано"}»

Дай практический анализ (5–7 предложений) через призму трансёрфинга:
1. Как уровень важности влияет на эту ситуацию
2. Есть ли здесь маятник — и какой он
3. Одно конкретное действие для снижения важности прямо сейчас
4. Одна фраза-намерение для этой ситуации — в настоящем времени, от первого лица

Отвечай по-русски, тепло и конкретно. В конце отдельной строкой:
НАМЕРЕНИЕ: [фраза]"""

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-5",
                    "max_tokens": 1000,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            result = resp.json()
            text = (result.get("content") or [{}])[0].get("text", "Fehler beim Abruf")
            return {"text": text}
    except Exception as e:
        raise HTTPException(500, f"Claude API Fehler: {str(e)}")


@router.post("/generate-affirmations")
async def generate_affirmations(_=Depends(get_current_user), pool=Depends(get_pool)):
    api_key = await get_setting("anthropic_api_key", pool) or settings.ANTHROPIC_API_KEY
    if not api_key:
        return {"affirmations": []}

    prompt = """Сгенерируй ровно 5 аффирмаций в стиле Трансёрфинга реальности Вадима Зеланда.

Требования:
- От первого лица, настоящее время
- Короткие (одно предложение)
- Про внутреннее состояние — покой, уверенность, лёгкость, поток
- Не про материальные цели, а про качество присутствия
- Тёплые, женственные, поддерживающие
- На русском языке

Ответ: только 5 аффирмаций, каждая на отдельной строке, без нумерации, без тире, без пояснений."""

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            result = resp.json()
            text = (result.get("content") or [{}])[0].get("text", "")
            affirmations = [a.strip() for a in text.strip().split('\n') if a.strip()]
            return {"affirmations": affirmations[:5]}
    except Exception as e:
        raise HTTPException(500, f"Claude API Fehler: {str(e)}")
