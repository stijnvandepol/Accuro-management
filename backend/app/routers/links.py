from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import require_role, get_client_ip
from app.core.rbac import Role
from app.services.audit_service import create_audit_log
from app.models.project_link import ProjectLink
from app.models.project import ProjectWorkspace
from app.schemas.project_link import LinkCreate, LinkResponse

router = APIRouter(prefix="/api/v1", tags=["links"])


@router.get("/projects/{project_id}/links", response_model=list[LinkResponse])
async def list_links(
    project_id: str,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> list[LinkResponse]:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(ProjectLink).where(ProjectLink.project_id == project_id)
    )
    return [LinkResponse.model_validate(l) for l in result.scalars().all()]


@router.post("/projects/{project_id}/links", response_model=LinkResponse, status_code=status.HTTP_201_CREATED)
async def add_link(
    project_id: str,
    body: LinkCreate,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> LinkResponse:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    link = ProjectLink(
        project_id=project_id,
        label=body.label,
        url=body.url,
        description=body.description,
    )
    db.add(link)
    await db.flush()

    await create_audit_log(
        db, "ProjectLink", link.id, "CREATE",
        actor_user_id=current_user.id,
        metadata={"project_id": project_id, "label": link.label},
        ip_address=get_client_ip(request),
    )
    return LinkResponse.model_validate(link)


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: str,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(ProjectLink).where(ProjectLink.id == link_id))
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")

    await db.delete(link)
    await create_audit_log(
        db, "ProjectLink", link.id, "DELETE",
        actor_user_id=current_user.id,
        metadata={"label": link.label},
        ip_address=get_client_ip(request),
    )
