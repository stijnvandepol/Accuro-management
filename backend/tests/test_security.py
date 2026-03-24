import pytest
from app.core.security import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, create_refresh_token, decode_token,
    sanitize_html, timing_safe_compare, redact_sensitive,
)


class TestPasswordSecurity:
    def test_hash_and_verify(self):
        hashed = hash_password("MyPassword123!")
        assert hashed != "MyPassword123!"
        assert verify_password("MyPassword123!", hashed)
        assert not verify_password("WrongPassword", hashed)

    def test_password_strength_valid(self):
        assert validate_password_strength("StrongPass123!")
        assert validate_password_strength("MyP@ssw0rd1234")

    def test_password_strength_too_short(self):
        assert not validate_password_strength("Short1!")

    def test_password_strength_no_uppercase(self):
        assert not validate_password_strength("nouppercase123!")

    def test_password_strength_no_lowercase(self):
        assert not validate_password_strength("NOLOWERCASE123!")

    def test_password_strength_no_digit(self):
        assert not validate_password_strength("NoDigitsHere!!")

    def test_password_strength_no_special(self):
        assert not validate_password_strength("NoSpecialChar12")


class TestJWT:
    def test_access_token_roundtrip(self):
        token = create_access_token({"sub": "user-123", "role": "ADMIN"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["role"] == "ADMIN"
        assert payload["type"] == "access"

    def test_refresh_token_roundtrip(self):
        token = create_refresh_token({"sub": "user-123"})
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["type"] == "refresh"

    def test_decode_invalid_token(self):
        result = decode_token("invalid.token.here")
        assert result is None


class TestSanitization:
    def test_sanitize_removes_script(self):
        result = sanitize_html('<script>alert("xss")</script><p>Safe</p>')
        assert "<script>" not in result
        assert "<p>Safe</p>" in result

    def test_sanitize_allows_safe_tags(self):
        html = "<p>Hello <strong>world</strong></p>"
        result = sanitize_html(html)
        assert "<p>" in result
        assert "<strong>" in result

    def test_sanitize_removes_onclick(self):
        result = sanitize_html('<a href="http://example.com" onclick="alert(1)">link</a>')
        assert "onclick" not in result
        assert "href" in result


class TestTimingSafeCompare:
    def test_equal_strings(self):
        assert timing_safe_compare("secret", "secret")

    def test_unequal_strings(self):
        assert not timing_safe_compare("secret", "different")


class TestRedactSensitive:
    def test_redacts_password(self):
        data = {"user": "john", "password": "secret123"}
        result = redact_sensitive(data)
        assert result["user"] == "john"
        assert result["password"] == "[REDACTED]"

    def test_redacts_nested(self):
        data = {"config": {"api_key": "abc123", "name": "test"}}
        result = redact_sensitive(data)
        assert result["config"]["api_key"] == "[REDACTED]"
        assert result["config"]["name"] == "test"
