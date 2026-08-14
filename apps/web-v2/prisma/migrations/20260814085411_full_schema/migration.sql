-- CreateTable
CREATE TABLE "app_users" (
    "id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "program_start_date" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_profiles" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "athlete_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'reps',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_blocks" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "training_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_templates" (
    "id" TEXT NOT NULL,
    "block_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "workout_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_exercises" (
    "id" TEXT NOT NULL,
    "workout_template_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "group_name" TEXT,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "target_reps" TEXT NOT NULL,
    "target_rpe" DOUBLE PRECISION,
    "target_rest_sec" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "planned_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_sessions" (
    "id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "cycle_index" INTEGER NOT NULL,
    "session_index" INTEGER NOT NULL,
    "cycle_name" TEXT NOT NULL,
    "session_name" TEXT NOT NULL,
    "jour" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "legacy_id" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "planned_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "planned_sets" (
    "id" TEXT NOT NULL,
    "planned_session_id" TEXT NOT NULL,
    "planned_exercise_id" TEXT NOT NULL,
    "set_number" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "planned_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_sessions" (
    "id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "planned_session_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'planned',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "started_at" TEXT NOT NULL,
    "completed_at" TEXT,
    "duration_sec" INTEGER,
    "avg_rpe" DOUBLE PRECISION,
    "feedback" JSONB,
    "legacy_id" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performed_sets" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "exercise_id" TEXT,
    "exercise_name" TEXT NOT NULL,
    "exercise_type" TEXT NOT NULL DEFAULT 'reps',
    "set_number" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps_actual" INTEGER NOT NULL,
    "reps_target" TEXT NOT NULL,
    "rpe" DOUBLE PRECISION,
    "rest_sec_actual" INTEGER,
    "legacy_id" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "performed_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_records" (
    "id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vacations" (
    "id" TEXT NOT NULL,
    "start_date_iso" TEXT NOT NULL,
    "end_date_iso" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "shifted_sessions" INTEGER NOT NULL,
    "legacy_id" INTEGER,
    "created_at" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL,

    CONSTRAINT "vacations_pkey" PRIMARY KEY ("id")
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

-- CreateTable
CREATE TABLE "program_changes" (
    "id" TEXT NOT NULL,
    "date_iso" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "target_exercise_id" TEXT NOT NULL,
    "target_exercise_name" TEXT NOT NULL,
    "override_value" TEXT NOT NULL,
    "created_at" TEXT NOT NULL,

    CONSTRAINT "program_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_key" ON "exercises"("name");

-- CreateIndex
CREATE INDEX "planned_sessions_date_iso_idx" ON "planned_sessions"("date_iso");

-- CreateIndex
CREATE INDEX "planned_sessions_status_idx" ON "planned_sessions"("status");

-- CreateIndex
CREATE INDEX "workout_sessions_date_iso_idx" ON "workout_sessions"("date_iso");

-- CreateIndex
CREATE INDEX "workout_sessions_status_idx" ON "workout_sessions"("status");

-- CreateIndex
CREATE INDEX "performed_sets_session_id_idx" ON "performed_sets"("session_id");

-- CreateIndex
CREATE INDEX "performed_sets_exercise_name_idx" ON "performed_sets"("exercise_name");

-- CreateIndex
CREATE INDEX "check_ins_date_iso_idx" ON "check_ins"("date_iso");

-- CreateIndex
CREATE INDEX "measurements_date_iso_idx" ON "measurements"("date_iso");

-- CreateIndex
CREATE INDEX "personal_records_exercise_id_idx" ON "personal_records"("exercise_id");

-- CreateIndex
CREATE INDEX "coach_conversations_device_id_created_at_idx" ON "coach_conversations"("device_id", "created_at");

-- AddForeignKey
ALTER TABLE "training_blocks" ADD CONSTRAINT "training_blocks_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_block_id_fkey" FOREIGN KEY ("block_id") REFERENCES "training_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_workout_template_id_fkey" FOREIGN KEY ("workout_template_id") REFERENCES "workout_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_sets" ADD CONSTRAINT "planned_sets_planned_session_id_fkey" FOREIGN KEY ("planned_session_id") REFERENCES "planned_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_sets" ADD CONSTRAINT "planned_sets_planned_exercise_id_fkey" FOREIGN KEY ("planned_exercise_id") REFERENCES "planned_exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_planned_session_id_fkey" FOREIGN KEY ("planned_session_id") REFERENCES "planned_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performed_sets" ADD CONSTRAINT "performed_sets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "workout_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performed_sets" ADD CONSTRAINT "performed_sets_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
