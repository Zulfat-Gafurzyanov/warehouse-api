from typing import Annotated

from fastapi import APIRouter, Depends

from src.api.deps import get_auth_service
from src.schemas.auth import RefreshRequest, SignInRequest, TokenPair
from src.service.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

# Самостоятельной регистрации нет: аккаунты клиентов создаёт администратор
# через POST /admin/users (см. src/api/v1/admin.py).


@router.post("/sign-in")
async def sign_in(
    request: SignInRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenPair:
    return await auth_service.sign_in(request)


@router.post("/refresh")
async def refresh(
    request: RefreshRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenPair:
    return await auth_service.refresh(request.refresh_token)
