DROP TABLE IF EXISTS "doc_entries";
DROP TABLE IF EXISTS "doc_folders";

ALTER TABLE "business_settings"
DROP COLUMN IF EXISTS "docsRepoName",
DROP COLUMN IF EXISTS "docsRepoBranch",
DROP COLUMN IF EXISTS "docsBasePath";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocScope') THEN
    DROP TYPE "DocScope";
  END IF;
END $$;
