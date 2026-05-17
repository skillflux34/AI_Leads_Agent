from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "assistants" ALTER COLUMN "voice_id" SET DEFAULT 'Layla';"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "assistants" ALTER COLUMN "voice_id" SET DEFAULT 'jennifer';"""


MODELS_STATE = (
    "eJztml1P2zAUhv9KlSsmsYl1lKHdhVIGG7QTdB8aQpGbuKmFYwfbAaqp/322890kXYNaaF"
    "iv2h6fE/s8cez3xP1jeNSBmL8zOUdcACKMT60/BgEelF+KjbstA/h+2qQMAoyw9gaxmzaD"
    "ERcM2OqCY4A5lCYHcpshXyBKpJUEGCsjtaUjIm5qCgi6C6AlqAvFBDLZcH0jzYg48BHy+K"
    "d/a40RxE5uxMhRfWu7Jaa+tp0RcaIdVW8jy6Y48Ejq7E/FhJLEG4VpupBABgRUlxcsUMNX"
    "o4tyjTMKR5q6hEPMxDhwDAIsMukuycCmRPFDiqZK0FW9vG2/3/+4f/jhYP9QuuiRJJaPsz"
    "C9NPcwUBPoD42ZbgcChB4aY8pNfxbIdSeAlaOL/efgySHPw4tRLaIXG1J86ZRZET8PPFoY"
    "EldM5M/3e3sLaP0wL7un5uWO9HqjsqFyGoczvB81tcM2hTRFeA98ZCXPgFU2E6t5lgavBu"
    "7ap2YObbvTWQKt9KpEq9vyaPmUC+hZPqOeL4pYh/Cx4gkvBDZlvi5gOOz9GqpBe5zf4Sy6"
    "nQvzl6bqTaOW80H/c+yeQd09HxzNER4jxoXlQc6BW7IQVBMuBG4JlxO+p8iGdVeFTMzzcT"
    "XOwRQDY6MXWy0/1HN9jxzI6jAtRj4jWepDAtDK0HaWIdupBtup4FpXDeSjnpGn64u3+xuM"
    "02ZQpWyBkl3rWLYI5MFypPnIOaROFPou/rKZS6whc3AGBE8j0bFoyT276F0NzYtvuXX32B"
    "z2VEs7t+bG1p2DuTuRXKT182x42lI/W78H/Z4mSLlwme4x9Rv+NtSYQCCoReiDBZyMPoqt"
    "MZiZKjrGtxn5rAwjYN8+AOZYhRbaplW+xSav7c1bAJE7qhPBVcOMqrEuwPgS2pTlK59i6+"
    "6iYs2WfhbTjttyrXHlmi4X9C18QpmRiXvSUh2xek0FhuyNhGOro33zUSth+fp0L4dE7VCk"
    "hGz1PM0FNQTsurWE7KcmxTRiizDKG4iA15qISURT6tqtpN1K2qUlbfbGYplZqZyoFGSZiH"
    "+rsg25fysQZoU6IM+wCPCEMohc8hVONcczol7y2mW1ciTiz6PLbB6/WTwHYms6uRh4SBR+"
    "dmrI9GRSUIQrrXnVNY97xuxlaicNtqRqioFX10sqoW2h1LhC6f8611pLbeRLELUYJgGNPL"
    "9aRjC1qwVTuyiYqOcDMq1DMBPSSOW+nkPARoh3g8CHDX4hzW2pRWpsJYn/8wm8vZfeTVJa"
    "k2DEfVr3LD8f1cgHeGVndjXemWdWTIBxyYN+FIWdfL2EGOgEKxV0/jX45u3bVTp6tk71a0"
    "KG7IlR9g+vsGWhAgapz1YCN0gC30PGo2dl6WOCNGQrhBOQ6tGoATFybybAtfxpQ/ZY/gr7"
    "y9WgX6WEq95hfycywWsH2WK3hREXN5uJdQFFlfXi45b5k5Xd/Es/dYGjepvs6reX2V88Wi"
    "W2"
)
