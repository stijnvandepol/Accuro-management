CREATE TABLE "project_links" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_links_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_links_projectId_idx" ON "project_links"("projectId");

ALTER TABLE "project_links"
ADD CONSTRAINT "project_links_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "project_workspaces"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
