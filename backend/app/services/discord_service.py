import httpx
import structlog
from app.config import get_settings

logger = structlog.get_logger()


async def send_ticket_notification(
    project_name: str,
    client_name: str,
    description: str,
    project_slug: str,
    change_request_id: str | None = None,
) -> None:
    settings = get_settings()
    webhook_url = settings.DISCORD_TICKET_WEBHOOK_URL
    if not webhook_url:
        return

    embed = {
        "title": f"New Ticket: {project_name}",
        "color": 3447003,
        "fields": [
            {"name": "Client", "value": client_name, "inline": True},
            {"name": "Project", "value": project_name, "inline": True},
            {"name": "Description", "value": description[:200] + ("..." if len(description) > 200 else ""), "inline": False},
        ],
    }
    if change_request_id:
        embed["fields"].append({"name": "Change Request", "value": change_request_id, "inline": True})

    payload = {"embeds": [embed]}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(webhook_url, json=payload)
            response.raise_for_status()
    except Exception as e:
        logger.error("discord_webhook_failed", error=str(e))
