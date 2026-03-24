# AgencyOS — Ticket & Project Management System

Full-stack project management platform built with **FastAPI** (backend) and **Vue 3** (frontend).
Designed for agencies managing clients, projects, invoices, proposals, and change requests.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 |
| Background Jobs | ARQ |
| PDF Generation | WeasyPrint + Jinja2 |
| Auth | JWT (access + refresh tokens with rotation) |
| Frontend | Vue 3, Vite, TailwindCSS, PrimeVue |
| Container | Docker + docker-compose |

## Quick Start

### 1. Clone and configure

```bash
cp .env.example .env
# Edit .env — at minimum change all CHANGE_ME values:
#   POSTGRES_PASSWORD, REDIS_PASSWORD, JWT_SECRET_KEY,
#   EXTERNAL_API_KEY, SEED_ADMIN_PASSWORD
```

### 2. Generate secrets

```bash
# JWT secret (64+ chars)
python -c "import secrets; print(secrets.token_urlsafe(64))"

# External API key (32+ chars)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Start with Docker

```bash
docker-compose up --build -d
```

Services:
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Docs** (dev only): http://localhost:8000/api/docs
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### 4. Run database migrations

```bash
docker-compose exec backend alembic upgrade head
```

The admin user is seeded automatically on first startup using `SEED_ADMIN_*` env vars.

### 5. Local development (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Start backend
uvicorn app.main:app --reload --port 8000

# Start worker (separate terminal)
python -m app.tasks.worker

# Start frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_DB` | No | Database name (default: ticketsystem) |
| `POSTGRES_USER` | No | Database user (default: ticketsystem) |
| `POSTGRES_PASSWORD` | **Yes** | Database password |
| `DATABASE_URL` | **Yes** | Full async connection string |
| `REDIS_PASSWORD` | **Yes** | Redis password |
| `REDIS_URL` | **Yes** | Redis connection URL |
| `JWT_SECRET_KEY` | **Yes** | JWT signing key (min 32 chars) |
| `JWT_ALGORITHM` | No | JWT algorithm (default: HS256) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Access token TTL (default: 15) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | Refresh token TTL (default: 7) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `RATE_LIMIT_AUTH` | No | Auth rate limit (default: 5/minute) |
| `RATE_LIMIT_EXTERNAL_API` | No | External API rate limit (default: 30/minute) |
| `RATE_LIMIT_GENERAL` | No | General rate limit (default: 200/minute) |
| `EXTERNAL_API_KEY` | No | Bearer token for external API |
| `GITHUB_TOKEN` | No | GitHub Personal Access Token |
| `DISCORD_TICKET_WEBHOOK_URL` | No | Discord webhook for new tickets |
| `SEED_ADMIN_EMAIL` | No | Initial admin email |
| `SEED_ADMIN_PASSWORD` | No | Initial admin password |
| `SEED_ADMIN_NAME` | No | Initial admin name |
| `APP_ENV` | No | development or production |

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | Public | Login, returns access + refresh token |
| POST | `/api/v1/auth/refresh` | Public | Refresh access token |
| POST | `/api/v1/auth/logout` | Bearer | Invalidate refresh token |
| GET | `/api/v1/auth/me` | Bearer | Current user profile |
| PUT | `/api/v1/auth/me/password` | Bearer | Change own password |

### Users (ADMIN only)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/users` | List all users |
| POST | `/api/v1/users` | Create user |
| GET | `/api/v1/users/{id}` | Get user |
| PATCH | `/api/v1/users/{id}` | Update user |
| DELETE | `/api/v1/users/{id}` | Deactivate user |

### Clients (ADMIN, EMPLOYEE, FINANCE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/clients` | List clients with project count |
| POST | `/api/v1/clients` | Create client (ADMIN/EMPLOYEE) |
| GET | `/api/v1/clients/{id}` | Client detail with projects/invoices |
| PATCH | `/api/v1/clients/{id}` | Update client (ADMIN/EMPLOYEE) |
| DELETE | `/api/v1/clients/{id}` | Soft-delete (ADMIN, no active projects) |

### Projects (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects` | List (filters: status, client_id, priority) |
| POST | `/api/v1/projects` | Create project (auto slug) |
| GET | `/api/v1/projects/{id}` | Full project detail |
| GET | `/api/v1/projects/by-slug/{slug}` | Get by slug |
| PATCH | `/api/v1/projects/{id}` | Update project |
| DELETE | `/api/v1/projects/{id}` | Soft-delete (ADMIN) |

### Communication (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{id}/communications` | List entries |
| POST | `/api/v1/projects/{id}/communications` | Add entry |
| DELETE | `/api/v1/communications/{id}` | Delete (own only for EMPLOYEE) |

