import httpx
import base64
import structlog
from app.config import get_settings

logger = structlog.get_logger()

GITHUB_API_BASE = "https://api.github.com"


class GitHubApiError(Exception):
    def __init__(self, message: str, status_code: int = 0, rate_limited: bool = False):
        self.message = message
        self.status_code = status_code
        self.rate_limited = rate_limited
        super().__init__(message)


def _get_headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.GITHUB_TOKEN:
        raise GitHubApiError("GitHub token not configured", status_code=503)
    return {
        "Authorization": f"Bearer {settings.GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def parse_owner_repo(input_str: str) -> tuple[str, str]:
    input_str = input_str.strip().rstrip("/")
    if "github.com" in input_str:
        parts = input_str.split("github.com/")[-1].split("/")
        if len(parts) >= 2:
            return parts[0], parts[1]
    parts = input_str.split("/")
    if len(parts) == 2:
        return parts[0], parts[1]
    raise GitHubApiError(f"Cannot parse owner/repo from: {input_str}")


async def list_repository_files(
    owner: str, repo: str, branch: str = "main", base_path: str = ""
) -> list[dict]:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=_get_headers())
        if response.status_code == 429:
            raise GitHubApiError("Rate limited", status_code=429, rate_limited=True)
        response.raise_for_status()
        data = response.json()
        tree = data.get("tree", [])
        if base_path:
            tree = [f for f in tree if f["path"].startswith(base_path)]
        return [{"path": f["path"], "type": f["type"], "size": f.get("size", 0)} for f in tree]


async def get_repository_file(
    owner: str, repo: str, branch: str, path: str
) -> str:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}?ref={branch}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=_get_headers())
        if response.status_code == 404:
            raise GitHubApiError(f"File not found: {path}", status_code=404)
        if response.status_code == 429:
            raise GitHubApiError("Rate limited", status_code=429, rate_limited=True)
        response.raise_for_status()
        data = response.json()
        content = data.get("content", "")
        return base64.b64decode(content).decode("utf-8")


async def get_file_last_commit_date(
    owner: str, repo: str, branch: str, path: str
) -> str | None:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits?sha={branch}&path={path}&per_page=1"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=_get_headers())
        response.raise_for_status()
        commits = response.json()
        if commits:
            return commits[0]["commit"]["committer"]["date"]
        return None


async def upsert_repository_file(
    owner: str, repo: str, branch: str, path: str, content: str, message: str
) -> dict:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    headers = _get_headers()

    sha = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        check = await client.get(f"{url}?ref={branch}", headers=headers)
        if check.status_code == 200:
            sha = check.json().get("sha")

        payload = {
            "message": message,
            "content": base64.b64encode(content.encode("utf-8")).decode("ascii"),
            "branch": branch,
        }
        if sha:
            payload["sha"] = sha

        response = await client.put(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()


async def delete_repository_file(
    owner: str, repo: str, branch: str, path: str, message: str
) -> dict:
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}/contents/{path}"
    headers = _get_headers()

    async with httpx.AsyncClient(timeout=30.0) as client:
        check = await client.get(f"{url}?ref={branch}", headers=headers)
        if check.status_code == 404:
            raise GitHubApiError(f"File not found: {path}", status_code=404)
        check.raise_for_status()
        sha = check.json()["sha"]

        payload = {"message": message, "sha": sha, "branch": branch}
        response = await client.delete(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
