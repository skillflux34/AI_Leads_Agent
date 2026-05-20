from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" ADD "lead_status" VARCHAR(100);
        ALTER TABLE "leads" ADD "last_activity" TIMESTAMPTZ;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" DROP COLUMN "lead_status";
        ALTER TABLE "leads" DROP COLUMN "last_activity";"""


MODELS_STATE = (
    "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"
    "QBhrpvOffZR/70L2D2ecw="
)
