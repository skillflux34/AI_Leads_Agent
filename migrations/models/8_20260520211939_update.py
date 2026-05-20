from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" ADD "email" VARCHAR(255);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" DROP COLUMN "email";"""


MODELS_STATE = (
    "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"
)
