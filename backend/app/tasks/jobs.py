import structlog
from sqlalchemy import select
from app.database import async_session
from app.models.agent_run import AgentRun, AgentRunStatus

logger = structlog.get_logger()


async def github_sync_job(ctx, project_id: str, repository_id: str, actor_user_id: str):
    """Sync a GitHub repository for a project."""
    logger.info("github_sync_started", project_id=project_id, repository_id=repository_id)

    async with async_session() as db:
        from app.models.repository import ProjectRepository
        result = await db.execute(
            select(ProjectRepository).where(ProjectRepository.id == repository_id)
        )
        repo = result.scalar_one_or_none()
        if not repo:
            logger.error("github_sync_repo_not_found", repository_id=repository_id)
            return

        from app.services.github_service import list_repository_files, parse_owner_repo, GitHubApiError
        try:
            owner, repo_name = parse_owner_repo(repo.repo_url)
            files = await list_repository_files(owner, repo_name, repo.default_branch)
            logger.info("github_sync_completed", project_id=project_id, file_count=len(files))
        except GitHubApiError as e:
            logger.error("github_sync_failed", error=e.message, status_code=e.status_code)
        except Exception as e:
            logger.error("github_sync_failed", error=str(e))


async def agent_briefing_job(ctx, project_id: str, change_request_id: str | None, actor_user_id: str):
    """Generate an agent briefing for a project."""
    logger.info("agent_briefing_started", project_id=project_id)

    async with async_session() as db:
        from app.models.project import ProjectWorkspace
        from app.models.change_request import ChangeRequest

        result = await db.execute(
            select(ProjectWorkspace).where(ProjectWorkspace.id == project_id)
        )
        project = result.scalar_one_or_none()
        if not project:
            logger.error("agent_briefing_project_not_found", project_id=project_id)
            return

        briefing_parts = [
            f"# Project Briefing: {project.name}",
            f"\n## Status: {project.status}",
            f"## Priority: {project.priority}",
        ]
        if project.description:
            briefing_parts.append(f"\n## Description\n{project.description}")
        if project.scope:
            briefing_parts.append(f"\n## Scope\n{project.scope}")
        if project.tech_stack:
            briefing_parts.append(f"\n## Tech Stack\n{project.tech_stack}")

        if change_request_id:
            cr_result = await db.execute(
                select(ChangeRequest).where(ChangeRequest.id == change_request_id)
            )
            cr = cr_result.scalar_one_or_none()
            if cr:
                briefing_parts.append(f"\n## Change Request: {cr.title}")
                briefing_parts.append(f"Impact: {cr.impact}")
                briefing_parts.append(f"Description: {cr.description}")

        briefing = "\n".join(briefing_parts)

        agent_run = AgentRun(
            project_id=project_id,
            change_request_id=change_request_id,
            initiated_by_user_id=actor_user_id,
            provider="internal",
            status=AgentRunStatus.COMPLETED.value,
            prompt_snapshot=f"Generate briefing for project {project.name}",
            output_summary=briefing,
        )
        db.add(agent_run)
        await db.commit()

        logger.info("agent_briefing_completed", project_id=project_id, agent_run_id=agent_run.id)
