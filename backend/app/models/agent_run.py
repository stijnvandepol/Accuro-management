import uuid
import enum
from sqlalchemy import String, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, TimestampMixin


class AgentRunStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AgentRun(TimestampMixin, Base):
    __tablename__ = "agent_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_workspaces.id"), nullable=False, index=True)
    change_request_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("change_requests.id"), nullable=True)
    initiated_by_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="internal")
    status: Mapped[str] = mapped_column(SAEnum(AgentRunStatus, name="agent_run_status", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False, default=AgentRunStatus.PENDING.value)
    prompt_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    github_issue_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    pull_request_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # Relationships
    project = relationship("ProjectWorkspace", back_populates="agent_runs")
    initiator = relationship("User", back_populates="agent_runs")
