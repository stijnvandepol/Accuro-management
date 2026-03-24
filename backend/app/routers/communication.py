from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import require_role, get_client_ip
from app.core.rbac import Role
from app.core.security import sanitize_html
from app.services.audit_service import create_audit_log
from app.models.communication import CommunicationEntry
from app.models.project import ProjectWorkspace
from app.schemas.communication import CommunicationCreate, CommunicationResponse

router = APIRouter(prefix="/api/v1", tags=["communication"])


@router.get("/projects/{project_id}/communications", response_model=list[CommunicationResponse])
async def list_communications(
    project_id: str,
    limit: int = 100,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
):
    # Verify project exists
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(CommunicationEntry)
        .where(CommunicationEntry.project_id == project_id)
        .order_by(CommunicationEntry.occurred_at.desc())
        .limit(limit)
    )
    return [CommunicationResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/projects/{project_id}/communications", response_model=CommunicationResponse, status_code=status.HTTP_201_CREATED)
async def create_communication(
    project_id: str,
    body: CommunicationCreate,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
):
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    entry = CommunicationEntry(
        project_id=project_id,
        author_user_id=current_user.id,
        type=body.type.value,
        subject=body.subject,
        content=sanitize_html(body.content),
        external_sender_name=body.external_sender_name,
        external_sender_email=body.external_sender_email.lower().strip() if body.external_sender_email else None,
        is_internal=body.is_internal,
        links=body.links,
        occurred_at=body.occurred_at,
    )
    db.add(entry)
    await db.flush()

    await create_audit_log(
        db, "Communication", entry.id, "CREATE",
        actor_user_id=current_user.id,
        metadata={"project_id": project_id, "type": entry.type, "subject": entry.subject},
        ip_address=get_client_ip(request),
    )
    return CommunicationResponse.model_validate(entry)


@router.delete("/communications/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_communication(
    entry_id: str,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CommunicationEntry).where(CommunicationEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Communication entry not found")

    # EMPLOYEE can only delete own entries
    if current_user.role == Role.EMPLOYEE.value and entry.author_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only delete your own entries")

    await db.delete(entry)

    await create_audit_log(
        db, "Communication", entry.id, "DELETE",
        actor_user_id=current_user.id,
        metadata={"project_id": entry.project_id, "subject": entry.subject},
        ip_address=get_client_ip(request),
    )
