from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "leads" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL UNIQUE,
    "company" VARCHAR(255),
    "status" VARCHAR(50) NOT NULL DEFAULT 'new',
    "score" INT NOT NULL DEFAULT 0,
    "hubspot_id" VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS "call_records" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "vapi_call_id" VARCHAR(255) UNIQUE,
    "transcript" TEXT,
    "sentiment" VARCHAR(50),
    "intent" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lead_id" INT NOT NULL REFERENCES "leads" ("id") ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """


MODELS_STATE = (
    "eJztmV1P2zAUhv9KlSsmMVQyCmh3oZTRAe1Usg2BUOQmbhrh2CF2KBXqf5/tfKdJ10yFNV"
    "Kv2p6P5Jwnx/Gb9E1xiQURPegChEbQJL6lfG29KRi4kH8p8e63FOB5qU8YGBgjGW7yOMOX"
    "gdIBxpT5wGTcNwGIQm6yIDV9x2MOwdyKA4SEkZg80MF2agqw8xxAgxEbsin0uePhkZsdbM"
    "FXSOOf3pMxcSDKF+3IKqXdYHNP2vqYXchAcbaxYRIUuDgN9uZsSnAS7WAmrDbE0AcMisMz"
    "PxDli+qibuOOwkrTkLDETI4FJyBALNPumgxMggU/Xg2VDdriLJ/Vw6OTo9Mvx0enPERWkl"
    "hOFmF7ae9hoiQw0JWF9AMGwgiJMeX2AjzHkJewjGB3CvxyhMW8AkzeQhFmjC5DM2L1cTBd"
    "8GogiG02FQQ7nRXofmmj7qU22uNRn0QrhM90OPCDyKWGPsE35cnPhsPalmnq8LViIPNZG2"
    "EZh6Qw09W4GZor4Om9O13U7FL6jLLM9m60O4nTnUee6+HgWxyeYdy9Hp4V0FKImeNCXEK2"
    "ek5zSQ0Bmx/TTnuNKe20K4dUuPIg+XlqUkwzdgijvgELaK1BTDL+CeHSxtN8hqYPRb8GKB"
    "nFc+4R67acZT6zwNOKUg/iL1tKl/dgDTGaR+tj1d20f9O71bWbH7lb6rmm94RHzd1OY+ve"
    "ceFKJAdp/e7rly3xs3U/HPQkQUKZ7cszpnH6vSJqAgEjBiYzA1iZHTm2xmByFxbxzkrlRK"
    "Ugy2T8XZVtyfXbgDATanbyVKrLBJFlgBfEh46Nr+BccuzzigA2YQm3SMRfR4fZPn6LeAZi"
    "azpcPpglCj87Grw93hRk4Z1Wu+1q5z1FQhwD82kGfMvI0RQeopKCJYlddrmqW7QADGzZv+"
    "hC1JwFW/LUFAOvfl4SDe0elBr3oCQ/a+z3cXwzd/t3eTbyOIhaDJOEzUD84MfLdQSTWi2Y"
    "1GXBRFwP4HkdgpmURir3d5nDZoh3BcOZsr3qnZpci9TYSpL4jxN47f+9m6S0psGYeoTVfM"
    "mWz2rkAj5srzN5PKpy9KSvRCtX677MHRMgVLLQz6K0i6sRREA2WKmg86/Bt2/frtLRi/dU"
    "vxr0HXOqlOjfyLNSAYM0ZieBGySBX6BPo7Wy9t8EacpOCCcgxdKoATEKbybAjW0AeSVc8Q"
    "r7++1wUKWEq95h/8S8wQfLMdl+CzmUPW4n1hUURder/24p/rOyn3/pJw5wVm+T3fz2svgD"
    "2S3GBA=="
)
