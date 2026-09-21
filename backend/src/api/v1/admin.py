from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_admin, get_user_service
from src.schemas.user import (
    ClientCreate,
    ClientProfileUpdate,
    UserActiveUpdate,
    UserPasswordReset,
    UserProfile,
)
from src.service.user import UserService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_client(
    body: ClientCreate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    """Создание клиента администратором. Самостоятельная регистрация клиентам недоступна."""
    return await user_service.create_client(body)


@router.patch("/users/{user_id}/profile")
async def update_client_profile(
    user_id: int,
    body: ClientProfileUpdate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.update_client_profile(user_id, body)


@router.get("/users")
async def list_users(
    user_service: Annotated[UserService, Depends(get_user_service)],
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[UserProfile]:
    return await user_service.get_all(limit, offset)


@router.get("/users/{user_id}")
async def get_user(
    user_id: int,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.get_profile(user_id)


@router.patch("/users/{user_id}/active")
async def set_user_active(
    user_id: int,
    body: UserActiveUpdate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.set_active(user_id, body.is_active)


@router.patch("/users/{user_id}/password")
async def reset_user_password(
    user_id: int,
    body: UserPasswordReset,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    """Администратор задаёт клиенту новый пароль (клиент не может сам зарегистрироваться/восстановить его)."""
    return await user_service.reset_password(user_id, body.password)
