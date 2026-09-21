import datetime as dt
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class CooperationType(str, Enum):
    BUYOUT = "buyout"          # выкуп
    CONSIGNMENT = "consignment"  # реализация
    CUSTOM = "custom"          # индивидуальные условия


class UserProfile(BaseModel):
    id: int
    login: str
    is_active: bool
    role: UserRole
    created_at: dt.datetime
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None


class UserUpdate(BaseModel):
    login: str | None = Field(default=None, min_length=3, max_length=255)

    @model_validator(mode="after")
    def check_at_least_one_field(self) -> "UserUpdate":
        if self.login is None:
            raise ValueError("Необходимо указать хотя бы одно поле")
        return self


class UserActiveUpdate(BaseModel):
    is_active: bool


class UserPasswordReset(BaseModel):
    password: str = Field(min_length=8)


class ClientCreate(BaseModel):
    """Создание клиента администратором — самостоятельная регистрация клиентам недоступна."""

    login: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8)
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None


class ClientProfileUpdate(BaseModel):
    login: str | None = Field(default=None, min_length=3, max_length=255)
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None
