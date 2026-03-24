import uuid
import enum
from sqlalchemy import String, Text, Boolean, DateTime, ForeignKey, Enum as SAEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.database import Base, TimestampMixin


class CommunicationType(str, enum.Enum):
    EMAIL = "EMAIL"
    CALL = "CALL"
    MEETING = "MEETING"
    WHATSAPP = "WHATSAPP"
    DM = "DM"
    INTERNAL = "INTERNAL"
    OTHER = "OTHER"


class CommunicationEntry(TimestampMixin, Base):
    __tablename__ = "communication_entries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_workspaces.id"), nullable=False, index=True)
    author_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(SAEnum(CommunicationType, name="communication_type", create_constraint=True, values_callable=lambda x: [e.value for e in x]), nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    external_sender_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_sender_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    links: Mapped[list | None] = mapped_column(JSON, default=list)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    # Relationships
    project = relationship("ProjectWorkspace", back_populates="communications")
    author = relationship("User", back_populates="communication_entries")
