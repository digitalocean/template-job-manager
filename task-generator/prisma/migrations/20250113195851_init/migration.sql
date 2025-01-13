-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "task_data" JSONB NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "processed_by" TEXT,
    "task_output" TEXT,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
