import datetime as dt

from pydantic import BaseModel, Field


class CategoryOut(BaseModel):
    id: int
    name: str
    created_at: dt.datetime
    updated_at: dt.datetime


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CategoryUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
