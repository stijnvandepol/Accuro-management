from pydantic import BaseModel, field_validator
from datetime import date, datetime
from decimal import Decimal
from app.models.invoice import InvoiceStatus


class InvoiceLineItem(BaseModel):
    description: str
    quantity: Decimal
    unit_price: Decimal
    total: Decimal


class InvoiceCreate(BaseModel):
    client_id: str
    project_id: str | None = None
    issue_date: date
    service_date: date | None = None
    due_date: date
    subtotal: Decimal
    vat_rate: Decimal = Decimal("21.00")
    description: str
    notes: str | None = None
    line_items: list[InvoiceLineItem] = []

    @field_validator("subtotal")
    @classmethod
    def subtotal_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Subtotal must be positive")
        return v

    @field_validator("vat_rate")
    @classmethod
    def vat_range(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("VAT rate must be between 0 and 100")
        return v

    @field_validator("description")
    @classmethod
    def desc_min(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Description must be at least 2 characters")
        return v.strip()


class InvoiceUpdate(BaseModel):
    issue_date: date | None = None
    service_date: date | None = None
    due_date: date | None = None
    subtotal: Decimal | None = None
    vat_rate: Decimal | None = None
    description: str | None = None
    notes: str | None = None
    status: InvoiceStatus | None = None
    line_items: list[InvoiceLineItem] | None = None


class InvoiceResponse(BaseModel):
    id: str
    client_id: str
    project_id: str | None
    invoice_number: str
    issue_date: date
    service_date: date | None
    due_date: date
    status: str
    subtotal: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    description: str
    notes: str | None
    line_items: list[InvoiceLineItem]
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InvoiceFilterParams(BaseModel):
    client_id: str | None = None
    project_id: str | None = None
    status: InvoiceStatus | None = None
