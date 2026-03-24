import pytest
from tests.conftest import auth_header


class TestClients:
    async def test_create_client(self, client, admin_token):
        response = await client.post("/api/v1/clients", json={
            "company_name": "Acme Corp",
            "contact_name": "Jane Smith",
            "email": "jane@acme.com",
            "phone": "+31612345678",
        }, headers=auth_header(admin_token))
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == "Acme Corp"
        assert data["contact_name"] == "Jane Smith"
        assert data["email"] == "jane@acme.com"
        assert data["project_count"] == 0

    async def test_create_client_duplicate_email(self, client, admin_token, test_client_data):
        response = await client.post("/api/v1/clients", json={
            "company_name": "Other Corp",
            "contact_name": "Other Person",
            "email": "john@testcompany.com",
        }, headers=auth_header(admin_token))
        assert response.status_code == 409

    async def test_list_clients(self, client, admin_token, test_client_data):
        response = await client.get("/api/v1/clients", headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(c["company_name"] == "Test Company" for c in data)

    async def test_get_client(self, client, admin_token, test_client_data):
        response = await client.get(f"/api/v1/clients/{test_client_data['id']}", headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Test Company"
        assert "projects" in data
        assert "invoices" in data

    async def test_get_client_not_found(self, client, admin_token):
        response = await client.get("/api/v1/clients/nonexistent-id", headers=auth_header(admin_token))
        assert response.status_code == 404

    async def test_update_client(self, client, admin_token, test_client_data):
        response = await client.patch(f"/api/v1/clients/{test_client_data['id']}", json={
            "company_name": "Updated Company",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["company_name"] == "Updated Company"

    async def test_delete_client(self, client, admin_token, test_client_data):
        response = await client.delete(f"/api/v1/clients/{test_client_data['id']}", headers=auth_header(admin_token))
        assert response.status_code == 204

        # Should be soft-deleted (not found)
        response = await client.get(f"/api/v1/clients/{test_client_data['id']}", headers=auth_header(admin_token))
        assert response.status_code == 404

    async def test_delete_client_with_projects(self, client, admin_token, test_client_data, test_project_data):
        response = await client.delete(f"/api/v1/clients/{test_client_data['id']}", headers=auth_header(admin_token))
        assert response.status_code == 400

    async def test_finance_can_read_clients(self, client, finance_token, test_client_data):
        response = await client.get("/api/v1/clients", headers=auth_header(finance_token))
        assert response.status_code == 200

    async def test_finance_cannot_create_clients(self, client, finance_token):
        response = await client.post("/api/v1/clients", json={
            "company_name": "Test", "contact_name": "Test", "email": "test@test.com",
        }, headers=auth_header(finance_token))
        assert response.status_code == 403

    async def test_employee_cannot_delete_clients(self, client, employee_token, test_client_data):
        response = await client.delete(f"/api/v1/clients/{test_client_data['id']}", headers=auth_header(employee_token))
        assert response.status_code == 403
