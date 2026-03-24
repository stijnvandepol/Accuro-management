from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime


class ClientCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    invoice_details: str | None = None

    @field_validator("company_name", "contact_name")
    @classmethod
    def min_length(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Must be at least 2 characters")
        return v.strip()


class ClientUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None
    invoice_details: str | None = None


class ClientResponse(BaseModel):
    id: str
    company_name: str
    contact_name: str
    email: str
    phone: str | None
    address: str | None
    notes: str | None
    invoice_details: str | None
    created_at: datetime
    updated_at: datetime
    project_count: int = 0

    model_config = {"from_attributes": True}


class ClientDetailResponse(ClientResponse):
    projects: list = []
    invoices: list = []
