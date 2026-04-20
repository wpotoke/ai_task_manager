"""
Seed script — loads fixture data into the database.

Usage:
    cd backend
    PYTHONPATH=. python fixtures/seed.py [--clear]

Flags:
    --clear   Delete all existing tasks before inserting fixtures.
"""

import asyncio
import sys
from datetime import date, timedelta

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, ".")  # allow running from backend/

from app.core.config import settings  # noqa: E402 — after sys.path patch
from app.db.database import AsyncSessionLocal, Base, engine
from app.models.task import Task, Priority, Status

TODAY = date.today()

FIXTURES: list[dict] = [
    {
        "title": "Настроить CI/CD пайплайн",
        "description": "Добавить GitHub Actions: lint, tests, build Docker-образа и деплой на staging.",
        "priority": Priority.high,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=3),
        "category": "DevOps",
    },
    {
        "title": "Написать unit-тесты для сервиса задач",
        "description": "Покрыть тестами TaskRepository и LLM-сервис с моками OpenAI.",
        "priority": Priority.high,
        "status": Status.in_progress,
        "deadline": TODAY + timedelta(days=5),
        "category": "Development",
    },
    {
        "title": "Обновить документацию API",
        "description": "Дополнить Swagger-описания для всех эндпоинтов, добавить примеры запросов.",
        "priority": Priority.medium,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=7),
        "category": "Documentation",
    },
    {
        "title": "Провести код-ревью PR #42",
        "description": None,
        "priority": Priority.medium,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=1),
        "category": "Review",
    },
    {
        "title": "Исправить баг с фильтрацией по дедлайну",
        "description": "При фильтрации deadline_before задачи без дедлайна не должны попадать в результат.",
        "priority": Priority.high,
        "status": Status.in_progress,
        "deadline": TODAY,
        "category": "Bug Fix",
    },
    {
        "title": "Добавить пагинацию на фронтенде",
        "description": "Реализовать бесконечную прокрутку или постраничную навигацию в TaskList.",
        "priority": Priority.medium,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=10),
        "category": "Development",
    },
    {
        "title": "Созвон с дизайнером по новому UI",
        "description": None,
        "priority": Priority.low,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=2),
        "category": "Meeting",
    },
    {
        "title": "Оптимизировать запросы к БД",
        "description": "Проверить EXPLAIN ANALYZE для списка задач, добавить недостающие индексы.",
        "priority": Priority.low,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=14),
        "category": "Development",
    },
    {
        "title": "Настроить мониторинг и алерты",
        "description": "Подключить Sentry для бэкенда и настроить алерты на 5xx ошибки.",
        "priority": Priority.medium,
        "status": Status.done,
        "deadline": TODAY - timedelta(days=2),
        "category": "DevOps",
    },
    {
        "title": "Написать E2E тесты",
        "description": "Playwright: сценарии создания, редактирования и удаления задачи.",
        "priority": Priority.low,
        "status": Status.waiting,
        "deadline": TODAY + timedelta(days=21),
        "category": "Development",
    },
]


async def seed(clear: bool = False) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        if clear:
            await session.execute(delete(Task))
            await session.commit()
            print("Cleared existing tasks.")

        import uuid
        for item in FIXTURES:
            task = Task(id=str(uuid.uuid4()), **item)
            session.add(task)

        await session.commit()
        print(f"Inserted {len(FIXTURES)} fixture tasks into '{settings.database_url.split('/')[-1]}'.")


if __name__ == "__main__":
    clear_flag = "--clear" in sys.argv
    asyncio.run(seed(clear=clear_flag))
