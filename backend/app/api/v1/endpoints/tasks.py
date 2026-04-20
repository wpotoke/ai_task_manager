import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.database import get_db
from app.models.task import Priority, Status
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse
from app.core.cache import llm_cache
from app.core.background_queue import bg_queue

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _repo(db: AsyncSession = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


# ── Background workload pre-computation ───────────────────────────────────

async def _precompute_workload() -> None:
    """
    Background job: recompute and cache the workload summary after any task mutation.

    Uses a fresh DB session (the request session will already be closed).
    Skips computation if a valid cache entry already exists for the current
    task set — avoids redundant LLM calls when multiple mutations arrive
    in quick succession (dedup in bg_queue ensures only one job is queued,
    and this check ensures the LLM is not called if the job runs twice).
    """
    from app.db.database import AsyncSessionLocal
    import app.services.llm_service as llm_svc

    try:
        async with AsyncSessionLocal() as session:
            repo = TaskRepository(session)
            tasks = await repo.get_all_active()
            key = llm_cache.workload_key([t.id for t in tasks])
            if llm_cache.get(key) is not None:
                logger.debug("BG workload: cache still valid — skipping LLM call")
                return
            result = await llm_svc.summarize_workload(tasks)
            llm_cache.set(key, result)
            logger.debug("BG workload: cached summary for %d tasks", len(tasks))
    except Exception as exc:
        logger.warning("BG workload pre-compute failed: %s", exc)


def _schedule_workload_refresh() -> None:
    """Invalidate workload cache and enqueue background recompute."""
    invalidated = llm_cache.invalidate_prefix("workload:")
    if invalidated:
        logger.debug("Cache: invalidated %d workload entries", invalidated)
    bg_queue.enqueue("workload-recompute", _precompute_workload)


# ── CRUD endpoints ────────────────────────────────────────────────────────

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
    task = await repo.create(data)
    _schedule_workload_refresh()
    return task


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
    updated = await repo.update(task, data)
    _schedule_workload_refresh()
    return updated


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await repo.delete(task)
    _schedule_workload_refresh()
