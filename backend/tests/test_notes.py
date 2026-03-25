import pytest
from tests.conftest import auth_header


class TestNotes:
    async def test_list_notes_empty(self, client, admin_token, test_project_data):
        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_list_notes_project_not_found(self, client, admin_token):
        response = await client.get(
            "/api/v1/projects/nonexistent-id/notes",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_create_note(self, client, admin_token, test_project_data):
        response = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "This is a test note"},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 201
        data = response.json()
        assert data["content"] == "This is a test note"
        assert data["project_id"] == test_project_data["id"]
        assert data["change_request_id"] is None

    async def test_create_note_project_not_found(self, client, admin_token):
        response = await client.post(
            "/api/v1/projects/nonexistent-id/notes",
            json={"content": "This is a test note"},
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_list_notes_with_data(self, client, admin_token, test_project_data):
        await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "First note"},
            headers=auth_header(admin_token),
        )
        await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "Second note"},
            headers=auth_header(admin_token),
        )

        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2

    async def test_delete_note(self, client, admin_token, test_project_data):
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "Note to delete"},
            headers=auth_header(admin_token),
        )
        note_id = create_resp.json()["id"]

        response = await client.delete(
            f"/api/v1/notes/{note_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_delete_note_not_found(self, client, admin_token):
        response = await client.delete(
            "/api/v1/notes/nonexistent-id",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_employee_cannot_delete_other_user_note(
        self, client, admin_token, employee_token, test_project_data
    ):
        # Admin creates a note
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "Admin's private note"},
            headers=auth_header(admin_token),
        )
        note_id = create_resp.json()["id"]

        # Employee tries to delete it
        response = await client.delete(
            f"/api/v1/notes/{note_id}",
            headers=auth_header(employee_token),
        )
        assert response.status_code == 403

    async def test_admin_can_delete_other_user_note(
        self, client, admin_token, employee_token, test_project_data
    ):
        # Employee creates a note
        create_resp = await client.post(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            json={"content": "Employee note"},
            headers=auth_header(employee_token),
        )
        note_id = create_resp.json()["id"]

        # Admin deletes it
        response = await client.delete(
            f"/api/v1/notes/{note_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

    async def test_finance_cannot_access_notes(self, client, finance_token, test_project_data):
        response = await client.get(
            f"/api/v1/projects/{test_project_data['id']}/notes",
            headers=auth_header(finance_token),
        )
        assert response.status_code == 403
