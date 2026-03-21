/**
 * GitHub API service layer.
 * All GitHub API calls go through this module.
 */

export interface GitHubRepositoryFile {
  path: string;
  sha: string;
  content: string;
}

export class GitHubApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public rateLimited: boolean = false,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubApiError(500, "GITHUB_TOKEN is not configured");
  }
  return token;
}

/**
 * Parses "owner/repo" from a repoName or a full GitHub URL.
 */
export function parseOwnerRepo(input: string): { owner: string; repo: string } {
  // Handle full URL: https://github.com/owner/repo
  const urlMatch = input.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }
  // Handle "owner/repo" format
  const parts = input.split("/");
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  throw new GitHubApiError(400, `Cannot parse owner/repo from: ${input}`);
}

async function githubRest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getToken();
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  });

  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    throw new GitHubApiError(429, "GitHub API rate limit exceeded", true);
  }
  if (res.status === 401) {
    throw new GitHubApiError(401, "GitHub token is invalid or expired");
  }
  if (res.status === 404) {
    throw new GitHubApiError(404, "Repository not found or not accessible");
  }

  return res;
}

function encodeGithubPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export async function listRepositoryFiles(
  owner: string,
  repo: string,
  branch: string,
  basePath = "",
): Promise<Array<{ path: string; sha: string }>> {
  const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, "");
  const ref = encodeURIComponent(branch);
  const res = await githubRest(`/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`);

  if (!res.ok) {
    throw new GitHubApiError(res.status, `Failed to list repository files: ${res.statusText}`);
  }

  const tree = await res.json() as {
    tree?: Array<{ path: string; type: string; sha: string }>;
  };

  return (tree.tree ?? []).filter((entry) => {
    if (entry.type !== "blob") {
      return false;
    }

    if (!normalizedBasePath) {
      return true;
    }

    return entry.path === normalizedBasePath || entry.path.startsWith(`${normalizedBasePath}/`);
  }).map((entry) => ({
    path: entry.path,
    sha: entry.sha,
  }));
}

export async function getRepositoryFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<GitHubRepositoryFile | null> {
  const encodedPath = encodeGithubPath(path);
  const ref = encodeURIComponent(branch);

  try {
    const res = await githubRest(`/repos/${owner}/${repo}/contents/${encodedPath}?ref=${ref}`);
    if (!res.ok) {
      throw new GitHubApiError(res.status, `Failed to fetch repository file: ${res.statusText}`);
    }

    const file = await res.json() as {
      path: string;
      sha: string;
      content?: string;
      encoding?: string;
    };

    const decodedContent =
      file.encoding === "base64" && file.content
        ? Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8")
        : "";

    return {
      path: file.path,
      sha: file.sha,
      content: decodedContent,
    };
  } catch (error) {
    if (error instanceof GitHubApiError && error.statusCode === 404) {
      return null;
    }

    throw error;
  }
}

export async function getRepositoryFileLastCommitDate(
  owner: string,
  repo: string,
  branch: string,
  path: string,
): Promise<string | null> {
  const encodedPath = encodeGithubPath(path);
  const ref = encodeURIComponent(branch);
  const res = await githubRest(
    `/repos/${owner}/${repo}/commits?path=${encodedPath}&sha=${ref}&per_page=1`,
  );

  if (!res.ok) {
    throw new GitHubApiError(
      res.status,
      `Failed to fetch repository file history: ${res.statusText}`,
    );
  }

  const commits = await res.json() as Array<{
    commit?: { author?: { date?: string | null } | null } | null;
  }>;

  return commits[0]?.commit?.author?.date ?? null;
}

export async function upsertRepositoryFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string,
) {
  const existing = await getRepositoryFile(owner, repo, branch, path);
  const encodedPath = encodeGithubPath(path);

  const res = await githubRest(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(existing ? { sha: existing.sha } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubApiError(res.status, `Failed to upsert repository file: ${body}`);
  }

  const result = await res.json() as {
    content?: { path: string; sha: string };
  };

  return {
    path: result.content?.path ?? path,
    sha: result.content?.sha ?? existing?.sha ?? "",
    created: !existing,
  };
}

export async function deleteRepositoryFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  message: string,
) {
  const existing = await getRepositoryFile(owner, repo, branch, path);
  if (!existing) {
    return;
  }

  const encodedPath = encodeGithubPath(path);
  const res = await githubRest(`/repos/${owner}/${repo}/contents/${encodedPath}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      branch,
      sha: existing.sha,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubApiError(res.status, `Failed to delete repository file: ${body}`);
  }
}
