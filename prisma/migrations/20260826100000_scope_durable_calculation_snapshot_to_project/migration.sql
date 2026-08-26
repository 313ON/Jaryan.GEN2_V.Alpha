ALTER TABLE "DurableCalculationSnapshot"
ADD COLUMN "projectId" TEXT;

UPDATE "DurableCalculationSnapshot"
SET "projectId" = COALESCE(
    NULLIF("payload"->'projectContext'->>'projectId', ''),
    NULL
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "DurableCalculationSnapshot"
        WHERE "projectId" IS NULL
    ) THEN
        RAISE EXCEPTION
            'Cannot scope durable calculation snapshots: existing rows lack projectContext.projectId';
    END IF;
END;
$$;

ALTER TABLE "DurableCalculationSnapshot"
ALTER COLUMN "projectId" SET NOT NULL;

ALTER TABLE "DurableCalculationSnapshot"
ADD CONSTRAINT "DurableCalculationSnapshot_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "DurableCalculationSnapshot_projectId_snapshotId_idx"
ON "DurableCalculationSnapshot"("projectId", "snapshotId");

CREATE INDEX "DurableCalculationSnapshot_projectId_createdAt_idx"
ON "DurableCalculationSnapshot"("projectId", "createdAt");
