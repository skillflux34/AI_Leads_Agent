from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "users" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "role" VARCHAR(20) NOT NULL DEFAULT 'user',
    "hubspot_access_token" TEXT,
    "hubspot_refresh_token" TEXT,
    "hubspot_token_expires_at" TIMESTAMPTZ,
    "hubspot_portal_id" VARCHAR(100),
    "hubspot_connected" BOOL NOT NULL DEFAULT False,
    "is_active" BOOL NOT NULL DEFAULT True,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
        ALTER TABLE "assistants" ADD "user_id" INT;
        ALTER TABLE "leads" ADD "user_id" INT;
        ALTER TABLE "assistants" ADD CONSTRAINT "fk_assistan_users_2878794a" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
        ALTER TABLE "leads" ADD CONSTRAINT "fk_leads_users_fb455408" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "assistants" DROP CONSTRAINT IF EXISTS "fk_assistan_users_2878794a";
        ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "fk_leads_users_fb455408";
        ALTER TABLE "leads" DROP COLUMN "user_id";
        ALTER TABLE "assistants" DROP COLUMN "user_id";
        DROP TABLE IF EXISTS "users";"""


MODELS_STATE = (
    "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"
)
