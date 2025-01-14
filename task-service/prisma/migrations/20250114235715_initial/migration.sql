-- CreateTable
CREATE TABLE "tasks" (
    "id" SERIAL NOT NULL,
    "task_data" JSONB NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processor" TEXT,
    "last_heartbeat_at" TIMESTAMP(3),
    "must_heartbeat_before" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "processed_at" TIMESTAMP(3),
    "task_output" JSONB,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
