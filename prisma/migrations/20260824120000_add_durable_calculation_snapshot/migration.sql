CREATE TABLE "DurableCalculationSnapshot" (
    "storageId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DurableCalculationSnapshot_pkey" PRIMARY KEY ("storageId")
);

CREATE UNIQUE INDEX "DurableCalculationSnapshot_snapshotId_key"
ON "DurableCalculationSnapshot"("snapshotId");

CREATE OR REPLACE FUNCTION "reject_durable_calculation_snapshot_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Durable calculation snapshots are append-only';
END;
$$;

CREATE TRIGGER "DurableCalculationSnapshot_no_update"
BEFORE UPDATE ON "DurableCalculationSnapshot"
FOR EACH ROW
EXECUTE FUNCTION "reject_durable_calculation_snapshot_mutation"();

CREATE TRIGGER "DurableCalculationSnapshot_no_delete"
BEFORE DELETE ON "DurableCalculationSnapshot"
FOR EACH ROW
EXECUTE FUNCTION "reject_durable_calculation_snapshot_mutation"();
