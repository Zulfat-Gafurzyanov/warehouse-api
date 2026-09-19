from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.deps import get_current_user_id, get_user_service
from src.schemas.user import UserProfile, UserUpdate
from src.service.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_profile(
    user_id: Annotated[int, Depends(get_current_user_id)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.get_profile(user_id)


@router.patch("/me")
async def update_profile(
    body: UserUpdate,
    user_id: Annotated[int, Depends(get_current_user_id)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> UserProfile:
    return await user_service.update_email(user_id, body.email)


@router.delete("/me", status_code=204)
async def delete_account(
    user_id: Annotated[int, Depends(get_current_user_id)],
    user_service: Annotated[UserService, Depends(get_user_service)],
) -> None:
    await user_service.delete(user_id)
