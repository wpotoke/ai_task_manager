# AI Task Manager

Интеллектуальный менеджер задач с LLM-ассистентом. Позволяет управлять задачами и использовать возможности ИИ для категоризации, декомпозиции, приоритизации и анализа рабочей нагрузки.

## Реализованный функционал

| US | Функция | Статус |
|----|---------|--------|
| US-1 | CRUD задач (создание, чтение, обновление, удаление) | ✅ |
| US-2 | Фильтрация по статусу/приоритету/сроку, полнотекстовый поиск | ✅ |
| US-3 | LLM: умная категоризация задачи | ✅ |
| US-4 | LLM: декомпозиция задачи на подзадачи | ✅ |
| US-5 | LLM: предложение приоритета | ✅ |
| US-6 | LLM: сводка рабочей нагрузки | ✅ |

## Стек технологий

**Backend**
- Python 3.14 + FastAPI 0.136
- SQLAlchemy 2.0 (async) + aiosqlite (SQLite)
- Anthropic Python SDK (Claude Haiku)
- Pydantic v2

**Frontend**
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- TanStack Query v5
- Axios, date-fns, lucide-react

## Настройка окружения

### Требования
- Python 3.11+
- Node.js 18+

### Backend

```bash
# Создать виртуальное окружение (если нет)
python -m venv venv
venv\Scripts\activate  # Windows

# Установить зависимости
pip install -r backend/requirements.txt

# Настроить переменные окружения
cp backend/.env.example backend/.env
# Отредактировать backend/.env — вставить ANTHROPIC_API_KEY
```

### Frontend

```bash
cd frontend
npm install
```

## Запуск

**Backend** (порт 8001):
```bash
# Windows
start_backend.bat

# Или вручную
cd backend
set PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Frontend** (порт 5173):
```bash
# Windows
start_frontend.bat

# Или вручную
cd frontend
npm run dev
```

Открыть: http://localhost:5173

## Переменные окружения

| Переменная | Обязательна | Описание |
|------------|-------------|----------|
| `ANTHROPIC_API_KEY` | Да (для LLM) | API ключ Anthropic |
| `DATABASE_URL` | Нет | По умолчанию `sqlite+aiosqlite:///./tasks.db` |

> Без `ANTHROPIC_API_KEY` приложение работает в полном объёме — все CRUD операции и фильтрация доступны. LLM-функции вернут ошибку 503.

## API

Документация Swagger: http://localhost:8001/docs

### Основные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/tasks` | Список задач (фильтры: status, priority, search, deadline_before) |
| POST | `/api/v1/tasks` | Создать задачу |
| GET | `/api/v1/tasks/{id}` | Получить задачу |
| PATCH | `/api/v1/tasks/{id}` | Обновить задачу |
| DELETE | `/api/v1/tasks/{id}` | Удалить задачу |
| POST | `/api/v1/llm/tasks/{id}/categorize` | LLM: предложить категорию |
| POST | `/api/v1/llm/tasks/{id}/decompose` | LLM: декомпозиция на подзадачи |
| POST | `/api/v1/llm/tasks/{id}/suggest-priority` | LLM: предложить приоритет |
| GET | `/api/v1/llm/workload-summary` | LLM: сводка нагрузки |

## Архитектурные решения

**Разделение ответственности (Clean Architecture)**
```
api/           ← HTTP слой: роутеры, валидация входных данных
repositories/  ← Доступ к данным, абстракция над БД
services/      ← Бизнес-логика LLM (prompt engineering)
models/        ← SQLAlchemy ORM модели
schemas/       ← Pydantic схемы запросов/ответов
```

**Async first**: весь backend асинхронный (FastAPI + async SQLAlchemy + aiosqlite).

**Prompt Engineering**: промпты в `llm_service.py` структурированы с системным контекстом, примерами формата вывода (JSON schema) и обработкой невалидных ответов LLM.

**Фильтрация на стороне сервера**: все фильтры передаются в SQL-запрос через WHERE, поиск через `ILIKE`.

**Версионирование API**: `/api/v1/` — готово к добавлению v2 без breaking changes.

## Известные ограничения

- SQLite не подходит для продакшена с высокой нагрузкой — легко заменить на PostgreSQL, изменив `DATABASE_URL`
- LLM-вызовы синхронные (Anthropic SDK не поддерживает async без обёртки) — при большой нагрузке стоит добавить `asyncio.to_thread` или очередь задач
- Нет аутентификации пользователей (вне скоупа ТЗ)
- Нет пагинации в UI (бэкенд поддерживает `offset`/`limit`)

## Возможные улучшения

- Заменить SQLite на PostgreSQL
- Добавить streaming LLM-ответов через SSE
- Авторизация и мультипользовательность
- Drag & Drop для сортировки задач
- Kanban-вид (столбцы по статусам)
- Push-уведомления о дедлайнах
- Экспорт задач в CSV/PDF
