from pydantic import BaseModel, field_validator
from decimal import Decimal
from datetime import date, datetime


class TimeEntryCreate(BaseModel):
    project_id: str
    date: date
    hours: Decimal
    description: str | None = None

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: Decimal) -> Decimal:
        if v <= 0 or v > 24:
            raise ValueError("Hours must be between 0 and 24")
        return v


class TimeEntryUpdate(BaseModel):
    project_id: str | None = None
    date: date | None = None
    hours: Decimal | None = None
    description: str | None = None

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and (v <= 0 or v > 24):
            raise ValueError("Hours must be between 0 and 24")
        return v


class TimeEntryResponse(BaseModel):
    id: str
    user_id: str
    project_id: str
    date: date
    hours: Decimal
    description: str | None
    created_at: datetime
    updated_at: datetime
    project_name: str | None = None

    model_config = {"from_attributes": True}


class TimeEntrySummary(BaseModel):
    year: int
    total_hours: Decimal
    target_hours: Decimal = Decimal("1225")
    monthly: list[dict]
    by_project: list[dict]
