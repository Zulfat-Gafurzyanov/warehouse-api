from typing import Annotated

from fastapi import APIRouter, Body, Depends, status

from src.api.deps import get_auth_service
from src.schemas.auth import RefreshRequest, SignInRequest, SignUpRequest, TokenPair
from src.service.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sign-up", status_code=status.HTTP_201_CREATED)
async def sign_up(
    request: Annotated[SignUpRequest, Body],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> TokenPair:
    return await auth_service.sign_up(request)


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
