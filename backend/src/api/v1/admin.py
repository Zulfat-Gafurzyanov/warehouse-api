from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.api.deps import get_current_admin, get_user_service
from src.schemas.user import UserActiveUpdate, UserProfile, UserRoleUpdate
from src.service.user import UserService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


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


@router.patch("/users/{user_id}/role")
async def set_user_role(
    user_id: int,
    body: UserRoleUpdate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.set_role(user_id, body.role.value)


@router.patch("/users/{user_id}/active")
async def set_user_active(
    user_id: int,
    body: UserActiveUpdate,
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.set_active(user_id, body.is_active)
