-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "TimelineEntryType" AS ENUM (
  'NOTE',
  'SYSTEM_EVENT',
  'STATUS_CHANGE',
  'ASSIGNMENT',
  'REFERENCE_ADDED',
  'WIKI_LINKED'
);

CREATE TYPE "CommDirection" AS ENUM (
  'INCOMING',
  'OUTGOING'
);

CREATE TYPE "CommChannel" AS ENUM (
  'EMAIL',
  'MEETING',
  'CALL',
  'MESSAGE',
  'OTHER'
);

CREATE TYPE "ReferenceType" AS ENUM (
  'GITHUB',
  'FIGMA',
  'DOCS',
  'DEPLOYMENT',
  'MONITORING',
  'DRIVE',
  'NOTION',
  'OTHER'
);

-- ─── Timeline ────────────────────────────────────────────────────────────────

CREATE TABLE "TicketTimelineEntry" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "ticketId"    TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "type"        "TimelineEntryType" NOT NULL,
  "authorId"    TEXT REFERENCES "User"("id"),
  "content"     TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3)
);

CREATE INDEX "TicketTimelineEntry_ticketId_createdAt_idx" ON "TicketTimelineEntry"("ticketId", "createdAt");
CREATE INDEX "TicketTimelineEntry_ticketId_type_idx" ON "TicketTimelineEntry"("ticketId", "type");

-- ─── Communications ───────────────────────────────────────────────────────────

CREATE TABLE "CommunicationEntry" (
  "id"                TEXT NOT NULL PRIMARY KEY,
  "ticketId"          TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "direction"         "CommDirection" NOT NULL,
  "channel"           "CommChannel" NOT NULL,
  "subject"           TEXT,
  "body"              TEXT NOT NULL,
  "externalSender"    TEXT,
  "authorId"          TEXT REFERENCES "User"("id"),
  "externalMessageId" TEXT UNIQUE,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "CommunicationEntry_ticketId_createdAt_idx" ON "CommunicationEntry"("ticketId", "createdAt");
CREATE INDEX "CommunicationEntry_externalMessageId_idx" ON "CommunicationEntry"("externalMessageId");

CREATE TABLE "CommAttachment" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "communicationId" TEXT NOT NULL REFERENCES "CommunicationEntry"("id") ON DELETE CASCADE,
  "filename"        TEXT NOT NULL,
  "storagePath"     TEXT NOT NULL,
  "mimeType"        TEXT NOT NULL,
  "sizeBytes"       INTEGER NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── References ───────────────────────────────────────────────────────────────

CREATE TABLE "TicketReference" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "ticketId"    TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "title"       TEXT NOT NULL,
  "url"         TEXT NOT NULL,
  "type"        "ReferenceType" NOT NULL DEFAULT 'OTHER',
  "description" TEXT,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL
);

CREATE INDEX "TicketReference_ticketId_idx" ON "TicketReference"("ticketId");

-- ─── Wiki ─────────────────────────────────────────────────────────────────────

CREATE TABLE "WikiPage" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "slug"        TEXT NOT NULL UNIQUE,
  "content"     TEXT NOT NULL,
  "category"    TEXT,
  "version"     INTEGER NOT NULL DEFAULT 1,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3)
);

CREATE INDEX "WikiPage_slug_idx" ON "WikiPage"("slug");
CREATE INDEX "WikiPage_category_idx" ON "WikiPage"("category");

CREATE TABLE "WikiPageVersion" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "pageId"     TEXT NOT NULL REFERENCES "WikiPage"("id") ON DELETE CASCADE,
  "content"    TEXT NOT NULL,
  "version"    INTEGER NOT NULL,
  "editedById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "WikiPageVersion_pageId_version_idx" ON "WikiPageVersion"("pageId", "version");

CREATE TABLE "TicketWikiLink" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "ticketId"    TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE,
  "wikiPageId"  TEXT NOT NULL REFERENCES "WikiPage"("id") ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"("id"),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketWikiLink_ticketId_wikiPageId_key" UNIQUE ("ticketId", "wikiPageId")
);

CREATE INDEX "TicketWikiLink_ticketId_idx" ON "TicketWikiLink"("ticketId");
CREATE INDEX "TicketWikiLink_wikiPageId_idx" ON "TicketWikiLink"("wikiPageId");
