from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" ADD "reschedule_time" TIMESTAMPTZ;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "leads" DROP COLUMN "reschedule_time";"""


MODELS_STATE = (
    "eJztmltv2zYUgP+KoacMSIvUi9tib4rjrFkTu0i8rWhRCLRE20QoUiWpJEbh/z6SuluUZn"
    "W2K3V+sn0uIs8nijxHx98sn3oQ85c254gLQIT1W++bRYAP5Zey8rRngSDIVEogwAxra5CY"
    "aTGYccGAqy44B5hDKfIgdxkKBKJESkmIsRJSVxoisshEIUFfQ+gIuoBiCZlUfP4ixYh48B"
    "ny5Gfw4MwRxF5hxshTY2u5I1aBll0TcaUN1Wgzx6U49ElmHKzEkpLUGkVhLiCBDAioLi9Y"
    "qKavZhfHmkQUzTQziaaY8/HgHIRY5MLdkoFLieKHFE0V4EKN8qL/6vzN+dtfX5+/lSZ6Jq"
    "nkzToKL4s9ctQExlNrrfVAgMhCY8y46c8SueESMDO6xH4DnpzyJrwEVR29RJDhy5bMjvj5"
    "4NnBkCzEUv58dXZWQ+sv+274zr47kVa/qGioXMbRCh/Hqn6kU0gzhI8gQE76DDimlVjN0+"
    "i8G7h7X5oFtP3BYAu00qoSrdYV0fIVF9B3Akb9QJSxTuFzxRNecuzKeq1hOB19nKpJ+5x/"
    "xXl0J7f2R03VX8Wam8n498Q8h3p4M7nYIDxHjAvHh5yDhWEjqCZccjwSNhN+pMiFTXeFnM"
    "/huFo3YIWB1erNVqcf6rl+RB5kTZiWPQ9IlgaQALQztINtyA6qwQ4quDbNBopeB+S5CMSL"
    "8xbjdBlUITvAcGpdSo1APjQjLXpuIPVi15fJl3ZusZaMwZsQvIqTjrot9/p2dD+1bz8U9t"
    "1LezpSmn5hz02kJ6837kR6kd7f19N3PfWz92kyHmmClIsF0yNmdtNPlpoTCAV1CH1ygJfL"
    "jxJpAmatio75Qy59VoIZcB+eAPOckob2aZVtWeX3/U0JIPJE9WK4appxNTYEGN9Bl7Ji5V"
    "PWntYVa660c5g2PJZrnSvXdLmgb+F3lBk5v+/aqmNWP1OBIUcj0dya5L5Fr52w/PnyXg6J"
    "OqGIgWz1Oi04dQTsvnMJOU5DipnHEWEcNxAhb7QQU4+u1LXHlPaY0m6d0uZvLJaRGdOJyo"
    "Qs5/HvWVlL7t8OErNSHVBkWAZ4RRlEC/IerjTHa6Je8rqmWjlO4m/iy7SP3zpZA4k0W1wM"
    "PKUZfn5pyPBkUFBEO619P7QvR9b6x9ROGqyhakqAV9dLKqBjodS5Qun/1dfaS20USBCNGK"
    "YOnexfbZMw9asTpn45YaJ+AMiqCcGcSycz9/00ATuRvFsEPrX4hTR3ZS7S4ChJ7Q+X4J39"
    "6NMko7UMZzygTXv5Ra9OPsB76dnJUsVdQi/EMgVCpmO5vnw0uO+ghmzXC7gWlYxJ2P+lDZ"
    "I7BAHGhr37Ina7en8HMdAky7fV2NloXypWVRqt91nQ2JAhd2mZ/rQXaU5r/7GX2Ryrml1u"
    "pvtu/0DG42dl685P5nKsbVKQ6tFoADE27ybAvZzpckRzV+KP+8m4qripakv8SWSAnz3kit"
    "MeRlx8aSfWGooq6voO2mazbONQVhe4ML1jPOT7svU/n4C7tw=="
)
