"""Integration tests for OAuth/OIDC endpoints."""
import pytest
from app.core.security import hash_password


@pytest.fixture
async def oauth_client(db_session):
    """Create a test OAuthClient in the DB."""
    from app.models.oauth_client import OAuthClient

    client = OAuthClient(
        client_id="test-client",
        client_secret_hash=hash_password("test-secret"),
        name="Test Client",
        redirect_uris=["https://example.com/callback"],
        allowed_scopes="openid profile email",
        is_active=True,
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


class TestOAuthAuthorize:
    async def test_get_authorize_renders_form(self, client, oauth_client):
        """GET /oauth/authorize returns HTML login form."""
        response = await client.get(
            "/oauth/authorize",
            params={
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "scope": "openid profile",
            },
        )
        assert response.status_code == 200
        assert b"Test Client" in response.content
        assert b"<form" in response.content

    async def test_get_authorize_invalid_client(self, client):
        response = await client.get(
            "/oauth/authorize",
            params={
                "client_id": "nonexistent",
                "redirect_uri": "https://example.com/callback",
                "scope": "openid",
            },
        )
        assert response.status_code == 400

    async def test_get_authorize_invalid_redirect_uri(self, client, oauth_client):
        response = await client.get(
            "/oauth/authorize",
            params={
                "client_id": "test-client",
                "redirect_uri": "https://evil.com/callback",
                "scope": "openid",
            },
        )
        assert response.status_code == 400

    async def test_get_authorize_missing_openid_scope(self, client, oauth_client):
        response = await client.get(
            "/oauth/authorize",
            params={
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "scope": "profile",
            },
        )
        assert response.status_code == 400

    async def test_post_authorize_valid_credentials_redirects(
        self, client, oauth_client, admin_user
    ):
        """POST /oauth/authorize with valid credentials redirects with code."""
        response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "test-state",
                "scope": "openid",
            },
            follow_redirects=False,
        )
        assert response.status_code == 302
        location = response.headers["location"]
        assert location.startswith("https://example.com/callback")
        assert "code=" in location
        assert "state=test-state" in location

    async def test_post_authorize_wrong_password_shows_error(
        self, client, oauth_client, admin_user
    ):
        response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "WrongPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
        )
        assert response.status_code == 401
        assert b"Ongeldig" in response.content

    async def test_post_authorize_unknown_user_shows_error(
        self, client, oauth_client
    ):
        response = await client.post(
            "/oauth/authorize",
            data={
                "email": "nobody@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
        )
        assert response.status_code == 401
        assert b"Ongeldig" in response.content


class TestOAuthToken:
    async def test_token_exchange_returns_tokens(
        self, client, oauth_client, admin_user
    ):
        """Full code exchange returns access_token and id_token."""
        # First get a code
        auth_response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
            follow_redirects=False,
        )
        assert auth_response.status_code == 302
        location = auth_response.headers["location"]
        code = location.split("code=")[1].split("&")[0]

        # Exchange code for tokens
        token_response = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert token_response.status_code == 200
        data = token_response.json()
        assert "access_token" in data
        assert "id_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 900

    async def test_code_is_one_time_use(self, client, oauth_client, admin_user):
        """Auth code cannot be used twice."""
        auth_response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
            follow_redirects=False,
        )
        location = auth_response.headers["location"]
        code = location.split("code=")[1].split("&")[0]

        # First use succeeds
        r1 = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert r1.status_code == 200

        # Second use fails
        r2 = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert r2.status_code == 400

    async def test_token_wrong_client_secret(self, client, oauth_client, admin_user):
        auth_response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
            follow_redirects=False,
        )
        location = auth_response.headers["location"]
        code = location.split("code=")[1].split("&")[0]

        response = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": "test-client",
                "client_secret": "wrong-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert response.status_code == 401

    async def test_token_unsupported_grant_type(self, client, oauth_client):
        response = await client.post(
            "/oauth/token",
            data={
                "grant_type": "client_credentials",
                "code": "somecode",
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert response.status_code == 400

    async def test_token_invalid_code(self, client, oauth_client):
        response = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": "invalid-code-that-does-not-exist",
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/callback",
            },
        )
        assert response.status_code == 400

    async def test_token_redirect_uri_mismatch(self, client, oauth_client, admin_user):
        auth_response = await client.post(
            "/oauth/authorize",
            data={
                "email": "admin@test.com",
                "password": "TestPassword1!",
                "client_id": "test-client",
                "redirect_uri": "https://example.com/callback",
                "state": "",
                "scope": "openid",
            },
            follow_redirects=False,
        )
        location = auth_response.headers["location"]
        code = location.split("code=")[1].split("&")[0]

        response = await client.post(
            "/oauth/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": "test-client",
                "client_secret": "test-secret",
                "redirect_uri": "https://example.com/different-callback",
            },
        )
        assert response.status_code == 400


class TestOAuthDiscovery:
    async def test_jwks_endpoint(self, client):
        response = await client.get("/oauth/jwks")
        assert response.status_code == 200
        data = response.json()
        assert "keys" in data
        assert len(data["keys"]) >= 1
        assert data["keys"][0]["kty"] == "RSA"

    async def test_jwks_has_required_fields(self, client):
        response = await client.get("/oauth/jwks")
        key = response.json()["keys"][0]
        assert "n" in key
        assert "e" in key
        assert key["alg"] == "RS256"
        assert key["use"] == "sig"

    async def test_openid_configuration(self, client):
        response = await client.get("/.well-known/openid-configuration")
        assert response.status_code == 200
        data = response.json()
        assert "issuer" in data
        assert "authorization_endpoint" in data
        assert "token_endpoint" in data
        assert "jwks_uri" in data

    async def test_openid_configuration_endpoints_use_issuer(self, client):
        response = await client.get("/.well-known/openid-configuration")
        data = response.json()
        issuer = data["issuer"]
        assert data["authorization_endpoint"].startswith(issuer)
        assert data["token_endpoint"].startswith(issuer)
        assert data["jwks_uri"].startswith(issuer)

    async def test_openid_configuration_supported_values(self, client):
        response = await client.get("/.well-known/openid-configuration")
        data = response.json()
        assert "code" in data["response_types_supported"]
        assert "RS256" in data["id_token_signing_alg_values_supported"]
        assert "openid" in data["scopes_supported"]
