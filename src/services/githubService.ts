/**
 * GitHub API service layer.
 * All GitHub API calls go through this module.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  visibility: string;
  description: string | null;
  openIssuesCount: number;
  latestCommit: {
    sha: string;
    message: string;
    author: string;
    date: string;
  } | null;
  openPrCount: number;
}

export interface GitHubIssueResult {
  number: number;
  url: string;
  title: string;
}

export interface CopilotAgentCheck {
  available: boolean;
  login: string | null;
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

async function githubGraphQL<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = getToken();
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 401) {
    throw new GitHubApiError(401, "GitHub token is invalid or expired");
  }
  if (res.status === 403) {
    throw new GitHubApiError(429, "GitHub API rate limit exceeded", true);
  }
  if (!res.ok) {
    throw new GitHubApiError(res.status, `GitHub GraphQL error: ${res.statusText}`);
  }

  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new GitHubApiError(422, json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new GitHubApiError(500, "Empty response from GitHub GraphQL");
  }
  return json.data;
}

// ─── Repository info ──────────────────────────────────────────────────────────

export async function getRepositoryInfo(
  owner: string,
  repo: string,
): Promise<GitHubRepoInfo> {
  // Fetch repo metadata and latest commit in parallel
  const [repoRes, commitsRes, prsRes] = await Promise.all([
    githubRest(`/repos/${owner}/${repo}`),
    githubRest(`/repos/${owner}/${repo}/commits?per_page=1`),
    githubRest(`/repos/${owner}/${repo}/pulls?state=open&per_page=1`),
  ]);

  if (!repoRes.ok) {
    throw new GitHubApiError(repoRes.status, "Failed to fetch repository info");
  }

  const repoData = await repoRes.json() as Record<string, unknown>;

  let latestCommit: GitHubRepoInfo["latestCommit"] = null;
  if (commitsRes.ok) {
    const commits = await commitsRes.json() as Array<Record<string, unknown>>;
    if (commits.length > 0) {
      const c = commits[0];
      const commit = c.commit as Record<string, unknown>;
      const author = commit.author as Record<string, unknown>;
      latestCommit = {
        sha: (c.sha as string).slice(0, 7),
        message: (commit.message as string).split("\n")[0],
        author: author.name as string,
        date: author.date as string,
      };
    }
  }

  // PR count comes from the Link header (total_count not in body for list endpoints)
  let openPrCount = 0;
  if (prsRes.ok) {
    const prs = await prsRes.json() as unknown[];
    // If there's 1 result and a Link header with "last" page, parse count.
    // Otherwise just count what we got (for simplicity, use a separate call).
    openPrCount = prs.length;
    const linkHeader = prsRes.headers.get("link");
    if (linkHeader) {
      const lastMatch = linkHeader.match(/page=(\d+)>;\s*rel="last"/);
      if (lastMatch) openPrCount = parseInt(lastMatch[1], 10);
    }
  }

  return {
    name: repoData.name as string,
    fullName: repoData.full_name as string,
    owner,
    defaultBranch: repoData.default_branch as string,
    visibility: repoData.visibility as string,
    description: (repoData.description as string) ?? null,
    openIssuesCount: repoData.open_issues_count as number,
    latestCommit,
    openPrCount,
  };
}

// ─── Copilot agent availability ───────────────────────────────────────────────

export async function checkCopilotAgent(
  owner: string,
  repo: string,
): Promise<CopilotAgentCheck> {
  const query = `
    query ($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100) {
          nodes {
            ... on User { login }
            ... on Bot { login }
          }
        }
      }
    }
  `;

  try {
    const data = await githubGraphQL<{
      repository: {
        suggestedActors: {
          nodes: Array<{ login?: string }>;
        };
      };
    }>(query, { owner, repo });

    const actors = data.repository.suggestedActors.nodes;
    const copilotAgent = actors.find((a) => a.login === "copilot-swe-agent");

    return {
      available: !!copilotAgent,
      login: copilotAgent?.login ?? null,
    };
  } catch (error) {
    // If the query fails (e.g. insufficient permissions), return unavailable
    if (error instanceof GitHubApiError) throw error;
    return { available: false, login: null };
  }
}

// ─── Create issue ─────────────────────────────────────────────────────────────

export async function createIssue(
  owner: string,
  repo: string,
  options: {
    title: string;
    body: string;
    labels?: string[];
    assignees?: string[];
  },
): Promise<GitHubIssueResult> {
  const res = await githubRest(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: options.title,
      body: options.body,
      labels: options.labels ?? [],
      assignees: options.assignees ?? [],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new GitHubApiError(res.status, `Failed to create issue: ${body}`);
  }

  const issue = await res.json() as { number: number; html_url: string; title: string };
  return {
    number: issue.number,
    url: issue.html_url,
    title: issue.title,
  };
}
