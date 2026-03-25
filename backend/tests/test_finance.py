import pytest
from tests.conftest import auth_header


class TestFinance:
    async def test_get_finance_overview(self, client, admin_token):
        response = await client.get("/api/v1/finance/overview", headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert "total_revenue" in data
        assert "open_amount" in data
        assert "overdue_amount" in data
        assert "vat_by_quarter" in data
        assert isinstance(data["vat_by_quarter"], dict)

    async def test_finance_overview_has_all_quarters(self, client, admin_token):
        response = await client.get("/api/v1/finance/overview", headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            assert q in data["vat_by_quarter"]

    async def test_finance_role_can_access(self, client, finance_token):
        response = await client.get("/api/v1/finance/overview", headers=auth_header(finance_token))
        assert response.status_code == 200
        data = response.json()
        assert "total_revenue" in data

    async def test_employee_cannot_access_finance(self, client, employee_token):
        response = await client.get("/api/v1/finance/overview", headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_monthly_report(self, client, admin_token):
        response = await client.get(
            "/api/v1/finance/reports/monthly",
            params={"year": 2026, "month": 1},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert data["month"] == 1
        assert "invoices" in data
        assert "vat_breakdown" in data

    async def test_yearly_report(self, client, admin_token):
        response = await client.get(
            "/api/v1/finance/reports/yearly",
            params={"year": 2026},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["year"] == 2026
        assert "monthly_breakdown" in data
        assert "vat_breakdown" in data

    async def test_employee_cannot_access_monthly_report(self, client, employee_token):
        response = await client.get(
            "/api/v1/finance/reports/monthly",
            params={"year": 2026, "month": 1},
            headers=auth_header(employee_token),
        )
        assert response.status_code == 403

    async def test_finance_role_can_access_reports(self, client, finance_token):
        response = await client.get(
            "/api/v1/finance/reports/monthly",
            params={"year": 2026, "month": 1},
            headers=auth_header(finance_token),
        )
        assert response.status_code == 200
