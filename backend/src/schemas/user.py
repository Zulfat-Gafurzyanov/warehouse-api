import datetime as dt
from enum import Enum

from pydantic import BaseModel, EmailStr, Field, model_validator


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class CooperationType(str, Enum):
    BUYOUT = "buyout"          # выкуп
    CONSIGNMENT = "consignment"  # реализация
    CUSTOM = "custom"          # индивидуальные условия


class UserProfile(BaseModel):
    id: int
    email: str
    is_active: bool
    role: UserRole
    created_at: dt.datetime
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None


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


class ClientCreate(BaseModel):
    """Создание клиента администратором — самостоятельная регистрация клиентам недоступна."""

    email: EmailStr
    password: str = Field(min_length=8)
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None


class ClientProfileUpdate(BaseModel):
    email: EmailStr | None = None
    company_name: str | None = None
    contact_name: str | None = None
    cooperation_type: CooperationType | None = None
    price_group_id: int | None = None
