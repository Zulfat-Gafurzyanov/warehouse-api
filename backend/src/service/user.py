from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError
from fastapi import HTTPException, status

from src.core.security import hash_password
from src.repository.user import UserRepository
from src.schemas.user import ClientCreate, ClientProfileUpdate, UserProfile


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_profile(self, user_id: int) -> UserProfile:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def update_login(self, user_id: int, login: str) -> UserProfile:
        try:
            user = await self.repository.update_login(user_id, login)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Логин уже используется") from e
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def get_all(self, limit: int = 50, offset: int = 0) -> list[UserProfile]:
        users = await self.repository.get_all(limit, offset)
        return [UserProfile(**dict(u)) for u in users]

    async def set_active(self, user_id: int, is_active: bool) -> UserProfile:
        user = await self.repository.set_active(user_id, is_active)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def delete(self, user_id: int) -> None:
        deleted = await self.repository.delete(user_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")

    # ── Администрирование B2B-клиентов ───────────────────

    async def create_client(self, request: ClientCreate) -> UserProfile:
        hashed = hash_password(request.password)
        try:
            user = await self.repository.create_client(
                login=request.login,
                password_hash=hashed,
                company_name=request.company_name,
                contact_name=request.contact_name,
                cooperation_type=request.cooperation_type.value if request.cooperation_type else None,
                price_group_id=request.price_group_id,
            )
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Логин уже используется") from e
        except ForeignKeyViolationError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Указанная ценовая группа не существует") from e
        return UserProfile(**dict(user))

    async def update_client_profile(self, user_id: int, request: ClientProfileUpdate) -> UserProfile:
        fields = request.model_dump(exclude_unset=True)
        if "cooperation_type" in fields and fields["cooperation_type"] is not None:
            fields["cooperation_type"] = fields["cooperation_type"].value
        try:
            user = await self.repository.update_profile(user_id, fields)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Логин уже используется другим пользователем") from e
        except ForeignKeyViolationError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Указанная ценовая группа не существует") from e
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def reset_password(self, user_id: int, new_password: str) -> UserProfile:
        hashed = hash_password(new_password)
        user = await self.repository.update_password(user_id, hashed)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))
