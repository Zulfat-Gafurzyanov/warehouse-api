from pydantic import BaseModel


class ComponentHealth(BaseModel):
    status: str  # "ok" | "error"
    detail: str | None = None


class HealthResponse(BaseModel):
    status: str  # "healthy" | "degraded"
    database: ComponentHealth
    redis: ComponentHealth
