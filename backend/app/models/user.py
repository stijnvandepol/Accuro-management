import uuid
from sqlalchemy import String, Boolean, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, TimestampMixin
from app.core.rbac import Role


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(SAEnum(Role, name="user_role", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False, default=Role.EMPLOYEE.value)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    owned_projects = relationship("ProjectWorkspace", back_populates="owner", foreign_keys="ProjectWorkspace.owner_user_id")
    communication_entries = relationship("CommunicationEntry", back_populates="author")
    created_change_requests = relationship("ChangeRequest", back_populates="creator", foreign_keys="ChangeRequest.created_by_user_id")
    assigned_change_requests = relationship("ChangeRequest", back_populates="assignee", foreign_keys="ChangeRequest.assigned_to_user_id")
    internal_notes = relationship("InternalNote", back_populates="author")
    agent_runs = relationship("AgentRun", back_populates="initiator")
