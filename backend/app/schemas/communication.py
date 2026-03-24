from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from app.models.communication import CommunicationType


class CommunicationCreate(BaseModel):
    type: CommunicationType
    subject: str
    content: str
    external_sender_name: str | None = None
    external_sender_email: EmailStr | None = None
    is_internal: bool = False
    links: list[str] = []
    occurred_at: datetime

    @field_validator("subject")
    @classmethod
    def subject_min(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Subject must be at least 2 characters")
        return v.strip()

    @field_validator("content")
    @classmethod
    def content_min(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Content must be at least 5 characters")
        return v.strip()


class CommunicationResponse(BaseModel):
    id: str
    project_id: str
    author_user_id: str
    type: str
    subject: str
    content: str
    external_sender_name: str | None
    external_sender_email: str | None
    is_internal: bool
    links: list[str]
    occurred_at: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
