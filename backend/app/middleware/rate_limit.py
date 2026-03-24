from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
import structlog

from app.core.auth import check_rate_limit
from app.config import get_settings

logger = structlog.get_logger()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()
        path = request.url.path
        method = request.method

        # Determine rate limit tier
        if path.startswith("/api/v1/auth/"):
            max_requests, window = settings.parse_rate_limit(settings.RATE_LIMIT_AUTH)
            key_prefix = "auth"
        elif path.startswith("/api/v1/external/"):
            max_requests, window = settings.parse_rate_limit(settings.RATE_LIMIT_EXTERNAL_API)
            key_prefix = "external"
        elif path.startswith("/api/"):
            max_requests, window = settings.parse_rate_limit(settings.RATE_LIMIT_GENERAL)
            key_prefix = "general"
        else:
            return await call_next(request)

        # Build rate limit key from IP
        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip and request.client:
            client_ip = request.client.host
        rate_key = f"{key_prefix}:{client_ip}:{path}"

        try:
            allowed = await check_rate_limit(rate_key, max_requests, window)
            if not allowed:
                logger.warning("rate_limit_exceeded", ip=client_ip, path=path)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please try again later."},
                    headers={"Retry-After": str(window)},
                )
        except Exception as e:
            # If Redis is down, allow the request but log the error
            logger.error("rate_limit_check_failed", error=str(e))

        return await call_next(request)
