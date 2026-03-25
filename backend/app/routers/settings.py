from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import require_role, get_client_ip
from app.core.rbac import Role
from app.services.audit_service import create_audit_log
from app.models.business_settings import BusinessSettings
from app.schemas.business_settings import BusinessSettingsUpdate, BusinessSettingsResponse

router = APIRouter(prefix="/api/v1/settings", tags=["settings"])


@router.get("", response_model=BusinessSettingsResponse | None)
async def get_settings(
    current_user=Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> BusinessSettingsResponse | None:
    result = await db.execute(select(BusinessSettings).where(BusinessSettings.id == 1))
    return result.scalar_one_or_none()


@router.put("", response_model=BusinessSettingsResponse)
async def update_settings(
    body: BusinessSettingsUpdate,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> BusinessSettingsResponse:
    result = await db.execute(select(BusinessSettings).where(BusinessSettings.id == 1))
    settings = result.scalar_one_or_none()

    data = body.model_dump()
    if settings:
        for field, value in data.items():
            setattr(settings, field, value)
    else:
        settings = BusinessSettings(id=1, **data)
        db.add(settings)
    await db.flush()

    await create_audit_log(
        db, "BusinessSettings", "1", "UPDATE",
        actor_user_id=current_user.id,
        metadata={"company_name": settings.company_name},
        ip_address=get_client_ip(request),
    )
    return settings
