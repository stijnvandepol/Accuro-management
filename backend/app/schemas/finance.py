from pydantic import BaseModel
from decimal import Decimal


class VatBreakdown(BaseModel):
    vat_rate: Decimal
    subtotal: Decimal
    vat_amount: Decimal
    total: Decimal


class QuarterVatSummary(BaseModel):
    received_vat: Decimal  # BTW ontvangen van klanten
    paid_vat: Decimal  # BTW betaald op inkopen
    vat_due: Decimal  # Af te dragen = received - paid
    breakdown: list[VatBreakdown]


class FinanceOverview(BaseModel):
    total_revenue: Decimal
    open_amount: Decimal
    overdue_amount: Decimal
    total_expenses: Decimal
    profit: Decimal  # revenue - expenses (excl vat)
    vat_by_quarter: dict[str, QuarterVatSummary]


class MonthlyReport(BaseModel):
    year: int
    month: int
    month_label: str
    invoices: list[dict]
    vat_breakdown: list[VatBreakdown]
    total_subtotal: Decimal
    total_vat: Decimal
    total_amount: Decimal


class YearlyReport(BaseModel):
    year: int
    monthly_breakdown: list[dict]
    vat_breakdown: list[VatBreakdown]
    total_subtotal: Decimal
    total_vat: Decimal
    total_amount: Decimal
