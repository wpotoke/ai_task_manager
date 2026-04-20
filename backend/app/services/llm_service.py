import json
import os
from datetime import date
from typing import Optional
import anthropic

from app.models.task import Task, Priority
from app.schemas.llm import (
    CategorySuggestion,
    DecompositionResult,
    SubTask,
    PrioritySuggestion,
    WorkloadSummary,
)

CLAUDE_MODEL = "claude-haiku-4-5-20251001"


def _get_client() -> anthropic.Anthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")
    return anthropic.Anthropic(api_key=api_key)


SYSTEM_PROMPT = """You are an intelligent task management assistant.
Your role is to help users organize and prioritize their tasks efficiently.
Always respond with valid JSON matching the requested schema exactly.
Be concise and practical in your reasoning."""


async def suggest_category(title: str, description: Optional[str]) -> CategorySuggestion:
    client = _get_client()
    desc_part = f"\nDescription: {description}" if description else ""
    prompt = f"""Analyze this task and suggest the most appropriate category/tag.

Task title: {title}{desc_part}

Respond with JSON:
{{"category": "<single word or short phrase>", "reasoning": "<brief explanation>"}}

Examples of good categories: "Development", "Research", "Meeting", "Review", "Documentation", "Bug Fix", "Design", "DevOps", "Personal", "Finance"
"""
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    data = _parse_json(raw)
    return CategorySuggestion(**data)


async def decompose_task(title: str, description: Optional[str]) -> DecompositionResult:
    client = _get_client()
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
    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    data = _parse_json(raw)
    subtasks = [SubTask(**s) for s in data["subtasks"]]
    return DecompositionResult(subtasks=subtasks, reasoning=data["reasoning"])


async def suggest_priority(title: str, description: Optional[str], deadline: Optional[date]) -> PrioritySuggestion:
    client = _get_client()
    desc_part = f"\nDescription: {description}" if description else ""
    deadline_part = f"\nDeadline: {deadline.isoformat()}" if deadline else "\nDeadline: not set"
    today = date.today().isoformat()

    prompt = f"""Suggest an appropriate priority level for this task.

Today's date: {today}
Task title: {title}{desc_part}{deadline_part}

Priority levels:
- low: non-urgent, can be done anytime
- medium: should be done soon, moderate importance
- high: urgent or very important, needs immediate attention

Respond with JSON:
{{"priority": "<low|medium|high>", "reasoning": "<brief explanation>"}}"""

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=256,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    data = _parse_json(raw)
    return PrioritySuggestion(priority=Priority(data["priority"]), reasoning=data["reasoning"])


async def summarize_workload(tasks: list[Task]) -> WorkloadSummary:
    client = _get_client()
    today = date.today()

    overdue = [t for t in tasks if t.deadline and t.deadline < today and t.status != "done"]
    upcoming_7d = [
        t for t in tasks
        if t.deadline and today <= t.deadline <= date.fromordinal(today.toordinal() + 7)
    ]

    distribution = {"low": 0, "medium": 0, "high": 0}
    for t in tasks:
        distribution[t.priority.value] += 1

    tasks_text = "\n".join(
        f"- [{t.priority.value.upper()}] {t.title} | status: {t.status.value}"
        + (f" | deadline: {t.deadline}" if t.deadline else "")
        for t in tasks[:30]
    )

    prompt = f"""Analyze the user's current workload and provide a concise natural language summary.

Today: {today.isoformat()}
Active tasks ({len(tasks)} total):
{tasks_text if tasks_text else "No active tasks"}

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

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()
    data = _parse_json(raw)
    return WorkloadSummary(**data)


def _parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {text[:200]}")
