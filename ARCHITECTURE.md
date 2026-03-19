# System Architecture

Agency OS is a **Next.js 15 + Prisma + PostgreSQL + BullMQ** application for managing client projects, proposals, and communication.

## Technology Stack

### Frontend
- **Framework**: Next.js 15.2.3 with React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **UI Components**: shadcn/ui style components
- **Authentication**: NextAuth.js v5

### Backend
- **Runtime**: Node.js (Next.js server)
- **API**: REST via Next.js API routes + Server Actions
- **Authentication**: NextAuth.js with session management
- **Database**: PostgreSQL with Prisma ORM v6.5.0
- **Job Queue**: BullMQ v5.51.0 with Redis v5.6.1
- **Logging**: Custom logger (src/lib/logger.ts)

### External Integrations
- **GitHub API**: Repository syncing and Git operations
- **N8N**: Webhook-based workflow automation (invoices, proposals, etc.)
- **Email**: (Infrastructure removed - using n8n webhooks instead)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Browser / Client                                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    HTTP/HTTPS Requests
                           │
┌──────────────────────────▼──────────────────────────────────┐
│  Next.js Frontend Server (Port 3000)                        │
│  ├─ React Components                                         │
│  ├─ Next.js App Router                                      │
│  └─ NextAuth.js (Session Management)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
        ▼              ▼                  ▼
    Server      Server Actions      API Routes
    Components  (src/actions/)      (src/app/api/)
        │              │                  │
        └──────────────┼──────────────────┘
                       │
            Database Operations
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Prisma ORM (Type-Safe Client)                              │
├──────────────────────────────────────────────────────────────
│  ├─ User (Authentication)                                   │
│  ├─ BusinessSettings (Company Info)                         │
│  ├─ Client (Client Information)                             │
│  ├─ Project / ProjectWorkspace (Project Data)               │
│  ├─ Document (Documentation)                                │
│  ├─ Communication (Calls, Meetings, Notes)                  │
│  ├─ ChangeRequest (Issue Tracking)                          │
│  ├─ Proposal (Quotes)                                       │
│  └─ Repository (Git Repos)                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  PostgreSQL Database                                        │
│  ├─ Public Tables (users, projects, documents, etc.)        │
│  ├─ Triggers & Functions (Audit, Timestamps)                │
│  └─ Indexes (Performance)                                   │
└─────────────────────────────────────────────────────────────┘

Parallel System: Background Jobs
┌──────────────────────────────────────────────────────────────┐
│  BullMQ Job Queue (Redis)                                   │
│  ├─ agent:generate-briefing (AI briefing generation)        │
│  ├─ github:sync-repo (Repository updates)                   │
│  └─ Other (Future job queues)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│  Worker Process (src/worker/)                               │
│  └─ Job Processors & Handlers                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────────┐
        │              │                  │
        ▼              ▼                  ▼
    Database    External APIs      Logging
    Updates     (GitHub, etc.)     & Monitoring
```

## Data Flow Examples

### Example 1: Create Project
```
1. User submits form (component)
   ↓
2. Next.js Server Action called (src/actions/projects.ts)
   - Validation (Zod schema)
   - Authorization check
   ↓
3. Prisma creates project in database
   ↓
4. Job enqueued: agent:generate-briefing
   ↓
5. Worker picks up job
   - Calls AI API
   - Updates project with briefing
   ↓
6. n8n webhook called (sends to proposal generator)
```

### Example 2: View Project
```
1. User navigates to /projects/[id]
   ↓
2. Page component (Server Component by default)
   ↓
3. Server Action calls Prisma
   - Fetch project data
   - Load related data (client, documents, etc.)
   ↓
4. Permission check (auth.ts)
   ↓
5. Render React components with fetched data
   ↓
6. Client-side interactivity (use client components)
```

## Key Design Patterns

### Server Actions (Preferred for Internal Operations)
- Direct server-side function calls from components
- Type-safe by default
- Better performance than API routes
- Located: `src/actions/`

### API Routes (External Integrations)
- Public HTTP endpoints
- Used for webhooks (n8n, GitHub)
- Health checks, public data
- Located: `src/app/api/`

### Server vs Client Components
- **Server by default**: Components render on server, send HTML to browser
- **Client when needed**: Add `"use client"` only for interactivity
- Prefer server components for data fetching, authorization

### Type Safety
- Prisma types for database
- Zod schemas for validation
- TypeScript strict mode
- No `any` types

## Security Considerations

### Authentication
- NextAuth.js handles user sessions
- Session verified on every request
- Secure cookies (httpOnly, secure flags)

### Authorization
- Permission checks in Server Actions
- User workspace isolation
- Role-based access control where needed

### Data Validation
- Zod schemas on server-side
- Input sanitization
- CSRF protection via NextAuth.js

### Database
- Parameterized queries via Prisma
- No raw SQL
- Audit logging in triggers

## Performance Optimization

### Caching
- Next.js automatic route caching
- Prisma result caching where applicable
- Redis for session storage

### Database
- Connection pooling (PgBouncer-compatible)
- Strategic indexes on frequently queried columns
- Partitioning for large tables (if needed)

### Frontend
- Code splitting automatic
- Dynamic imports for heavy components
- Image optimization with next/image

## Deployment

### Local Development
```bash
npm install
npx prisma migrate dev
npm run dev
```

### Docker
- Separate containers: Next.js, PostgreSQL, Redis
- Worker process in standalone container
- Environment-driven configuration

### Environment Variables
- `.env.local` for local development
- `.env.production` for deployed environment
- See `.env.example` for required variables

## Monitoring & Logging

### Logging Levels
- `debug`: Detailed diagnostic info
- `info`: General operational info
- `warn`: Warning messages
- `error`: Error messages with context

### Logging Locations
- Database: Audit triggers log data changes
- Application: `src/lib/logger.ts` utility
- External: Optional integration with monitoring service

## Future Improvements

- [ ] Add test coverage (unit, integration, e2e)
- [ ] GraphQL layer for complex queries
- [ ] Caching strategy documentation
- [ ] Rate limiting and throttling
- [ ] More comprehensive audit logging
