import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, TimestampMixin


class ProjectRepository(TimestampMixin, Base):
    __tablename__ = "project_repositories"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_workspaces.id"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="github")
    repo_name: Mapped[str] = mapped_column(String(255), nullable=False)
    repo_url: Mapped[str] = mapped_column(String(500), nullable=False)
    default_branch: Mapped[str] = mapped_column(String(100), nullable=False, default="main")
    issue_board_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    project = relationship("ProjectWorkspace", back_populates="repositories")