### Change Requests (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{id}/change-requests` | List CRs |
| POST | `/api/v1/projects/{id}/change-requests` | Create CR |
| GET | `/api/v1/change-requests/{id}` | CR detail |
| PATCH | `/api/v1/change-requests/{id}` | Update CR |
| POST | `/api/v1/change-requests/{id}/reopen` | Reopen CR |
| POST | `/api/v1/change-requests/{id}/close` | Close CR |

### Internal Notes (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{id}/notes` | List notes |
| POST | `/api/v1/projects/{id}/notes` | Add note |
| DELETE | `/api/v1/notes/{id}` | Delete (own only for EMPLOYEE) |

### Invoices (ADMIN, FINANCE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/invoices` | List (filters: client_id, project_id, status) |
| POST | `/api/v1/invoices` | Create (auto invoice number + VAT calc) |
| GET | `/api/v1/invoices/{id}` | Invoice detail |
| PATCH | `/api/v1/invoices/{id}` | Update (recalculates VAT) |
| DELETE | `/api/v1/invoices/{id}` | Delete invoice |
| POST | `/api/v1/invoices/{id}/mark-paid` | Mark as paid |
| GET | `/api/v1/invoices/{id}/pdf` | Download PDF |

### Proposals (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/proposals/by-project/{id}` | List proposals |
| POST | `/api/v1/proposals` | Create proposal |
| GET | `/api/v1/proposals/{id}` | Proposal detail |
| PATCH | `/api/v1/proposals/{id}` | Update proposal |
| DELETE | `/api/v1/proposals/{id}` | Delete proposal |
| GET | `/api/v1/proposals/{id}/pdf` | Download PDF |

### Repositories (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{id}/repositories` | List repos |
| POST | `/api/v1/projects/{id}/repositories` | Add repo |
| DELETE | `/api/v1/repositories/{id}` | Remove repo |

### Project Links (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/projects/{id}/links` | List links |
| POST | `/api/v1/projects/{id}/links` | Add link |
| DELETE | `/api/v1/links/{id}` | Remove link |

### Finance (ADMIN, FINANCE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/finance/overview` | Revenue, open, overdue, VAT by quarter |
| GET | `/api/v1/finance/reports/monthly` | Monthly report (json/csv/pdf) |
| GET | `/api/v1/finance/reports/yearly` | Yearly report (json/csv/pdf) |

### Dashboard (ADMIN, EMPLOYEE)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/stats` | All dashboard statistics |

### Settings (ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/settings` | Get business settings |
| PUT | `/api/v1/settings` | Update business settings |

### Export (ADMIN)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/export/database` | Full JSON export (requires password) |

### External API (Bearer API key)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/external/tickets` | Create ticket from external system |
| GET | `/api/v1/external/tickets/{id}/status` | Check ticket status |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check (DB + Redis) |

## Security

- **JWT** with 15-min access tokens and 7-day refresh tokens with rotation
- **Refresh token reuse detection** — invalidates all tokens on suspected theft
- **RBAC** enforced on every endpoint via FastAPI dependencies
- **Rate limiting** (Redis-backed sliding window): 5/min auth, 30/min external API, 200/min general
- **CORS** strict — configured via `CORS_ORIGINS`, no wildcards
- **Security headers** on every response (CSP, HSTS, X-Frame-Options, etc.)
- **Input sanitization** — HTML content sanitized with nh3
- **Soft-delete** on clients and projects — no data loss
- **Audit logging** — all mutations tracked with actor, IP, user-agent
- **Admin export requires password re-authentication**
- **No secrets in code or logs** — sensitive fields auto-redacted
- **Passwords** — bcrypt with cost 12, minimum 12 chars with complexity requirements

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app factory, lifespan, middleware
│   ├── config.py             # Pydantic Settings from .env
│   ├── database.py           # Async SQLAlchemy engine + session
│   ├── core/
│   │   ├── auth.py           # Redis token storage, rate limiting
│   │   ├── security.py       # JWT, bcrypt, HTML sanitization
│   │   ├── rbac.py           # Roles and permission map
│   │   └── dependencies.py   # FastAPI Depends (auth, RBAC)
│   ├── models/               # SQLAlchemy ORM models (13 models)
│   ├── schemas/              # Pydantic request/response schemas
│   ├── services/             # Business logic (PDF, GitHub, Discord, audit)
│   ├── middleware/            # Security headers, rate limiting, logging
│   ├── routers/              # API endpoints (16 routers)
│   ├── tasks/                # ARQ background jobs
│   └── templates/            # Jinja2 HTML templates for PDF
├── alembic/                  # Database migrations
├── tests/
├── Dockerfile
└── requirements.txt
frontend/
├── Dockerfile
├── nginx.conf
└── src/
docker-compose.yml
.env.example
```
