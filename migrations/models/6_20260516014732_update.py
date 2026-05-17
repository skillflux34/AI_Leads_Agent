from tortoise import BaseDBAsyncClient

RUN_IN_TRANSACTION = True


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "assistants" ADD "is_active" BOOL NOT NULL DEFAULT False;"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        ALTER TABLE "assistants" DROP COLUMN "is_active";"""


MODELS_STATE = (
    "eJztml1z2jgUhv8K46t0Ju2kbGg7eweEbNkS6CR0t9NOxyNsAZrIkmvJSZgO/30l2cZfso"
    "uzOLVTrhKOzrF1HvRxXokfhkNtiNmrPmOIcUC48Wfnh0GAA8U/+cbTjgFcN26SBg4WWHmD"
    "yE2ZwYJxD1jygUuAGRQmGzLLQy5HlAgr8TGWRmoJR0RWsckn6LsPTU5XkK+hJxq+fhNmRG"
    "z4AFn00b01lwhiO9VjZMt3K7vJN66yjQm/VI7ybQvToth3SOzsbviakp03CtJcQQI9wKF8"
    "PPd82X3ZuzDXKKOgp7FL0MVEjA2XwMc8ke6eDCxKJD8kacoEV/ItL7uvz9+ev/vjzfk74a"
    "J6srO83QbpxbkHgYrAdG5sVTvgIPBQGGNu6m+O3HANPD26yD8DT3Q5Cy9CVUYvMsT44iFz"
    "IH4OeDAxJCu+Fh9fn52V0Pqnfz18378+EV4vZDZUDONghE/Dpm7QJpHGCO+Ai8zdHDB1I7"
    "GYpzb4MHBrH5optN1ebw+0wqsQrWpLo2UbxqFjuh51XJ7HOocPBTM8F9iW8VrCcD76PJed"
    "dhj7jpPoTq76nxVVZxO2TGbTvyL3BOrhZDbIEF4ij3HTgYyBlWYhKCacCzwS1hO+o8iCVV"
    "eFRMzTcTUmYIOB0ejFVpUfcl7fIRt6VZjmI5+QLHUhAehgaHv7kO0Vg+0VcK1aDaSjnpDn"
    "yuUvzxuMEzFTlMDoTkNzQCmGgBRUpsm4DM+FCKwLaNVKff81dTCbTVJr6mCcXTQ/XQ1GYi"
    "FQeIUT4kH1HtauMVTLgzJtE2hKgQvRwpED9VjTkRmudhj6KvqnmfuWIXKwZwRvwkqubB8b"
    "X41u5v2rjynwF/35SLZ0UxtZZD15kxneu4d0/h3P33fkx86X2XSkCFLGV556Y+w3/2LIPg"
    "GfU5PQexPYiaIzskZgtlLJLW8TmkQaFsC6vQeebeZaaJcW+eabnK6TtQAiyhQ7hCu7GUrc"
    "IcD4GlrUS8vJfOtpmQK2hJ/pKcejBm6dBlYaTH2Fj9BuibhH7X8hq+ek2sTbSNC3KoIiHX"
    "UQls9PTDBI5A5FNGSLx2kqqCVgay/QCK9IMY44IgzzBtxnlQbiLqIthwV1MwxqBtED0/dw"
    "FZS5wJYOyv2IliHNMbV9kbHs1v7FUDLk5yVRM0AepCg6iqtnKa6SXywWmWkL28LZkIj4jS"
    "ZDTpCmEeb5XVIPohX5ADcK45jIKxxLd3ITqslJ+JjG4dtGIyCyxr3wwP1OaSYHhshO5ASD"
    "o5ph/2bYvxgZ21+j4RVXjXqPeBfrdpnQUbC3TrD/XpfWtWh0V4CoxHAX0MrL6X3KzG5xld"
    "nNFZkWdVxANlUIJkJaWazXc8PfChFpEHjf4NsmJrSgZjIXbiU7/0eVd48iePard5OY1tpf"
    "MJdW/aFOOqqVE7iWC3khVKw1tH0sSiCk25bLxaMm/AAKslkHwQ0SjFHa/+c6LrEJAow1a/"
    "cgDLv8cA1x0bmK9oatqV9rThlt69Qzfegha23ofpAbtJyW/ho39jmKmkOupXXfQkKPaU8t"
    "Sy4g45CjtNmBlFOjAsTQvZ0Aa9nSxRv1l2N/38ymRdqm6HbsExEJfrWRxU87GDH+rZlYSy"
    "jKrMsvcrN3tpk9WT5goDthfMrjsu1/Dy/2kw=="
)
