import pytest
from tests.conftest import auth_header


class TestProposals:
    async def test_create_proposal(self, client, admin_token, test_client_data, test_project_data):
        response = await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Website Redesign Proposal",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "recipient_company": "Test Company",
            "summary": "A complete website redesign",
            "amount": 5000.00,
        }, headers=auth_header(admin_token))
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Website Redesign Proposal"
        assert data["status"] == "DRAFT"
        assert float(data["amount"]) == 5000.00
        assert data["client_id"] == test_client_data["id"]

    async def test_create_proposal_client_not_found(self, client, admin_token):
        response = await client.post("/api/v1/proposals", json={
            "client_id": "nonexistent-id",
            "title": "Test Proposal",
            "recipient_name": "John Doe",
            "recipient_email": "john@test.com",
            "amount": 1000.00,
        }, headers=auth_header(admin_token))
        assert response.status_code == 404

    async def test_list_proposals_by_project(self, client, admin_token, test_client_data, test_project_data):
        # Create a proposal
        await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Proposal One",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "amount": 3000.00,
        }, headers=auth_header(admin_token))

        response = await client.get(
            f"/api/v1/proposals/by-project/{test_project_data['id']}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert any(p["title"] == "Proposal One" for p in data)

    async def test_list_proposals_empty_project(self, client, admin_token, test_project_data):
        response = await client.get(
            f"/api/v1/proposals/by-project/{test_project_data['id']}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 200
        assert response.json() == []

    async def test_update_proposal(self, client, admin_token, test_client_data, test_project_data):
        create_resp = await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Original Title",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "amount": 2000.00,
        }, headers=auth_header(admin_token))
        proposal_id = create_resp.json()["id"]

        response = await client.patch(f"/api/v1/proposals/{proposal_id}", json={
            "title": "Updated Title",
            "amount": 2500.00,
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"
        assert float(data["amount"]) == 2500.00

    async def test_update_proposal_not_found(self, client, admin_token):
        response = await client.patch("/api/v1/proposals/nonexistent-id", json={
            "title": "Updated",
        }, headers=auth_header(admin_token))
        assert response.status_code == 404

    async def test_delete_proposal(self, client, admin_token, test_client_data, test_project_data):
        create_resp = await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Delete Me",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "amount": 1000.00,
        }, headers=auth_header(admin_token))
        proposal_id = create_resp.json()["id"]

        response = await client.delete(
            f"/api/v1/proposals/{proposal_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 204

        # Verify it's gone
        response = await client.get(
            f"/api/v1/proposals/{proposal_id}",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_delete_proposal_not_found(self, client, admin_token):
        response = await client.delete(
            "/api/v1/proposals/nonexistent-id",
            headers=auth_header(admin_token),
        )
        assert response.status_code == 404

    async def test_mark_ready(self, client, admin_token, test_client_data, test_project_data):
        create_resp = await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Ready Proposal",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "amount": 4000.00,
        }, headers=auth_header(admin_token))
        proposal_id = create_resp.json()["id"]

        response = await client.patch(f"/api/v1/proposals/{proposal_id}", json={
            "status": "READY",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "READY"

    async def test_mark_sent(self, client, admin_token, test_client_data, test_project_data):
        create_resp = await client.post("/api/v1/proposals", json={
            "client_id": test_client_data["id"],
            "project_id": test_project_data["id"],
            "title": "Sent Proposal",
            "recipient_name": "John Doe",
            "recipient_email": "john@testcompany.com",
            "amount": 6000.00,
        }, headers=auth_header(admin_token))
        proposal_id = create_resp.json()["id"]

        response = await client.patch(f"/api/v1/proposals/{proposal_id}", json={
            "status": "SENT",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["status"] == "SENT"

    async def test_finance_cannot_access_proposals(self, client, finance_token, test_project_data):
        response = await client.get(
            f"/api/v1/proposals/by-project/{test_project_data['id']}",
            headers=auth_header(finance_token),
        )
        assert response.status_code == 403
