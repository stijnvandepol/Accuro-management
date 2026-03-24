from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog


async def create_audit_log(
    db: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: str,
    actor_user_id: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
) -> AuditLog:
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor_user_id=actor_user_id,
        metadata_json=metadata,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(log)
    await db.flush()
    return log
