import uuid
from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base, TimestampMixin


class InternalNote(TimestampMixin, Base):
    __tablename__ = "internal_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("project_workspaces.id"), nullable=False, index=True)
    change_request_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("change_requests.id"), nullable=True)
    author_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    project = relationship("ProjectWorkspace", back_populates="internal_notes")
    change_request = relationship("ChangeRequest", back_populates="internal_notes")
    author = relationship("User", back_populates="internal_notes")
