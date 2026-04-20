"""
Lightweight asyncio background job queue for non-interactive LLM operations.

Design:
- Single async worker prevents simultaneous LLM overload.
- Job deduplication by name: submitting the same job while it's already
  pending is a silent no-op — no duplicates accumulate in the queue.
- Graceful startup / shutdown integrated with FastAPI lifespan.

Typical use-case: after any task mutation, enqueue a workload-summary
pre-computation so the next user request is served from cache instantly.
"""
import asyncio
import logging
from typing import Callable, Awaitable, Any

logger = logging.getLogger(__name__)


class BackgroundQueue:
    def __init__(self):
        self._queue: asyncio.Queue[tuple[str, Callable[[], Awaitable[Any]]]] = asyncio.Queue()
        self._pending: set[str] = set()
        self._worker_task: asyncio.Task | None = None

    # ── Lifecycle ─────────────────────────────────────────────────────────

    def start(self) -> None:
        """Start the background worker. Call once inside FastAPI lifespan."""
        self._worker_task = asyncio.create_task(self._run(), name="llm-bg-worker")
        logger.info("Background LLM queue worker started")

    async def stop(self) -> None:
        """Gracefully stop the worker. Call on application shutdown."""
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
        logger.info("Background LLM queue worker stopped")

    # ── Public API ────────────────────────────────────────────────────────

    def enqueue(self, name: str, fn: Callable[[], Awaitable[Any]]) -> None:
        """
        Schedule fn() to run in the background.

        If a job named `name` is already waiting in the queue, the new
        submission is silently dropped — preventing duplicate work when
        multiple mutations happen in quick succession.
        """
        if name in self._pending:
            logger.debug("BG queue: '%s' already pending — dropped duplicate", name)
            return
        self._pending.add(name)
        self._queue.put_nowait((name, fn))
        logger.debug("BG queue: enqueued '%s' (queue depth: %d)", name, self._queue.qsize())

    @property
    def pending_count(self) -> int:
        return len(self._pending)

    # ── Worker ────────────────────────────────────────────────────────────

    async def _run(self) -> None:
        while True:
            try:
                name, fn = await self._queue.get()
                self._pending.discard(name)
                logger.debug("BG queue: executing '%s'", name)
                try:
                    await fn()
                    logger.debug("BG queue: '%s' completed", name)
                except Exception as exc:
                    logger.warning("BG queue: '%s' failed: %s", name, exc)
                finally:
                    self._queue.task_done()
            except asyncio.CancelledError:
                break


bg_queue = BackgroundQueue()
