-- AlterTable
ALTER TABLE "users" ADD COLUMN     "rate_limit_per_minute" INTEGER DEFAULT 60 NOT NULL,
ADD COLUMN     "rate_limit_per_hour" INTEGER DEFAULT 1000 NOT NULL,
ADD COLUMN     "rate_limit_per_day" INTEGER DEFAULT 10000 NOT NULL,
ADD COLUMN     "monthly_token_limit" INTEGER,
ADD COLUMN     "current_token_usage" INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN     "token_usage_reset_date" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- CreateTable
CREATE TABLE "user_quota_usage" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "window_type" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "request_count" INTEGER DEFAULT 0 NOT NULL,
    "token_count" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_quota_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_quota_usage_user_id_window_type_window_start_key" ON "user_quota_usage"("user_id", "window_type", "window_start");

-- CreateIndex
CREATE INDEX "user_quota_usage_user_id_window_type_window_start_idx" ON "user_quota_usage"("user_id", "window_type", "window_start");

-- AddForeignKey
ALTER TABLE "user_quota_usage" ADD CONSTRAINT "user_quota_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
