from pydantic import BaseModel, HttpUrl, field_validator
from datetime import datetime


class RepositoryCreate(BaseModel):
    repo_name: str
    repo_url: str
    default_branch: str = "main"
    issue_board_url: str | None = None

    @field_validator("repo_name")
    @classmethod
    def name_min(cls, v: str) -> str:
        if len(v.strip()) < 1:
            raise ValueError("Repository name is required")
        return v.strip()


class RepositoryResponse(BaseModel):
    id: str
    project_id: str
    provider: str
    repo_name: str
    repo_url: str
    default_branch: str
    issue_board_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
