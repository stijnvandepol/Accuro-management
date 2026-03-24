import uuid
import enum
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base, TimestampMixin


class ChangeRequestSource(str, enum.Enum):
    EMAIL = "EMAIL"
    CALL = "CALL"
    WEBSITE_FORM = "WEBSITE_FORM"
    INTERNAL = "INTERNAL"


class ChangeRequestStatus(str, enum.Enum):
    NEW = "NEW"
    REVIEWED = "REVIEWED"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_FEEDBACK = "WAITING_FOR_FEEDBACK"
    DONE = "DONE"


class Impact(str, enum.Enum):
    SMALL = "SMALL"
    MEDIUM = "MEDIUM"
    LARGE = "LARGE"


class ChangeRequest(TimestampMixin, Base):
    __tablename__ = "change_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_workspaces.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(SAEnum(ChangeRequestSource, name="change_request_source", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(ChangeRequestStatus, name="change_request_status", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False, default=ChangeRequestStatus.NEW.value)
    impact: Mapped[str] = mapped_column(SAEnum(Impact, name="impact", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False, default=Impact.MEDIUM.value)
    github_issue_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    github_branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    github_pr_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    assigned_to_user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    reopened_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project = relationship("ProjectWorkspace", back_populates="change_requests")
    creator = relationship("User", back_populates="created_change_requests", foreign_keys=[created_by_user_id])
    assignee = relationship("User", back_populates="assigned_change_requests", foreign_keys=[assigned_to_user_id])
    internal_notes = relationship("InternalNote", back_populates="change_request")
