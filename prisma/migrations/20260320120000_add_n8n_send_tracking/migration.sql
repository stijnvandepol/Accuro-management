-- Add n8n send tracking to invoices
ALTER TABLE "invoices" ADD COLUMN "sentToN8nCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "lastSentToN8nAt" TIMESTAMP(3);

-- Add n8n send tracking to proposal_drafts
ALTER TABLE "proposal_drafts" ADD COLUMN "sentToN8nCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "proposal_drafts" ADD COLUMN "lastSentToN8nAt" TIMESTAMP(3);

-- Remove SENT_TO_N8N from ProposalDraftStatus enum (handled by status update below)
-- Update existing SENT_TO_N8N status proposals to READY with count=1
UPDATE "proposal_drafts" 
SET "status" = 'READY', "sentToN8nCount" = 1, "lastSentToN8nAt" = "updatedAt"
WHERE "status" = 'SENT_TO_N8N';
