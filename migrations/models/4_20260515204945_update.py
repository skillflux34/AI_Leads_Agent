from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "call_records" ADD "recording_url" VARCHAR(500);
        ALTER TABLE "call_records" ADD "duration" INT;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "call_records" DROP COLUMN "recording_url";
        ALTER TABLE "call_records" DROP COLUMN "duration";"""


MODELS_STATE = (
    "eJztml1z2jgUhv8K46t0Ju2kbGg7e+cQss02gU7CbjvtdDzCFqCJLLmSnITp8N9Xkm1sY9"
    "mLs0DsLFfA0Tm2zmN9nNfil+VTD2L+xuYccQGIsH7v/LII8KH8Umw87lggCNImZRBggrU3"
    "SNy0GUy4YMBVF5wCzKE0eZC7DAUCUSKtJMRYGakrHRGZpaaQoJ8hdASdQTGHTDZ8/yHNiH"
    "jwEfLkZ3DnTBHEXq7HyFP31nZHLAJtuyTiQjuqu00cl+LQJ6lzsBBzSlbeKEpzBglkQEB1"
    "ecFC1X3VuzjXJKOop6lL1MVMjAenIMQik+6GDFxKFD+kaKoEZ+our7tvT9+ffvjt3ekH6a"
    "J7srK8X0bppblHgZrAcGwtdTsQIPLQGFNu+rNArj8HzIwu8V+DJ7u8Di9BVUUvMaT40iGz"
    "JX4+eHQwJDMxlz/fnpxU0Prbvul/tG+OpNcrlQ2Vwzga4cO4qRu1KaQpwnsQIGc1BxzTSC"
    "znaQzeDtydD80c2m6vtwFa6VWKVrfl0fIFF9B3Akb9QBSxjuFjyQwvBLZlvFYwHA++jlWn"
    "fc5/4iy6o2v7q6bqL+KWq9Hwj8Q9g7p/NTpbIzxFjAvHh5yDmWEhKCdcCDwQNhO+p8iFdV"
    "eFTMz+uFpXYIGB1ejFVpcfal7fIw+yOkyLkXskSwNIANoa2t4mZHvlYHslXOtWA/moPfKc"
    "BeL1aYNxugyqlB1g2LXOZYtAPjQjzUeuIfXi0DfJl2YusZbMwRsRvIiLjqol9/J6cDu2rz"
    "/n1t1zezxQLd3cmptYj96tPYnVRTpfLscfO+pn59toONAEKRczpu+Y+o2/WapPIBTUIfTB"
    "AV6mPkqsCZilEh3Tu0z5rAwT4N49AOY5hRbapWW+xSa/669bAJE7qhfDVd2M1VgfYHwDXc"
    "ryyqfYelwl1lzp5zDteJBrrZNrWi7oR/gEmZGJe9JSHbN6SQJD3o1EfatT++ajtsLy5dW9"
    "HBK1QxED2fJxmgtqCdhd1xLyPjUpphEHhHHeQIS81kBcRbRF1+6aYVQzyB44IcN1UBYCWz"
    "ooNyNahbTA1AtlxqpbmxdD2ZB/L4maAXIrRdFBXL1IcZV9sFhmZixsS2dDJuJJk+E5nt8W"
    "ZkNBkeYZFgFeUAbRjHyCC83xkqjjBtf01iaWk1fxZZrHb5mMgcSaDi4GHlZaMzs0ZHoyKS"
    "iijcq+7dvnA2v5PCpegzXo9wR4uXJXCR0ke+sk+//rhHUnKj2QIGoxXAW08iR1k0KzW15n"
    "dotvo6kfALKoQzAT0spyfTfH0a2QkRaBDw0+GuFSDRomc+lWsvLfX4F38ty7SUprHk54QO"
    "v+qyQf1coJvJPTYylV3Dn0QixLIGTalqvloyF8CxqyWa+CGyQZk7T/y4FcZhMEGBvW7rM4"
    "7OLTDcRlb1aMZ2zNK8XKpNFyl4LGhgy5c8v099Go5bjyv6Opz0HVbHMx3fVBJGTc+OKy4g"
    "wyDTlomxVINTVqQIzd2wlwJ3u6vKP5fOzP29GwTNyUHZD9RWSC3z3kiuMORlz8aCbWCooq"
    "6+qz3PVj27VNWV3gzPSOcZ/vy5b/AKx1is0="
)
