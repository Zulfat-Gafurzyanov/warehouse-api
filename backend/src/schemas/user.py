import datetime as dt
from enum import Enum

from pydantic import BaseModel, EmailStr, model_validator


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserProfile(BaseModel):
    id: int
    email: str
    is_active: bool
    role: UserRole
    created_at: dt.datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "UserUpdate":
        if self.email is None:
            raise ValueError("Необходимо указать хотя бы одно поле")
        return self


class UserRoleUpdate(BaseModel):
    role: UserRole


class UserActiveUpdate(BaseModel):
    is_active: bool
