import pytest
from tests.conftest import auth_header


class TestCommunication:
    async def test_list_communications_empty(self, client, admin_token, test_project_data):
        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_communications_project_not_found(self, client, admin_token):
        response = await client.get(
            "/api/v1/projects/nonexistent-id/communications",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_create_communication(self, client, admin_token, test_project_data):
        response = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            json={
                "type": "EMAIL",
                "subject": "Test Subject",
                "content": "This is a test communication entry",
                "is_internal": False,
                "links": [],
                "occurred_at": "2026-01-15T10:00:00Z",
            },
            headers=auth_header(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["subject"] == "Test Subject"
        assert data["type"] == "EMAIL"
        assert data["project_id"] == test_project_data["id"]

    async def test_list_communications_with_data(self, client, admin_token, test_project_data):
        await client.post(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            json={
                "type": "CALL",
                "subject": "Follow-up call",
                "content": "Discussed project timeline",
                "is_internal": True,
                "links": [],
                "occurred_at": "2026-01-16T14:00:00Z",
            },
            headers=auth_header(admin_token),
        )

        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(c["subject"] == "Follow-up call" for c in data)

    async def test_create_communication_project_not_found(self, client, admin_token):
        response = await client.post(
            "/api/v1/projects/nonexistent-id/communications",
            json={
                "type": "EMAIL",
                "subject": "Test",
                "content": "Test content here",
                "is_internal": False,
                "links": [],
                "occurred_at": "2026-01-15T10:00:00Z",
            },
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_delete_communication_own_entry(self, client, admin_token, test_project_data):
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            json={
                "type": "EMAIL",
                "subject": "To be deleted",
                "content": "This entry will be deleted",
                "is_internal": False,
                "links": [],
                "occurred_at": "2026-01-15T10:00:00Z",
            },
            headers=auth_header(admin_token),
        )
        entry_id = create_resp.json()["id"]

        response = await client.delete(
            f"/api/v1/communications/{entry_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_delete_communication_not_found(self, client, admin_token):
        response = await client.delete(
            "/api/v1/communications/nonexistent-id",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_employee_cannot_delete_other_user_entry(
        self, client, admin_token, employee_token, test_project_data
    ):
        # Admin creates an entry
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            json={
                "type": "EMAIL",
                "subject": "Admin entry",
                "content": "Created by admin user",
                "is_internal": False,
                "links": [],
                "occurred_at": "2026-01-15T10:00:00Z",
            },
            headers=auth_header(admin_token),
        )
        entry_id = create_resp.json()["id"]

        # Employee tries to delete it
        response = await client.delete(
            f"/api/v1/communications/{entry_id}",
            headers=auth_header(employee_token),
        )
        assert response.status_code == 403

    async def test_admin_can_delete_other_user_entry(
        self, client, admin_token, employee_token, test_project_data
    ):
        # Employee creates an entry
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            json={
                "type": "MEETING",
                "subject": "Employee entry",
                "content": "Created by employee user",
                "is_internal": False,
                "links": [],
                "occurred_at": "2026-01-15T10:00:00Z",
            },
            headers=auth_header(employee_token),
        )
        entry_id = create_resp.json()["id"]

        # Admin deletes it
        response = await client.delete(
            f"/api/v1/communications/{entry_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_finance_cannot_access_communications(self, client, finance_token, test_project_data):
        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/communications",
            headers=auth_header(finance_token),
        )
        assert response.status_code == 403
