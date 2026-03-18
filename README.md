# WebVakwerk Ticket System

Internal agency operations management system for WebVakwerk. Manages the complete workflow from lead intake through project delivery.

## Workflow

```
intake → demo (50%) → approval → payment → feedback rounds → go-live → handover
```

- **Basis package**: 2 feedback rounds included
- **Premium package**: 4 feedback rounds included
- Extra feedback rounds are flagged as billable extra work

## Tech Stack

- **Next.js 15** App Router
- **PostgreSQL 16** + Prisma ORM
- **Redis 7** for rate limiting + session management
- **JWT auth** (15min access token + 7d rotating refresh token)
- **Tailwind CSS** + shadcn/ui
- **Zod** validation
- **Docker Compose** self-hosted
- **TypeScript** strict mode
- **pnpm** workspaces

## Quick Start

### Development

```bash
cp .env.example .env
# Edit .env with your values

pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

### Production (Docker)

```bash
cp .env.example .env
# Edit .env with strong passwords and secrets

docker compose up -d
```

The app runs on port 3000. Use Cloudflare Tunnel for public exposure.

## Environment Variables

See `.env.example` for all required variables.

## API Authentication

Two auth methods:

1. **JWT Cookie** — For browser sessions. Login via `POST /api/v1/auth/login`
2. **API Key** — For n8n and external integrations. Pass as `X-API-Key` header. Manage at `/settings/api-keys`

## Roles & Permissions

| Role | Access |
|------|--------|
| SUPER_ADMIN | Everything |
| ADMIN | Everything except user deletion |
| PROJECT_MANAGER | Projects, tickets, clients, read leads |
| DEVELOPER | Assigned tickets, read projects |
| SALES | Leads, clients, read projects |

## Project Structure

```
apps/web/          - Next.js application
packages/db/       - Prisma schema and migrations
```

## API Endpoints

All endpoints are under `/api/v1/`:

- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `POST /auth/refresh` — Refresh token
- `GET/POST /leads` — Leads management
- `GET/POST /clients` — Client management
- `GET/POST /projects` — Project management
- `GET/POST /tickets` — Ticket management
- `GET /notifications` — User notifications
- `GET /dashboard` — Dashboard metrics
- `GET/POST /api-keys` — API key management
