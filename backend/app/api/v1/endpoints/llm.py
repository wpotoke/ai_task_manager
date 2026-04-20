import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.repositories.task_repository import TaskRepository
from app.schemas.llm import (
    CategorySuggestion,
    DecompositionResult,
    PrioritySuggestion,
    WorkloadSummary,
)
from app.core.cache import llm_cache
import app.services.llm_service as llm

router = APIRouter(prefix="/llm", tags=["llm"])


def _repo(db: AsyncSession = Depends(get_db)) -> TaskRepository:
    return TaskRepository(db)


# ── Per-task LLM endpoints (with cache + deduplication) ───────────────────

@router.post("/tasks/{task_id}/categorize", response_model=CategorySuggestion)
async def categorize_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    key = llm_cache.task_key("categorize", task_id, task.title, task.description)
    try:
        result, _ = await llm_cache.get_or_compute(
            key,
            lambda: llm.suggest_category(task.title, task.description),
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tasks/{task_id}/decompose", response_model=DecompositionResult)
async def decompose_task(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    key = llm_cache.task_key("decompose", task_id, task.title, task.description)
    try:
        result, _ = await llm_cache.get_or_compute(
            key,
            lambda: llm.decompose_task(task.title, task.description),
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/tasks/{task_id}/suggest-priority", response_model=PrioritySuggestion)
async def suggest_priority(task_id: str, repo: TaskRepository = Depends(_repo)):
    task = await repo.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    key = llm_cache.task_key("priority", task_id, task.title, task.description)
    try:
        result, _ = await llm_cache.get_or_compute(
            key,
            lambda: llm.suggest_priority(task.title, task.description, task.deadline),
        )
        return result
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Workload summary — non-streaming (cache-first) ────────────────────────

@router.get("/workload-summary", response_model=WorkloadSummary)
async def workload_summary(repo: TaskRepository = Depends(_repo)):
    tasks = await repo.get_all_active()
    key = llm_cache.workload_key([t.id for t in tasks])
    try:
        result, from_cache = await llm_cache.get_or_compute(
            key,
            lambda: llm.summarize_workload(tasks),
        )
        # Attach cache flag without mutating the cached object
        return WorkloadSummary(**result.model_dump(), from_cache=from_cache)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))


# ── Workload summary — streaming SSE ──────────────────────────────────────

@router.get("/workload-summary/stream")
async def workload_summary_stream(repo: TaskRepository = Depends(_repo)):
    """
    Server-Sent Events endpoint for streaming workload summary.

    Events emitted:
      event: token   data: {"text": "<chunk>"}
      event: done    data: {WorkloadSummary JSON}
      event: llmerror  data: {"detail": "<message>"}

    If the result is already in cache, a single 'done' event is emitted
    immediately (no token events) — making cached responses instant.
    """
    tasks = await repo.get_all_active()
    key = llm_cache.workload_key([t.id for t in tasks])
    cached = llm_cache.get(key)

    async def generate():
        # ── Cache hit: serve instantly ─────────────────────────
        if cached is not None:
            payload = {**cached.model_dump(), "from_cache": True}
            yield f"event: done\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"
            return

        # ── Cache miss: stream from LLM ────────────────────────
        try:
            final_data = None
            async for event_type, data in llm.stream_workload_summary(tasks):
                yield f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
                if event_type == "done":
                    final_data = data

            if final_data:
                llm_cache.set(key, WorkloadSummary(**final_data))

        except RuntimeError as exc:
            yield f"event: llmerror\ndata: {json.dumps({'detail': str(exc)})}\n\n"
        except Exception as exc:
            yield f"event: llmerror\ndata: {json.dumps({'detail': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection": "keep-alive",
        },
    )


# ── Cache stats (debug) ───────────────────────────────────────────────────

@router.get("/cache/stats")
async def cache_stats():
    return llm_cache.stats()
