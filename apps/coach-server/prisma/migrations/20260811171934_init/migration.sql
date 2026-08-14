-- CreateTable
CREATE TABLE "sync_events" (
    "event_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB,
    "base_version" INTEGER,
    "client_sequence" INTEGER NOT NULL,
    "server_sequence" SERIAL NOT NULL,
    "created_at_client" TEXT NOT NULL,
    "received_at_server" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "coach_memories" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'candidate',
    "created_at" TEXT NOT NULL,
    "expires_at" TEXT,
    "last_confirmed_at" TEXT,

    CONSTRAINT "coach_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coach_conversations" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sync_events_idempotency_key_key" ON "sync_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "coach_conversations_device_id_created_at_idx" ON "coach_conversations"("device_id", "created_at");
