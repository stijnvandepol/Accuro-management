from pydantic import BaseModel


class ExportRequest(BaseModel):
    password: str


class ExportResponse(BaseModel):
    exported_by: str
    exported_at: str
    counts: dict[str, int]
    data: dict
