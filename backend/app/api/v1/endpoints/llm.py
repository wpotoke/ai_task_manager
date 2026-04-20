from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.task_repository import TaskRepository
from app.schemas.llm import (
    CategorySuggestion,
    DecompositionResult,
    PrioritySuggestion,
    WorkloadSummary,
)
import app.services.llm_service as llm

router = APIRouter(prefix="/llm", tags=["llm"])


def _repo(db: AsyncSession = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


@router.post("/tasks/{task_id}/categorize", response_model=CategorySuggestion)
async def categorize_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        return await llm.suggest_category(task.title, task.description)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tasks/{task_id}/decompose", response_model=DecompositionResult)
async def decompose_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        return await llm.decompose_task(task.title, task.description)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tasks/{task_id}/suggest-priority", response_model=PrioritySuggestion)
async def suggest_priority(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    try:
        return await llm.suggest_priority(task.title, task.description, task.deadline)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/workload-summary", response_model=WorkloadSummary)
async def workload_summary(repo: TaskRepository = Depends(_repo)):
    tasks = await repo.get_all_active()
    try:
        return await llm.summarize_workload(tasks)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))
