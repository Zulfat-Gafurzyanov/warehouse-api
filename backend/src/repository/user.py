import asyncpg


class UserRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(
            self, email: str, password_hash: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            INSERT INTO "user" (email, password_hash)
            VALUES ($1, $2)
            RETURNING id, email, is_active, created_at, role
            """,
            email,
            password_hash,
        )

    async def get_all(self, limit: int, offset: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT id, email, is_active, created_at, role
            FROM "user"
            ORDER BY id
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset,
        )

    async def get_by_id(self, user_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            SELECT id, email, is_active, created_at, role
            FROM "user"
            WHERE id = $1
            """,
            user_id,
        )

    async def get_by_email(self, email: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            SELECT id, email, password_hash, is_active, created_at, role
            FROM "user"
            WHERE email = $1
            """,
            email,
        )

    async def update_email(
        self, user_id: int, email: str
    ) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            UPDATE "user"
            SET email = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, is_active, created_at, role
            """,
            user_id,
            email,
        )

    async def set_active(
        self, user_id: int, is_active: bool
    ) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            UPDATE "user"
            SET is_active = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, is_active, created_at, role
            """,
            user_id,
            is_active,
        )

    async def set_role(self, user_id: int, role: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            UPDATE "user"
            SET role = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, email, is_active, created_at, role
            """,
            user_id,
            role,
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
