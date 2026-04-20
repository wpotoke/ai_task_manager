"""
In-memory LLM response cache with TTL and asyncio-based request deduplication.

Deduplication: if N concurrent requests arrive for the same cache key while
no result is cached, only ONE LLM call is made. The remaining N-1 coroutines
await the same asyncio.Future and receive the result when it resolves —
without making redundant API calls.
"""
import asyncio
import hashlib
import time
from typing import Any, Callable, Awaitable


class LLMCache:
    def __init__(self, ttl: int = 300):
        self._ttl = ttl
        self._store: dict[str, tuple[Any, float]] = {}
        self._in_flight: dict[str, asyncio.Future] = {}

    # ── Key helpers ────────────────────────────────────────────────────────

    @staticmethod
    def task_key(op: str, task_id: str, title: str, description: str | None) -> str:
        """Cache key for per-task LLM operations (categorize / decompose / priority)."""
        raw = f"{task_id}:{title}:{description or ''}"
        h = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return f"{op}:{h}"

    @staticmethod
    def workload_key(task_ids: list[str]) -> str:
        """Cache key for workload summary — changes when the task set changes."""
        h = hashlib.sha256(",".join(sorted(task_ids)).encode()).hexdigest()[:16]
        return f"workload:{h}"

    # ── Core operations ────────────────────────────────────────────────────

    def get(self, key: str) -> Any | None:
        if entry := self._store.get(key):
            val, exp = entry
            if time.monotonic() < exp:
                return val
            del self._store[key]
        return None

    def set(self, key: str, value: Any) -> None:
        self._store[key] = (value, time.monotonic() + self._ttl)

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        """Delete all entries whose key starts with prefix. Returns count deleted."""
        keys = [k for k in list(self._store) if k.startswith(prefix)]
        for k in keys:
            del self._store[k]
        return len(keys)

    def stats(self) -> dict:
        now = time.monotonic()
        valid = sum(1 for _, (_, exp) in self._store.items() if exp > now)
        return {
            "entries": len(self._store),
            "valid": valid,
            "in_flight": len(self._in_flight),
            "ttl_seconds": self._ttl,
        }

    # ── Cache-aside with deduplication ────────────────────────────────────

    async def get_or_compute(
        self,
        key: str,
        fn: Callable[[], Awaitable[Any]],
    ) -> tuple[Any, bool]:
        """
        Cache-aside pattern with asyncio deduplication.

        Returns (result, from_cache):
          - (value, True)  — cache hit, no LLM call
          - (value, False) — cache miss, fn() was called (or awaited in-flight)

        Three execution paths:
        1. Cache hit   → return immediately, fn never called
        2. In-flight   → await existing Future (shares one LLM call with other waiters)
        3. Fresh miss  → call fn(), store result, resolve Future for waiters
        """
        if (cached := self.get(key)) is not None:
            return cached, True

        if key in self._in_flight:
            result = await asyncio.shield(self._in_flight[key])
            return result, False

        fut: asyncio.Future = asyncio.get_event_loop().create_future()
        self._in_flight[key] = fut
        try:
            result = await fn()
            self.set(key, result)
            fut.set_result(result)
            return result, False
        except Exception as exc:
            if not fut.done():
                fut.set_exception(exc)
            raise
        finally:
            self._in_flight.pop(key, None)


llm_cache = LLMCache(ttl=300)
