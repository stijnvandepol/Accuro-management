import pytest
from tests.conftest import auth_header


class TestInvoices:
    async def test_create_invoice(self, client, admin_token, test_client_data):
        response = await client.post("/api/v1/invoices", json={
            "client_id": test_client_data["id"],
            "subtotal": 1000.00,
            "vat_rate": 21.00,
            "issue_date": "2026-01-15",
            "due_date": "2026-02-14",
            "description": "Website development",
        }, headers=auth_header(admin_token))
        assert response.status_code == 201
        data = response.json()
        assert data["invoice_number"].startswith("2026-")
        assert float(data["subtotal"]) == 1000.00
        assert float(data["vat_rate"]) == 21.00
        assert float(data["vat_amount"]) == 210.00
        assert float(data["total_amount"]) == 1210.00
        assert data["status"] == "DRAFT"

    async def test_mark_paid(self, client, admin_token, test_client_data):
        inv = await client.post("/api/v1/invoices", json={
            "client_id": test_client_data["id"],
            "subtotal": 500.00,
            "vat_rate": 21.00,
            "issue_date": "2026-01-15",
            "due_date": "2026-02-14",
            "description": "Consulting",
        }, headers=auth_header(admin_token))
        inv_id = inv.json()["id"]

        response = await client.post(f"/api/v1/invoices/{inv_id}/mark-paid", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "PAID"
        assert response.json()["paid_at"] is not None

    async def test_update_invoice_recalculates_vat(self, client, admin_token, test_client_data):
        inv = await client.post("/api/v1/invoices", json={
            "client_id": test_client_data["id"],
            "subtotal": 1000.00,
            "vat_rate": 21.00,
            "issue_date": "2026-01-15",
            "due_date": "2026-02-14",
            "description": "Test",
        }, headers=auth_header(admin_token))
        inv_id = inv.json()["id"]

        response = await client.patch(f"/api/v1/invoices/{inv_id}", json={
            "subtotal": 2000.00,
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert float(response.json()["vat_amount"]) == 420.00
        assert float(response.json()["total_amount"]) == 2420.00

    async def test_list_invoices(self, client, admin_token, test_client_data):
        await client.post("/api/v1/invoices", json={
            "client_id": test_client_data["id"],
            "subtotal": 100.00, "vat_rate": 21.00,
            "issue_date": "2026-01-01", "due_date": "2026-01-31",
            "description": "Test",
        }, headers=auth_header(admin_token))

        response = await client.get("/api/v1/invoices", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    async def test_delete_invoice(self, client, admin_token, test_client_data):
        inv = await client.post("/api/v1/invoices", json={
            "client_id": test_client_data["id"],
            "subtotal": 100.00, "vat_rate": 21.00,
            "issue_date": "2026-01-01", "due_date": "2026-01-31",
            "description": "Delete test",
        }, headers=auth_header(admin_token))
        inv_id = inv.json()["id"]

        response = await client.delete(f"/api/v1/invoices/{inv_id}", headers=auth_header(admin_token))
        assert response.status_code == 204

    async def test_employee_cannot_access_invoices(self, client, employee_token):
        response = await client.get("/api/v1/invoices", headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_finance_can_access_invoices(self, client, finance_token, test_client_data):
        response = await client.get("/api/v1/invoices", headers=auth_header(finance_token))
        assert response.status_code == 200
