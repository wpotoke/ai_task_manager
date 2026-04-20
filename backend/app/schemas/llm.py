from pydantic import BaseModel
from typing import Optional
from app.models.task import Priority


class CategorySuggestion(BaseModel):
    category: str
    reasoning: str


class SubTask(BaseModel):
    title: str
    description: Optional[str] = None


class DecompositionResult(BaseModel):
    subtasks: list[SubTask]
    reasoning: str


class PrioritySuggestion(BaseModel):
    priority: Priority
    reasoning: str


class WorkloadSummary(BaseModel):
    summary: str
    overdue_count: int
    upcoming_count: int
    distribution: dict[str, int]
    from_cache: bool = False
