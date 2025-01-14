-- CreateTable
CREATE TABLE "leases" (
    "id" SERIAL NOT NULL,
    "resource" TEXT NOT NULL,
    "holder" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "leases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leases_resource_key" ON "leases"("resource");
