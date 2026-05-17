from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "assistants" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "vapi_assistant_id" VARCHAR(255) NOT NULL UNIQUE,
    "system_prompt" TEXT NOT NULL,
    "first_message" TEXT NOT NULL,
    "voice_id" VARCHAR(100) NOT NULL DEFAULT 'jennifer',
    "model_provider" VARCHAR(50) NOT NULL DEFAULT 'openai',
    "model_name" VARCHAR(50) NOT NULL DEFAULT 'gpt-4',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "assistants";"""


MODELS_STATE = (
    "eJztml1P2zAUhv9KlSsmsQk6OtDuQikbG7QTdBsCTZGbuKmHYwfbASrU/z7b+W6Srpla1m"
    "y9ant8TuzzxLHfE/fZ8KgDMX9jco64AEQY71vPBgEelF+KjbstA/h+2qQMAoyw9gaxmzaD"
    "ERcM2OqCY4A5lCYHcpshXyBKpJUEGCsjtaUjIm5qCgi6D6AlqAvFBDLZcPtDmhFx4BPk8U"
    "//zhojiJ3ciJGj+tZ2S0x9bTsj4lQ7qt5Glk1x4JHU2Z+KCSWJNwrTdCGBDAioLi9YoIav"
    "RhflGmcUjjR1CYeYiXHgGARYZNJdkoFNieKHFE2VoKt6ed3ePzg8OHr77uBIuuiRJJbDWZ"
    "hemnsYqAn0h8ZMtwMBQg+NMeWmPwvkuhPAytHF/nPw5JDn4cWoFtGLDSm+dMqsiJ8HniwM"
    "iSsm8uf+3t4CWt/My+5H83JHer1S2VA5jcMZ3o+a2mGbQpoifAA+spJnwCqbidU8S4NXA3"
    "ftUzOHtt3pLIFWelWi1W15tHzKBfQsn1HPF0WsQ/hU8YQXApsyXxcwHPauh2rQHuf3OItu"
    "58K81lS9adRyPuh/iN0zqLvng+M5wmPEuLA8yDlwSxaCasKFwC3hcsIPFNmw7qqQiXk5rs"
    "ZPSAgaQ93B5q63WoGoR/sBOeFYl8VajHxBuNSHBKCVoe0sQ7ZTDbZTwbWuIMhHvSBP1xev"
    "DzYYp82gStkCJRvXiWwRyIPlSPORc0idKPRN/GUzV1lD5uAMCJ5GumPRqnt20bsamhdfck"
    "vviTnsqZZ2btmNrTvv5u5EcpHW97Phx5b62boZ9HuaIOXCZbrH1G94Y6gxgUBQi9BHCzgZ"
    "iRRbYzAzVXeM7zIKWhlGwL57BMyxCi20Tat8i01e25u3ACI3VSeCq4YZFWRdgPEltCnLFz"
    "/F1t1F9Zot/SymHbcVW+MqNl0x6Fv4B5VGJu6PluqI1b9UY8jeSDi2OvI3H7USlv+e9OWQ"
    "qB2KlJCtnqe5oIaAXbeWkP3UpJhGbBFGeQMR8FoTMYloSmm7lbRbSbu0pM3eWCwzK5UTlY"
    "IsE/F7VbYh928FwqxQB+QZFgGeUgaRSz7DqeZ4RtR7XrusVo5E/Hl0mc3jN4vnQGxNJxcD"
    "j4nCz04NmZ5MCopwpTWvuuZJz5j9ndpJgy2pmmLg1fWSSmhbKDWuUPq/jrbWUhv5EkQthk"
    "lAI4+wlhFM7WrB1C4KJur5gEzrEMyENFK5r+ccsBHi3SDwcYNfSHNbapEaW0ni/3ICb+9v"
    "7yYprUkw4j6te5yfj2rkA7yyM7sa78wzKybAuORBP47CTj9fQgx0gpUKOv8afPP27SodPV"
    "un+jUhQ/bEKPuTV9iyUAGD1GcrgRskgR8g49GzsvQxQRqyFcIJSPVo1IAYuTcT4Fr+tCF7"
    "LH+F/elq0K9SwlXvsL8SmeCtg2yx28KIix+biXUBRZX14uOW+ZOV3fxLP3WB43qb7Oq3l9"
    "kvf9onFA=="
)
