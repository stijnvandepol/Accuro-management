from pydantic import BaseModel, field_validator
from datetime import datetime


class NoteCreate(BaseModel):
    content: str
    change_request_id: str | None = None

    @field_validator("content")
    @classmethod
    def content_min(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("Content is required")
        return v.strip()


class NoteResponse(BaseModel):
    id: str
    project_id: str
    change_request_id: str | None
    author_user_id: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}
