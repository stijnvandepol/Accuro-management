import pytest
from tests.conftest import auth_header


class TestSettings:
    async def test_get_settings_empty(self, client, admin_token):
        response = await client.get("/api/v1/settings", headers=auth_header(admin_token))
        assert response.status_code == 200
        # No settings exist yet, should return null
        assert response.json() is None

    async def test_update_settings(self, client, admin_token):
        response = await client.put("/api/v1/settings", json={
            "company_name": "Test BV",
            "email": "info@testbv.nl",
            "address": "Teststraat 1, 1234 AB Amsterdam",
            "kvk_number": "12345678",
            "vat_number": "NL123456789B01",
            "iban": "NL00BANK0123456789",
            "bank_name": "Test Bank",
            "phone": "+31612345678",
            "default_vat_rate": 21.00,
            "payment_term_days": 30,
            "default_quote_valid_days": 30,
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Test BV"
        assert data["email"] == "info@testbv.nl"
        assert data["kvk_number"] == "12345678"

    async def test_get_settings_after_update(self, client, admin_token):
        # First create settings
        await client.put("/api/v1/settings", json={
            "company_name": "My Company",
            "email": "info@mycompany.nl",
        }, headers=auth_header(admin_token))

        response = await client.get("/api/v1/settings", headers=auth_header(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert data is not None
        assert data["company_name"] == "My Company"

    async def test_update_settings_overwrites(self, client, admin_token):
        # Create initial settings
        await client.put("/api/v1/settings", json={
            "company_name": "First Name",
            "email": "first@company.nl",
        }, headers=auth_header(admin_token))

        # Update settings
        response = await client.put("/api/v1/settings", json={
            "company_name": "Second Name",
            "email": "second@company.nl",
        }, headers=auth_header(admin_token))
        assert response.status_code == 200
        assert response.json()["company_name"] == "Second Name"

    async def test_employee_cannot_access_settings(self, client, employee_token):
        response = await client.get("/api/v1/settings", headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_employee_cannot_update_settings(self, client, employee_token):
        response = await client.put("/api/v1/settings", json={
            "company_name": "Hacked",
            "email": "hacked@company.nl",
        }, headers=auth_header(employee_token))
        assert response.status_code == 403

    async def test_finance_cannot_access_settings(self, client, finance_token):
        response = await client.get("/api/v1/settings", headers=auth_header(finance_token))
        assert response.status_code == 403
