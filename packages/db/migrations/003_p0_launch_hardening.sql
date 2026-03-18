-- P0 launch hardening migration
-- Apply in staging first. This migration is intended as an additive, production-safe step.

CREATE TYPE "TicketSource" AS ENUM ('MANUAL', 'API', 'AUTOMATION', 'COMMUNICATION', 'GITHUB', 'OTHER');
CREATE TYPE "TicketApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
CREATE TYPE "TicketPaymentStatus" AS ENUM ('NOT_APPLICABLE', 'UNPAID', 'INVOICE_SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'REFUNDED');

ALTER TYPE "TimelineEntryType" ADD VALUE IF NOT EXISTS 'REFERENCE_REMOVED';
ALTER TYPE "TimelineEntryType" ADD VALUE IF NOT EXISTS 'WIKI_UNLINKED';
ALTER TYPE "TimelineEntryType" ADD VALUE IF NOT EXISTS 'COMMUNICATION_LINKED';

ALTER TABLE "Ticket"
  ADD COLUMN "ticketNumber" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "source" "TicketSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "clientId" TEXT,
  ADD COLUMN "clientContactId" TEXT,
  ADD COLUMN "approvalStatus" "TicketApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "paymentStatus" "TicketPaymentStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedById" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "CommunicationEntry"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "isImmutable" BOOLEAN NOT NULL DEFAULT false;

WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS row_no
  FROM "Ticket"
)
UPDATE "Ticket" t
SET "ticketNumber" = 'TCK-LEGACY-' || LPAD(numbered.row_no::text, 6, '0')
FROM numbered
WHERE t."id" = numbered."id"
  AND t."ticketNumber" IS NULL;

ALTER TABLE "Ticket"
  ALTER COLUMN "ticketNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_assignedToId_idx" ON "Ticket"("assignedToId");
CREATE INDEX "Ticket_clientId_idx" ON "Ticket"("clientId");
CREATE INDEX "Ticket_projectId_idx" ON "Ticket"("projectId");
CREATE INDEX "Ticket_priority_idx" ON "Ticket"("priority");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
CREATE INDEX "Ticket_dueDate_idx" ON "Ticket"("dueDate");
CREATE INDEX "Ticket_deletedAt_idx" ON "Ticket"("deletedAt");
CREATE INDEX "Ticket_archivedAt_idx" ON "Ticket"("archivedAt");
CREATE INDEX "Ticket_deletedAt_status_createdAt_idx" ON "Ticket"("deletedAt", "status", "createdAt");
CREATE INDEX "Ticket_assignedToId_status_dueDate_idx" ON "Ticket"("assignedToId", "status", "dueDate");

ALTER TABLE "Ticket"
  ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Ticket_clientContactId_fkey" FOREIGN KEY ("clientContactId") REFERENCES "ClientContact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Ticket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "Ticket_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "CommunicationEntry_externalMessageId_idx";
CREATE UNIQUE INDEX "CommunicationEntry_externalMessageId_key"
  ON "CommunicationEntry"("externalMessageId")
  WHERE "externalMessageId" IS NOT NULL;

CREATE UNIQUE INDEX "AgentRun_active_code_run_unique"
  ON "AgentRun"("ticketId", "repositoryLinkId", "runType")
  WHERE "runType" = 'RUN_CODE_AGENT'
    AND "status" IN ('PENDING', 'QUEUED', 'RUNNING');
