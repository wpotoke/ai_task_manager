import json
from datetime import date
from typing import Optional, AsyncGenerator

from openai import AsyncOpenAI

from app.core.config import settings
from app.models.task import Task, Priority
from app.schemas.llm import (
    CategorySuggestion,
    DecompositionResult,
    SubTask,
    PrioritySuggestion,
    WorkloadSummary,
)

SYSTEM_PROMPT = """You are an intelligent task management assistant.
Your role is to help users organize and prioritize their tasks efficiently.
Always respond with valid JSON matching the requested schema exactly.
Be concise and practical in your reasoning."""


def _get_client() -> AsyncOpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def _chat(user: str, max_tokens: int = 512) -> str:
    """Non-blocking LLM call that returns full JSON response."""
    client = _get_client()
    response = await client.chat.completions.create(
        model=settings.openai_model,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user},
        ],
        response_format={"type": "json_object"},
    )
    return response.choices[0].message.content or ""


# ── Task-level LLM functions ───────────────────────────────────────────────

async def suggest_category(title: str, description: Optional[str]) -> CategorySuggestion:
    desc_part = f"\nDescription: {description}" if description else ""
    prompt = f"""Analyze this task and suggest the most appropriate category/tag.

Task title: {title}{desc_part}

Respond with JSON:
{{"category": "<single word or short phrase>", "reasoning": "<brief explanation>"}}

Examples of good categories: "Development", "Research", "Meeting", "Review", "Documentation", "Bug Fix", "Design", "DevOps", "Personal", "Finance"
"""
    data = _parse_json(await _chat(prompt, max_tokens=256))
    return CategorySuggestion(**data)


async def decompose_task(title: str, description: Optional[str]) -> DecompositionResult:
    desc_part = f"\nDescription: {description}" if description else ""
    prompt = f"""Break down this complex task into smaller, actionable subtasks.

Task title: {title}{desc_part}

Respond with JSON:
{{
  "subtasks": [
    {{"title": "<subtask title>", "description": "<optional brief description>"}},
    ...
  ],
  "reasoning": "<brief explanation of your decomposition approach>"
}}

Create 3-7 concrete, actionable subtasks. Each subtask should be independently completable."""
    data = _parse_json(await _chat(prompt, max_tokens=1024))
    return DecompositionResult(subtasks=[SubTask(**s) for s in data["subtasks"]], reasoning=data["reasoning"])


async def suggest_priority(title: str, description: Optional[str], deadline: Optional[date]) -> PrioritySuggestion:
    desc_part = f"\nDescription: {description}" if description else ""
    deadline_part = f"\nDeadline: {deadline.isoformat()}" if deadline else "\nDeadline: not set"
    prompt = f"""Suggest an appropriate priority level for this task.

Today's date: {date.today().isoformat()}
Task title: {title}{desc_part}{deadline_part}

Priority levels:
- low: non-urgent, can be done anytime
- medium: should be done soon, moderate importance
- high: urgent or very important, needs immediate attention

Respond with JSON:
{{"priority": "<low|medium|high>", "reasoning": "<brief explanation>"}}"""

    data = _parse_json(await _chat(prompt, max_tokens=256))
    return PrioritySuggestion(priority=Priority(data["priority"]), reasoning=data["reasoning"])


# ── Workload summary — batch (non-streaming) ──────────────────────────────

async def summarize_workload(tasks: list[Task]) -> WorkloadSummary:
    today = date.today()
    overdue, upcoming_7d, distribution = _compute_workload_stats(tasks, today)

    tasks_text = "\n".join(
        f"- [{t.priority.value.upper()}] {t.title} | status: {t.status.value}"
        + (f" | deadline: {t.deadline}" if t.deadline else "")
        for t in tasks[:30]
    )
    prompt = f"""Analyze the user's current workload and provide a concise natural language summary.

Today: {today.isoformat()}
Active tasks ({len(tasks)} total):
{tasks_text or "No active tasks"}

Overdue: {len(overdue)} tasks
Due in next 7 days: {len(upcoming_7d)} tasks
Priority distribution: {distribution}

Write a helpful, friendly 2-4 sentence workload summary in Russian.
Mention key insights: overdue items, upcoming deadlines, workload balance.

Respond with JSON:
{{
  "summary": "<natural language summary in Russian>",
  "overdue_count": {len(overdue)},
  "upcoming_count": {len(upcoming_7d)},
  "distribution": {json.dumps(distribution)}
}}"""

    data = _parse_json(await _chat(prompt, max_tokens=512))
    return WorkloadSummary(**data)


# ── Workload summary — streaming ──────────────────────────────────────────

async def stream_workload_summary(
    tasks: list[Task],
) -> AsyncGenerator[tuple[str, dict], None]:
    """
    Stream workload summary token by token via OpenAI streaming API.

    Yields (event_type, data) tuples:
      - ("token", {"text": "chunk..."})   for each text chunk
      - ("done",  {full WorkloadSummary}) when complete

    Stats (overdue_count, distribution, etc.) are computed locally without
    an LLM call, so they are available even before streaming starts.
    Streaming covers only the natural-language summary text.
    """
    today = date.today()
    overdue, upcoming_7d, distribution = _compute_workload_stats(tasks, today)

    tasks_text = "\n".join(
        f"- [{t.priority.value.upper()}] {t.title} | status: {t.status.value}"
        + (f" | deadline: {t.deadline}" if t.deadline else "")
        for t in tasks[:30]
    )

    prompt = f"""Write a helpful, friendly 2-4 sentence workload summary in Russian for this task list.
Be concise and actionable. Output ONLY the summary text — no JSON, no headers, no formatting.

Today: {today.isoformat()}
Active tasks ({len(tasks)} total):
{tasks_text or "No active tasks"}
Overdue: {len(overdue)} | Due in 7 days: {len(upcoming_7d)} | Priority: {distribution}"""

    client = _get_client()
    full_text = ""

    stream = await client.chat.completions.create(
        model=settings.openai_model,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
        stream=True,
    )

    async for chunk in stream:
        text = chunk.choices[0].delta.content or ""
        if text:
            full_text += text
            yield "token", {"text": text}

    yield "done", {
        "summary": full_text.strip(),
        "overdue_count": len(overdue),
        "upcoming_count": len(upcoming_7d),
        "distribution": distribution,
    }


# ── Helpers ───────────────────────────────────────────────────────────────

def _compute_workload_stats(tasks: list[Task], today: date) -> tuple:
    overdue = [t for t in tasks if t.deadline and t.deadline < today and t.status != "done"]
    upcoming_7d = [
        t for t in tasks
        if t.deadline and today <= t.deadline <= date.fromordinal(today.toordinal() + 7)
    ]
    distribution: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    for t in tasks:
        distribution[t.priority.value] += 1
    return overdue, upcoming_7d, distribution


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {text[:200]}")
