# Source Code Structure

This document describes the organization of the Agency OS source code.

## Directory Layout

```
src/
├── app/                 # Next.js 15 app directory (routes, pages, API)
│   ├── (auth)/         # Authentication routes (login, etc.)
│   ├── (dashboard)/    # Protected dashboard routes
│   │   ├── clients/    # Client management
│   │   ├── emails/     # Email management (deprecated - being phased out)
│   │   ├── finance/    # Financial/invoicing
│   │   ├── projects/   # Project workspace
│   │   └── settings/   # Admin settings
│   └── api/            # REST API routes
│       ├── auth/       # NextAuth.js routes
│       ├── health/     # Health check endpoint
│       └── internal/   # Internal API (invoices, projects, proposals)
│
├── actions/            # Server Actions (data fetching, mutations)
│   ├── ***.ts         # [feature]-based actions (clients, projects, etc.)
│
├── components/         # React components (UI layer)
│   ├── briefing/       # Agent briefing components
│   ├── change-requests/# Change request UI
│   ├── communication/  # Communication log UI
│   ├── layout/         # Header, sidebar, nav
│   ├── projects/       # Project UI components
│   ├── proposals/      # Proposal generation UI
│   ├── providers/      # Context providers (auth, etc.)
│   ├── repositories/   # Git repo UI
│   ├── timeline/       # Project timeline UI
│   └── ui/             # Reusable UI components (buttons, badges, etc.)
│
├── lib/                # Utilities and helpers
│   ├── validations/    # Zod validation schemas
│   ├── api-auth.ts     # API authentication helpers
│   ├── audit.ts        # Audit logging
│   ├── auth.ts         # NextAuth.js configuration
│   ├── db.ts           # Prisma client initialization
│   ├── env.ts          # Environment variable parsing
│   ├── logger.ts       # Logging utility
│   ├── markdown.ts     # Markdown rendering
│   ├── queue.ts        # BullMQ job queue types
│   ├── settings.ts     # Business settings resolver
│   └── utils.ts        # General utilities
│
├── services/           # External integrations
│   ├── githubService.ts      # GitHub API integration
│   └── projectCreationService.ts  # Project intake logic
│
└── worker/             # Background job processor (BullMQ)
    ├── index.ts        # Worker main entry point
    └── jobs/           # Job processors
        └── github-sync.ts      # GitHub repository sync
```

## Layer Architecture

### Presentation Layer (`components/`)
- **Purpose**: UI rendering and user interactions
- **Rules**: No direct database access, no business logic beyond rendering
- **Dependencies**: Should only depend on lib/ and other components/

### Business Logic Layer (`actions/`, `services/`)
- **Purpose**: Data validation, transformation, and business rules
- **Rules**: Server-side only, can access database, external APIs
- **Dependencies**: Can depend on lib/ and prisma

### Data Layer (`lib/db.ts`, `prisma/`)
- **Purpose**: Database access and models
- **Rules**: Raw database operations only
- **Dependencies**: None (except prisma)

### Utility Layer (`lib/`)
- **Purpose**: Shared helpers, validation, configuration
- **Rules**: No business logic, pure functions only
- **Dependencies**: None (except external libraries)

## Naming Conventions

- **Files**: kebab-case (e.g., `auth-form.tsx`, `api-auth.ts`)
- **Functions/Classes**: camelCase (e.g., `getProject()`, `AuthProvider`)
- **Components**: PascalCase (e.g., `ProjectCard.tsx`)
- **Types/Interfaces**: PascalCase (e.g., `ProjectWorkspace`)

## Feature Organization

Each major feature has its own organization:

```
[Feature Name]/
├── Components      → src/components/[feature]/
├── Server Actions  → src/actions/[feature].ts
├── Page Routes     → src/app/(dashboard)/[feature]/
├── Validation      → src/lib/validations/[feature].ts
└── API Routes      → src/app/api/[feature]/
```

Example: **Projects**
- Components: `src/components/projects/`
- Actions: `src/actions/projects.ts`
- Pages: `src/app/(dashboard)/projects/`
- Validation: `src/lib/validations/projects.ts`
- API: `src/app/api/internal/projects/`

## Best Practices

1. **Keep components small** - Max 200-300 lines, split when larger
2. **Use server actions** - Prefer over API routes for internal operations
3. **Validate on server** - Always validate user input serverside
4. **Type everything** - Use TypeScript strictly, avoid `any`
5. **Prisma for database** - Never write raw SQL
6. **Async/await** - Use modern async syntax throughout
7. **Error handling** - Always handle errors with try/catch and logging

## Adding New Features

When adding a new feature:

1. **Define types** in Prisma schema (`prisma/schema.prisma`)
2. **Create validation** in `src/lib/validations/[feature].ts`
3. **Build actions** in `src/actions/[feature].ts`
4. **Create components** in `src/components/[feature]/`
5. **Add pages/routes** in `src/app/(dashboard)/[feature]/`
6. **Write tests** (if applicable)
7. **Document** in this file if major structural addition
