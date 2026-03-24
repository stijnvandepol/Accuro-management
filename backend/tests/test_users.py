import pytest
from tests.conftest import auth_header


class TestUsers:
    async def test_list_users(self, client, admin_token, admin_user):
        response = await client.get("/api/v1/users", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert len(response.json()) >= 1

    async def test_create_user(self, client, admin_token):
        response = await client.post("/api/v1/users", json={
            "name": "New User",
            "email": "newuser@test.com",
            "password": "StrongPass123!",
            "role": "EMPLOYEE",
        }, headers=auth_header(admin_token))
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New User"
        assert data["role"] == "EMPLOYEE"
        assert "password" not in data
        assert "password_hash" not in data

    async def test_create_user_weak_password(self, client, admin_token):
        response = await client.post("/api/v1/users", json={
            "name": "Weak", "email": "weak@test.com", "password": "123", "role": "EMPLOYEE",
        }, headers=auth_header(admin_token))
        assert response.status_code == 422

    async def test_create_user_duplicate_email(self, client, admin_token, admin_user):
        response = await client.post("/api/v1/users", json={
            "name": "Dupe", "email": "admin@test.com", "password": "StrongPass123!", "role": "EMPLOYEE",
        }, headers=auth_header(admin_token))
        assert response.status_code == 409

    async def test_update_user_role(self, client, admin_token, employee_user):
        response = await client.patch(f"/api/v1/users/{employee_user.id}", json={
            "role": "FINANCE",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["role"] == "FINANCE"

    async def test_deactivate_user(self, client, admin_token, employee_user):
        response = await client.delete(f"/api/v1/users/{employee_user.id}", headers=auth_header(admin_token))
        assert response.status_code == 204

    async def test_cannot_delete_self(self, client, admin_token, admin_user):
        response = await client.delete(f"/api/v1/users/{admin_user.id}", headers=auth_header(admin_token))
        assert response.status_code == 400

    async def test_employee_cannot_manage_users(self, client, employee_token):
        response = await client.get("/api/v1/users", headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_finance_cannot_manage_users(self, client, finance_token):
        response = await client.get("/api/v1/users", headers=auth_header(finance_token))
        assert response.status_code == 403
