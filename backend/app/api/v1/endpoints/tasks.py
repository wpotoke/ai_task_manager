from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.database import get_db
from app.models.task import Priority, Status
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _repo(db: AsyncSession = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


@router.get("", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[Status] = Query(None),
    priority: Optional[Priority] = Query(None),
    search: Optional[str] = Query(None, min_length=1, max_length=200),
    deadline_before: Optional[str] = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    repo: TaskRepository = Depends(_repo),
):
    items, total = await repo.get_all(
        status=status,
        priority=priority,
        search=search,
        deadline_before=deadline_before,
        offset=offset,
        limit=limit,
    )
    return TaskListResponse(items=items, total=total)


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, repo: TaskRepository = Depends(_repo)):
    return await repo.create(data)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, data: TaskUpdate, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return await repo.update(task, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await repo.delete(task)
