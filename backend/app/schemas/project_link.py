from pydantic import BaseModel, field_validator
from datetime import datetime


class LinkCreate(BaseModel):
    label: str
    url: str
    description: str | None = None

    @field_validator("label")
    @classmethod
    def label_min(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("Label is required")
        return v.strip()


class LinkResponse(BaseModel):
    id: str
    project_id: str
    label: str
    url: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
