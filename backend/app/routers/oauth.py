"""OAuth / OIDC router for Accuro."""
import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.oauth import (
    consume_auth_code,
    create_id_token,
    generate_auth_code,
    get_public_key_jwks,
    store_auth_code,
)
from app.core.security import verify_password, create_access_token
from app.database import get_db
from app.models.oauth_client import OAuthClient
from app.models.user import User
from app.config import get_settings

router = APIRouter(tags=["oauth"])
templates = Jinja2Templates(directory="app/templates")


@router.get("/oauth/authorize", response_class=HTMLResponse)
async def get_authorize(
    request: Request,
    client_id: str,
    redirect_uri: str,
    scope: str = "openid",
    state: str = "",
    db: AsyncSession = Depends(get_db),
):
    # 1. Look up client in DB
    result = await db.execute(select(OAuthClient).where(OAuthClient.client_id == client_id))
    client = result.scalar_one_or_none()

    # 2. Validate — do NOT redirect on errors (redirect_uri may be attacker-controlled)
    if client is None or not client.is_active:
        raise HTTPException(status_code=400, detail="Invalid client_id")
    if redirect_uri not in client.redirect_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")
    if "openid" not in scope.split():
        raise HTTPException(status_code=400, detail="scope must include openid")

    # 3. Render login form
    return templates.TemplateResponse(
        request,
        "oauth_login.html",
        {
            "client_name": client.name,
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": scope,
            "error": None,
            "year": datetime.now(tz=timezone.utc).year,
        },
    )


@router.post("/oauth/authorize")
async def post_authorize(
    request: Request,
    email: Annotated[str, Form()],
    password: Annotated[str, Form()],
    client_id: Annotated[str, Form()],
    redirect_uri: Annotated[str, Form()],
    state: Annotated[str, Form()] = "",
    scope: Annotated[str, Form()] = "openid",
    db: AsyncSession = Depends(get_db),
):
    # 1. Re-validate client (form fields can be tampered)
    result = await db.execute(select(OAuthClient).where(OAuthClient.client_id == client_id))
    client = result.scalar_one_or_none()
    if client is None or not client.is_active or redirect_uri not in client.redirect_uris:
        raise HTTPException(status_code=400, detail="Invalid request")

    # 2. Validate user credentials
    user_result = await db.execute(select(User).where(User.email == email))
    user = user_result.scalar_one_or_none()

    if user is None or not verify_password(password, user.password_hash):
        return templates.TemplateResponse(
            request,
            "oauth_login.html",
            {
                "client_name": client.name,
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "scope": scope,
                "error": "Ongeldig e-mailadres of wachtwoord.",
                "year": datetime.now(tz=timezone.utc).year,
            },
            status_code=401,
        )

    # 3. Generate auth code and store in Redis
    code = generate_auth_code()
    await store_auth_code(code, {
        "user_id": user.id,
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": scope,
    })

    # 4. Redirect to client with code
    return RedirectResponse(
        f"{redirect_uri}?code={code}&state={state}",
        status_code=302,
    )


@router.post("/oauth/token")
async def token(
    grant_type: Annotated[str, Form()],
    code: Annotated[str, Form()],
    client_id: Annotated[str, Form()],
    client_secret: Annotated[str, Form()],
    redirect_uri: Annotated[str, Form()],
    db: AsyncSession = Depends(get_db),
):
    if grant_type != "authorization_code":
        raise HTTPException(status_code=400, detail="unsupported_grant_type")

    # Validate client credentials (timing-safe bcrypt compare)
    result = await db.execute(select(OAuthClient).where(OAuthClient.client_id == client_id))
    client = result.scalar_one_or_none()
    if client is None or not client.is_active:
        raise HTTPException(status_code=401, detail="invalid_client")

    # Use verify_password for timing-safe comparison (bcrypt)
    if not verify_password(client_secret, client.client_secret_hash):
        raise HTTPException(status_code=401, detail="invalid_client")

    # Consume auth code (atomic)
    payload = await consume_auth_code(code)
    if payload is None:
        raise HTTPException(status_code=400, detail="invalid_grant")

    # Validate redirect_uri matches stored value
    if payload["redirect_uri"] != redirect_uri:
        raise HTTPException(status_code=400, detail="invalid_grant")

    # Look up user
    user_result = await db.execute(select(User).where(User.id == payload["user_id"]))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=400, detail="invalid_grant")

    settings = get_settings()

    # Issue tokens
    id_token = create_id_token(
        user_id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        client_id=client_id,
        issuer=settings.OAUTH_ISSUER,
    )
    access_token = create_access_token({"sub": user.id, "email": user.email})

    return {
        "access_token": access_token,
        "id_token": id_token,
        "token_type": "bearer",
        "expires_in": 900,
    }


@router.get("/oauth/jwks")
async def jwks():
    return get_public_key_jwks()


@router.get("/.well-known/openid-configuration")
async def openid_configuration():
    settings = get_settings()
    issuer = settings.OAUTH_ISSUER
    return {
        "issuer": issuer,
        "authorization_endpoint": f"{issuer}/oauth/authorize",
        "token_endpoint": f"{issuer}/oauth/token",
        "jwks_uri": f"{issuer}/oauth/jwks",
        "response_types_supported": ["code"],
        "subject_types_supported": ["public"],
        "id_token_signing_alg_values_supported": ["RS256"],
        "scopes_supported": ["openid", "profile", "email"],
        "token_endpoint_auth_methods_supported": ["client_secret_post"],
        "claims_supported": ["sub", "iss", "aud", "exp", "iat", "email", "name", "role"],
    }
