import pytest
from tests.conftest import auth_header


class TestChangeRequests:
    async def test_create_change_request(self, client, admin_token, test_project_data):
        response = await client.post(f"/api/v1/projects/{test_project_data['id']}/change-requests", json={
            "title": "Fix header bug",
            "description": "The header breaks on mobile devices when scrolling",
            "source_type": "EMAIL",
            "impact": "SMALL",
        }, headers=auth_header(admin_token))
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Fix header bug"
        assert data["status"] == "NEW"
        assert data["reopened_count"] == 0

    async def test_close_and_reopen(self, client, admin_token, test_project_data):
        # Create
        cr = await client.post(f"/api/v1/projects/{test_project_data['id']}/change-requests", json={
            "title": "Test CR",
            "description": "Testing close and reopen functionality",
            "source_type": "INTERNAL",
            "impact": "MEDIUM",
        }, headers=auth_header(admin_token))
        cr_id = cr.json()["id"]

        # Close
        response = await client.post(f"/api/v1/change-requests/{cr_id}/close", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "DONE"
        assert response.json()["closed_at"] is not None

        # Reopen
        response = await client.post(f"/api/v1/change-requests/{cr_id}/reopen", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "NEW"
        assert response.json()["reopened_count"] == 1
        assert response.json()["closed_at"] is None

    async def test_update_change_request(self, client, admin_token, test_project_data):
        cr = await client.post(f"/api/v1/projects/{test_project_data['id']}/change-requests", json={
            "title": "Update Test",
            "description": "Testing update functionality",
            "source_type": "CALL",
            "impact": "LARGE",
        }, headers=auth_header(admin_token))
        cr_id = cr.json()["id"]

        response = await client.patch(f"/api/v1/change-requests/{cr_id}", json={
            "status": "IN_PROGRESS",
            "impact": "SMALL",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "IN_PROGRESS"
        assert response.json()["impact"] == "SMALL"

    async def test_list_change_requests(self, client, admin_token, test_project_data):
        # Create a few
        for i in range(3):
            await client.post(f"/api/v1/projects/{test_project_data['id']}/change-requests", json={
                "title": f"CR {i}",
                "description": f"Change request number {i} for testing",
                "source_type": "INTERNAL",
                "impact": "MEDIUM",
            }, headers=auth_header(admin_token))

        response = await client.get(f"/api/v1/projects/{test_project_data['id']}/change-requests", headers=auth_header(admin_token))
        assert response.status_code == 200
        assert len(response.json()) >= 3
