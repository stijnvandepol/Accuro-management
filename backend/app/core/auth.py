import redis.asyncio as redis
import json
from datetime import timedelta

from app.config import get_settings

_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


async def store_refresh_token(user_id: str, token: str, user_agent: str = "") -> None:
    settings = get_settings()
    r = await get_redis()
    key = f"refresh:{user_id}"
    data = json.dumps({"token": token, "user_agent": user_agent})
    await r.set(key, data, ex=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


async def get_stored_refresh_token(user_id: str) -> str | None:
    r = await get_redis()
    key = f"refresh:{user_id}"
    data = await r.get(key)
    if data:
        parsed = json.loads(data)
        return parsed.get("token")
    return None


async def delete_refresh_token(user_id: str) -> None:
    r = await get_redis()
    key = f"refresh:{user_id}"
    await r.delete(key)


async def invalidate_all_user_tokens(user_id: str) -> None:
    r = await get_redis()
    key = f"refresh:{user_id}"
    await r.delete(key)


async def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    r = await get_redis()
    current = await r.get(f"rate:{key}")
    if current is not None and int(current) >= max_requests:
        return False
    pipe = r.pipeline()
    pipe.incr(f"rate:{key}")
    pipe.expire(f"rate:{key}", window_seconds)
    await pipe.execute()
    return True
