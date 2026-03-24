from pydantic import BaseModel, field_validator
from datetime import datetime
from app.models.change_request import ChangeRequestSource, ChangeRequestStatus, Impact


class ChangeRequestCreate(BaseModel):
    title: str
    description: str
    source_type: ChangeRequestSource
    status: ChangeRequestStatus = ChangeRequestStatus.NEW
    impact: Impact = Impact.MEDIUM
    github_issue_url: str | None = None
    github_branch: str | None = None
    github_pr_url: str | None = None
    assigned_to_user_id: str | None = None

    @field_validator("title")
    @classmethod
    def title_min(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Title must be at least 2 characters")
        return v.strip()

    @field_validator("description")
    @classmethod
    def desc_min(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v.strip()


class ChangeRequestUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: ChangeRequestStatus | None = None
    impact: Impact | None = None
    github_issue_url: str | None = None
    github_branch: str | None = None
    github_pr_url: str | None = None
    assigned_to_user_id: str | None = None


class ChangeRequestResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str
    source_type: str
    status: str
    impact: str
    github_issue_url: str | None
    github_branch: str | None
    github_pr_url: str | None
    created_by_user_id: str
    assigned_to_user_id: str | None
    reopened_count: int
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
