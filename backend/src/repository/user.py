import asyncpg

_PROFILE_COLUMNS = """
    id, email, is_active, created_at, role,
    company_name, contact_name, cooperation_type, price_group_id
"""


class UserRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_client(
        self,
        email: str,
        password_hash: str,
        company_name: str | None,
        contact_name: str | None,
        cooperation_type: str | None,
        price_group_id: int | None,
    ) -> asyncpg.Record | None:
        """Создание клиента администратором — со всеми B2B-реквизитами сразу."""
        return await self.conn.fetchrow(
            f"""
            INSERT INTO "user" (email, password_hash, company_name, contact_name, cooperation_type, price_group_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING {_PROFILE_COLUMNS}
            """,
            email, password_hash, company_name, contact_name, cooperation_type, price_group_id,
        )

    async def get_all(self, limit: int, offset: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            f"""
            SELECT {_PROFILE_COLUMNS}
            FROM "user"
            ORDER BY id
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset,
        )

    async def get_by_id(self, user_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            SELECT {_PROFILE_COLUMNS}
            FROM "user"
            WHERE id = $1
            """,
            user_id,
        )

    async def get_by_email(self, email: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            SELECT {_PROFILE_COLUMNS}, password_hash
            FROM "user"
            WHERE email = $1
            """,
            email,
        )

    async def update_email(
        self, user_id: int, email: str
    ) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            UPDATE "user"
            SET email = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING {_PROFILE_COLUMNS}
            """,
            user_id,
            email,
        )

    async def update_profile(self, user_id: int, fields: dict) -> asyncpg.Record | None:
        """Динамическое частичное обновление B2B-реквизитов (company_name, contact_name, ...)."""
        if not fields:
            return await self.get_by_id(user_id)
        set_clauses = ", ".join(f"{key} = ${i}" for i, key in enumerate(fields, start=2))
        return await self.conn.fetchrow(
            f"""
            UPDATE "user"
            SET {set_clauses}, updated_at = NOW()
            WHERE id = $1
            RETURNING {_PROFILE_COLUMNS}
            """,
            user_id, *fields.values(),
        )

    async def set_active(
        self, user_id: int, is_active: bool
    ) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            UPDATE "user"
            SET is_active = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING {_PROFILE_COLUMNS}
            """,
            user_id,
            is_active,
        )

    async def delete(self, user_id: int) -> bool:
        result = await self.conn.execute(
            """
            DELETE FROM "user"
            WHERE id = $1
            """,
            user_id,
        )
        return result == "DELETE 1"
