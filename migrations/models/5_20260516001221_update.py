from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "call_records" ALTER COLUMN "lead_id" DROP NOT NULL;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "call_records" ALTER COLUMN "lead_id" SET NOT NULL;"""


MODELS_STATE = (
    "eJztml1v2zYUhv+KoasMSIvUi9tid4rjrFkTe0i8rWhRCLRE20QoUiWpJEbh/z6S+rYozc"
    "rsVEp9ZfvwHInnET/OK/q75VMPYv7a5hxxAYiwfut9twjwofxSbjzuWSAIsiZlEGCGtTdI"
    "3LQZzLhgwFUXnAPMoTR5kLsMBQJRIq0kxFgZqSsdEVlkppCgbyF0BF1AsYRMNnz5Ks2IeP"
    "AR8uRncOfMEcReocfIU/fWdkesAm27JOJCO6q7zRyX4tAnmXOwEktKUm8UpbmABDIgoLq8"
    "YKHqvupdnGuSUdTTzCXqYi7Gg3MQYpFLd0sGLiWKH1I0VYILdZdX/Ten707f//r29L100T"
    "1JLe/WUXpZ7lGgJjCeWmvdDgSIPDTGjJv+LJEbLgEzo0v8N+DJLm/CS1DV0UsMGb5syOyI"
    "nw8eHQzJQizlzzcnJzW0/rZvhh/smyPp9YvKhsphHI3wcdzUj9oU0gzhPQiQk84BxzQSq3"
    "kag3cDd+9Ds4C2PxhsgVZ6VaLVbUW0fMUF9J2AUT8QZaxT+Fgxw0uBXRmvNQyno09T1Wmf"
    "8284j+7o2v6kqfqruOVqMv49cc+hHl5NzjYIzxHjwvEh52BhWAiqCZcCD4TNhO8pcmHTVS"
    "EX83xcrSuwwsBq9WKryw81r++RB1kTpuXIZyRLA0gA2hnawTZkB9VgBxVcm1YDxahn5LkI"
    "xKvTFuN0GVQpO8Cwa53LFoF8aEZajNxA6sWhr5Mv7VxiLZmDNyF4FRcddUvu5fXodmpf/1"
    "lYd8/t6Ui19AtrbmI9ervxJNKL9P65nH7oqZ+9z5PxSBOkXCyYvmPmN/1sqT6BUFCH0AcH"
    "eLn6KLEmYNZKdMzvcuWzMsyAe/cAmOeUWmifVvmWm/y+v2kBRO6oXgxXdTNWY0OA8Q10KS"
    "sqn3LrcZ1Yc6Wfw7TjQa51Tq5puaAf4RNkRi7uSUt1zOolCQx5NxL1rUntW4zaCcuXV/dy"
    "SNQORQxkq8dpIagjYPddS8j7NKSYRRwQxnkDEfJGAzGN6Iqu3TfDqGaQPXBChpugLAV2dF"
    "BuR7QOaYmpF8qMVbe2L4byIf9dErUD5E6KooO4epHiKv9gsczMWNhWzoZcxE80GUqCtIiw"
    "zO+CMogW5CNcaYyXRJ02uKaXNrGavIov0zp862QEJNasFww8pEozPzBkdjInKKJtyr4d2u"
    "cja/1jNLzmalDvCe9q3a4SOgj2zgn2n+t8dS8aPZAgGjFMAzp5jrpNmdmvrjL75XfR1A8A"
    "WTUhmAvpZLG+n8PoTohIi8CHFh+McKkFDZO5citJ/Z9U3j2J4MmP3k0yWstwxgPa9D8lxa"
    "hOTuC9nB1LoeIuoRdiWQIh07ZcLx4N4TtQkO16EdwiwZik/X+O43KbIMDYsHafxWEXH28g"
    "rnqvYjxha+tjLSmj9T71jA0ZcpeW6b+jUctx7R9HM5+DqNnlWrrvU0jIuPGtZc0BZBZykD"
    "YpSDU1GkCM3bsJcC9buryj+XDsj9vJuErbVJ2O/UVkgl885IrjHkZcfG0n1hqKKuv6g9zN"
    "M9uNPVld4Mz0hvE5X5et/wVaJIns"
)
