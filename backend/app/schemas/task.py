from pydantic import BaseModel, field_validator
from datetime import datetime, date
from typing import Optional
from app.models.task import Priority, Status


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Priority = Priority.medium
    status: Status = Status.waiting
    deadline: Optional[date] = None
    category: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title must not be empty")
        return v.strip()


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[Status] = None
    deadline: Optional[date] = None
    category: Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            raise ValueError("Title must not be empty")
        return v.strip() if v else v


class TaskResponse(TaskBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    items: list[TaskResponse]
    total: int


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None
