"""App settings — stored in DB, editable from UI."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict
from database import get_pool
from auth.jwt import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

ALLOWED_KEYS = {"anthropic_api_key", "notify_hour"}


@router.get("")
async def get_settings(_=Depends(get_current_user), pool=Depends(get_pool)):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT key, value FROM app_settings WHERE key = ANY($1::text[])", list(ALLOWED_KEYS))
        result = {r["key"]: r["value"] for r in rows}
        # Mask API key in response — return only whether it's set
        if "anthropic_api_key" in result:
            val = result["anthropic_api_key"]
            result["anthropic_api_key_set"] = bool(val)
            result["anthropic_api_key"] = ("*" * 8 + val[-4:]) if len(val) > 8 else ("*" * len(val) if val else "")
        return result


@router.put("")
async def update_settings(body: Dict[str, str], _=Depends(get_current_user), pool=Depends(get_pool)):
    async with pool.acquire() as conn:
        for key, value in body.items():
            if key not in ALLOWED_KEYS:
                continue
            await conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ($1, $2) "
                "ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()",
                key, value,
            )
    return {"ok": True}


async def get_setting(key: str, pool) -> str:
    """Helper used by other routers to read a setting from DB."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT value FROM app_settings WHERE key=$1", key)
        return row["value"] if row else ""
