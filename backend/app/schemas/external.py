from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class ExternalClientData(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str | None = None


class ExternalTicketCreate(BaseModel):
    client: ExternalClientData | None = None
    client_id: str | None = None
    project_name: str
    description: str
    source: str = "WEBSITE_FORM"
    priority: str = "MEDIUM"

    @field_validator("project_name")
    @classmethod
    def name_min(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Project name must be at least 2 characters")
        return v.strip()

    @field_validator("description")
    @classmethod
    def desc_min(cls, v: str) -> str:
        if len(v.strip()) < 10:
            raise ValueError("Description must be at least 10 characters")
        return v.strip()


class ExternalTicketResponse(BaseModel):
    ticket_id: str
    project_id: str
    project_slug: str
    status: str
    created_at: datetime
