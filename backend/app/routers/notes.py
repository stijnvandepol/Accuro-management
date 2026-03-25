from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.core.dependencies import require_role, get_client_ip
from app.core.rbac import Role
from app.core.security import sanitize_html
from app.services.audit_service import create_audit_log
from app.models.internal_note import InternalNote
from app.models.project import ProjectWorkspace
from app.schemas.internal_note import NoteCreate, NoteResponse

router = APIRouter(prefix="/api/v1", tags=["notes"])


@router.get("/projects/{project_id}/notes", response_model=list[NoteResponse])
async def list_notes(
    project_id: str,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> list[NoteResponse]:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    result = await db.execute(
        select(InternalNote)
        .where(InternalNote.project_id == project_id)
        .order_by(InternalNote.created_at.desc())
    )
    return [NoteResponse.model_validate(n) for n in result.scalars().all()]


@router.post("/projects/{project_id}/notes", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    project_id: str,
    body: NoteCreate,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> NoteResponse:
    project = await db.execute(
        select(ProjectWorkspace).where(ProjectWorkspace.id == project_id, ProjectWorkspace.deleted_at.is_(None))
    )
    if not project.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    note = InternalNote(
        project_id=project_id,
        author_user_id=current_user.id,
        content=sanitize_html(body.content),
        change_request_id=body.change_request_id,
    )
    db.add(note)
    await db.flush()

    await create_audit_log(
        db, "InternalNote", note.id, "CREATE",
        actor_user_id=current_user.id,
        metadata={"project_id": project_id},
        ip_address=get_client_ip(request),
    )
    return NoteResponse.model_validate(note)


@router.delete("/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: str,
    request: Request,
    current_user=Depends(require_role(Role.ADMIN, Role.EMPLOYEE)),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(select(InternalNote).where(InternalNote.id == note_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    if current_user.role == Role.EMPLOYEE.value and note.author_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only delete your own notes")

    await db.delete(note)

    await create_audit_log(
        db, "InternalNote", note.id, "DELETE",
        actor_user_id=current_user.id,
        ip_address=get_client_ip(request),
    )
