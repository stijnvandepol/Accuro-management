import pytest
from tests.conftest import auth_header


class TestRBAC:
    """Test that role-based access control is enforced on all endpoints."""

    async def test_admin_full_access(self, client, admin_token, test_project_data, test_client_data):
        endpoints = [
            ("GET", "/api/v1/clients"),
            ("GET", "/api/v1/projects"),
            ("GET", "/api/v1/invoices"),
            ("GET", "/api/v1/dashboard/stats"),
            ("GET", "/api/v1/users"),
            ("GET", "/api/v1/settings"),
        ]
        for method, path in endpoints:
            response = await client.request(method, path, headers=auth_header(admin_token))
            assert response.status_code in (200, 204), f"Admin denied on {method} {path}: {response.status_code}"

    async def test_employee_restricted(self, client, employee_token):
        # Can access
        response = await client.get("/api/v1/clients", headers=auth_header(employee_token))
        assert response.status_code == 200

        response = await client.get("/api/v1/projects", headers=auth_header(employee_token))
        assert response.status_code == 200

        response = await client.get("/api/v1/dashboard/stats", headers=auth_header(employee_token))
        assert response.status_code == 200

        # Cannot access
        response = await client.get("/api/v1/invoices", headers=auth_header(employee_token))
        assert response.status_code == 403

        response = await client.get("/api/v1/users", headers=auth_header(employee_token))
        assert response.status_code == 403

        response = await client.get("/api/v1/settings", headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_finance_restricted(self, client, finance_token):
        # Can access
        response = await client.get("/api/v1/clients", headers=auth_header(finance_token))
        assert response.status_code == 200

        response = await client.get("/api/v1/invoices", headers=auth_header(finance_token))
        assert response.status_code == 200

        response = await client.get("/api/v1/finance/overview", headers=auth_header(finance_token))
        assert response.status_code == 200

        # Cannot access
        response = await client.get("/api/v1/projects", headers=auth_header(finance_token))
        assert response.status_code == 403

        response = await client.get("/api/v1/dashboard/stats", headers=auth_header(finance_token))
        assert response.status_code == 403

        response = await client.get("/api/v1/users", headers=auth_header(finance_token))
        assert response.status_code == 403

    async def test_unauthenticated_blocked(self, client):
        endpoints = [
            "/api/v1/clients",
            "/api/v1/projects",
            "/api/v1/invoices",
            "/api/v1/users",
            "/api/v1/settings",
            "/api/v1/dashboard/stats",
            "/api/v1/finance/overview",
        ]
        for path in endpoints:
            response = await client.get(path)
            assert response.status_code in (401, 403), f"Unauthenticated access allowed on {path}"
