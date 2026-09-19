from fastapi import HTTPException, status

from src.repository.user import UserRepository
from src.schemas.user import UserProfile


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_profile(self, user_id: int) -> UserProfile:
        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def update_email(self, user_id: int, email: str) -> UserProfile:
        user = await self.repository.update_email(user_id, email)
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

    async def set_role(self, user_id: int, role: str) -> UserProfile:
        user = await self.repository.set_role(user_id, role)
        if not user:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
        return UserProfile(**dict(user))

    async def delete(self, user_id: int) -> None:
        deleted = await self.repository.delete(user_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Пользователь не найден")
