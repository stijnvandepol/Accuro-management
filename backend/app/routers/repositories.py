from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import require_role, get_client_ip
from app.core.rbac import Role
from app.services.audit_service import create_audit_log
from app.models.repository import ProjectRepository
from app.models.project import ProjectWorkspace
from app.schemas.repository import RepositoryCreate, RepositoryResponse

router = APIRouter(prefix="/api/v1", tags=["repositories"])


@router.get("/projects/{project_id}/repositories", response_model=list[RepositoryResponse])
async def list_repositories(
    project_id: str,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> list[RepositoryResponse]:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(ProjectRepository).where(ProjectRepository.project_id == project_id)
    )
    return [RepositoryResponse.model_validate(r) for r in result.scalars().all()]


@router.post("/projects/{project_id}/repositories", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def add_repository(
    project_id: str,
    body: RepositoryCreate,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> RepositoryResponse:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    repo = ProjectRepository(
        project_id=project_id,
        repo_name=body.repo_name,
        repo_url=body.repo_url,
        default_branch=body.default_branch,
        issue_board_url=body.issue_board_url,
    )
    db.add(repo)
    await db.flush()

    await create_audit_log(
        db, "Repository", repo.id, "CREATE",
        actor_user_id=current_user.id,
        metadata={"project_id": project_id, "repo_name": repo.repo_name},
        ip_address=get_client_ip(request),
    )
    return RepositoryResponse.model_validate(repo)


@router.delete("/repositories/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(
    repo_id: str,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(ProjectRepository).where(ProjectRepository.id == repo_id))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found")

    await db.delete(repo)
    await create_audit_log(
        db, "Repository", repo.id, "DELETE",
        actor_user_id=current_user.id,
        metadata={"repo_name": repo.repo_name},
        ip_address=get_client_ip(request),
    )
