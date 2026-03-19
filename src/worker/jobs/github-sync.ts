/**
 * Job: github:sync-repo
 *
 * Future: syncs repository data from GitHub API.
 * Placeholder until GitHub App installation is configured.
 */
import type { GitHubSyncJobData } from "@/lib/queue";
import { logger } from "@/lib/logger";

export async function processGitHubSync(data: GitHubSyncJobData) {
  const { projectId, repositoryId } = data;

  // TODO: implement GitHub App authentication and API sync
  // 1. Get installation token for the repo
  // 2. Fetch open issues and PRs
  // 3. Sync to change requests or internal notes
  // 4. Update project audit log

  logger.info("PLACEHOLDER: Would sync repo", { repositoryId, projectId });

  return { synced: false, placeholder: true };
}
