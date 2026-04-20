# AI Task Manager

Интеллектуальный менеджер задач с ИИ-ассистентом. Jira-подобный интерфейс: канбан-доска с drag & drop, бэклог, детальная карточка задачи и полный набор LLM-функций на базе OpenAI GPT-4o-mini.

---

## 1. Реализованные функции

### Управление задачами
| Функция | Описание |
|---------|----------|
| CRUD | Создание, просмотр, редактирование, удаление задач |
| Фильтрация | По статусу, приоритету, сроку; полнотекстовый поиск |
| Детальная карточка | Slide-in панель с полными данными; смена статуса в один клик |
| Бэклог | Таблица с hover-действиями, кликабельными заголовками |
| Канбан | Три колонки; drag & drop меняет статус при перетаскивании |

### LLM-функции (GPT-4o-mini)
| Функция | Описание |
|---------|----------|
| Категоризация | Автоматическое определение тега/категории задачи |
| Приоритизация | Рекомендация приоритета с объяснением |
| Декомпозиция | Разбивка на 3–7 конкретных подзадач |
| Сводка нагрузки | Анализ всего бэклога: просрочки, дедлайны, баланс приоритетов |

### Продвинутые функции
| Функция | Реализация |
|---------|-----------|
| **Streaming LLM** | SSE-эндпоинт; текст сводки стримится токен за токеном, UI обновляется в реальном времени с курсором ▌ |
| **Кеш LLM-ответов** | In-memory TTL-кеш (5 мин); повторный запрос с теми же данными — мгновенный ответ без вызова OpenAI |
| **Дедупликация** | `asyncio.Future`-based: N одновременных запросов с одним ключом → ровно 1 вызов OpenAI, остальные ждут результата |
| **Background queue** | `asyncio.Queue`-воркер; при любой мутации задачи кеш инвалидируется и сводка нагрузки пересчитывается в фоне |

---

## 2. Стек технологий

**Backend**
- Python 3.11+ · FastAPI 0.136 · Uvicorn 0.44
- SQLAlchemy 2.0 async · asyncpg · PostgreSQL 14+
- Alembic — версионирование схемы БД
- Pydantic Settings v2 — централизованная конфигурация, нет хардкода
- OpenAI SDK 2.x (`AsyncOpenAI`) — неблокирующие вызовы + streaming

**Frontend**
- React 19 · TypeScript · Vite 8
- TanStack Query v5 — кеш запросов, дедупликация на уровне клиента
- @dnd-kit/core — drag & drop на канбане
- Axios · date-fns · lucide-react
- Pure CSS (именованные классы в стиле Jira, без Tailwind-утилит)

---

## 3. Структура проекта

```
ai_task_manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings — единый источник конфига
│   │   │   ├── cache.py            # In-memory TTL-кеш + asyncio-дедупликация
│   │   │   └── background_queue.py # asyncio background worker
│   │   ├── db/
│   │   │   └── database.py         # Async engine, session factory
│   │   ├── models/task.py          # SQLAlchemy ORM (Priority/Status enum)
│   │   ├── schemas/                # Pydantic схемы запросов/ответов
│   │   ├── repositories/           # Слой доступа к данным
│   │   ├── services/
│   │   │   └── llm_service.py      # AsyncOpenAI: обычные вызовы + streaming
│   │   ├── api/v1/endpoints/
│   │   │   ├── tasks.py            # CRUD + триггер фонового пересчёта
│   │   │   └── llm.py              # LLM endpoints + SSE streaming + /cache/stats
│   │   └── main.py                 # FastAPI app, lifespan (DB init + BG queue)
│   ├── alembic/versions/           # Миграции схемы БД
│   ├── fixtures/seed.py            # 10 тестовых задач
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── api/                    # Axios-клиент + llmApi
│       ├── types/task.ts           # TypeScript типы
│       ├── components/
│       │   ├── KanbanBoard.tsx     # Drag & drop (@dnd-kit)
│       │   ├── TaskDetail.tsx      # Slide-in панель деталей
│       │   ├── WorkloadSummary.tsx # SSE streaming, EventSource
│       │   ├── TaskForm.tsx        # Модальная форма
│       │   ├── LLMPanel.tsx        # ИИ-ассистент (3 режима)
│       │   └── ...
│       └── index.css               # Jira-стиль, именованные CSS-классы
├── start_backend.bat
├── start_frontend.bat
└── venv/                           # Python virtualenv (создаётся вручную)
```

---

## 4. Настройка среды

### Требования
- **Python 3.11+** — `python --version`
- **Node.js 18+** — `node --version`
- **PostgreSQL 14+** — должен быть запущен локально

---

### Шаг 1 — Создать базу данных PostgreSQL

Подключитесь к PostgreSQL и выполните:
```sql
CREATE DATABASE ai_task_manager;
```

С помощью psql:
```bash
psql -U postgres -c "CREATE DATABASE ai_task_manager;"
```

---

### Шаг 2 — Создать виртуальное окружение Python

> **Важно:** venv не входит в репозиторий (в `.gitignore`). Его нужно создать вручную один раз.

```bash
# Из корня проекта
python -m venv venv
```

Активация:
```bash
# Windows (CMD / PowerShell)
venv\Scripts\activate

# Windows (Git Bash / MSYS2)
source venv/Scripts/activate

# Linux / macOS
source venv/bin/activate
```

После активации в строке появится префикс `(venv)`.

---

### Шаг 3 — Установить зависимости backend

```bash
# venv должен быть активирован
pip install -r backend/requirements.txt
```

Проверить установку:
```bash
pip show fastapi openai sqlalchemy
```

---

### Шаг 4 — Переменные окружения

```bash
cp backend/.env.example backend/.env
```

Отредактировать `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/ai_task_manager
OPENAI_API_KEY=sk-...

# Опциональные параметры (можно не указывать — используются значения по умолчанию)
# OPENAI_MODEL=gpt-4o-mini
# DEBUG=false
```

Полный список переменных:

| Переменная | Обязательна | По умолчанию | Описание |
|------------|-------------|--------------|----------|
| `DATABASE_URL` | **Да** | — | PostgreSQL DSN с asyncpg-драйвером |
| `OPENAI_API_KEY` | **Да** (для LLM) | — | API ключ OpenAI |
| `OPENAI_MODEL` | Нет | `gpt-4o-mini` | Модель OpenAI |
| `CORS_ORIGINS` | Нет | `["http://localhost:5173", ...]` | Разрешённые origins |
| `DEBUG` | Нет | `false` | SQL-лог SQLAlchemy |

> **Без `OPENAI_API_KEY`** приложение полностью работает — CRUD, фильтрация, drag & drop. LLM-функции вернут `503`.

---

### Шаг 5 — Применить миграции Alembic

```bash
cd backend
alembic upgrade head
cd ..
```

Если таблицы уже существуют (например, после `init_db`):
```bash
cd backend
alembic stamp 05e3f3f9bc4b   # пометить как применённую без выполнения
cd ..
```

---

### Шаг 6 — Загрузить тестовые данные (опционально)

```bash
cd backend
set PYTHONPATH=.           # Windows CMD
# export PYTHONPATH=.      # Git Bash / Linux

python fixtures/seed.py             # добавить 10 задач
python fixtures/seed.py --clear     # очистить и добавить заново
cd ..
```

---

### Шаг 7 — Установить зависимости frontend

```bash
cd frontend
npm install
cd ..
```

---

## 5. Запуск

### Backend (порт 8003)

```bash
# Windows — готовый скрипт (venv активировать не нужно, путь прописан явно)
start_backend.bat

# Или вручную (venv должен быть активирован)
cd backend
set PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

Проверка:
```bash
curl http://localhost:8003/health
# {"status":"ok","version":"1.0.0"}
```

### Frontend (порт 5173)

```bash
# Windows — готовый скрипт
start_frontend.bat

# Или вручную
cd frontend
npm run dev
```

### Открыть в браузере

| Адрес | Описание |
|-------|----------|
| **http://localhost:5173** | Основное приложение |
| http://localhost:8003/docs | Swagger UI (API документация) |
| http://localhost:8003/api/v1/llm/cache/stats | Статистика LLM-кеша |

---

## 6. API

### Задачи

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/tasks` | Список задач (фильтры: `status`, `priority`, `search`, `deadline_before`) |
| POST | `/api/v1/tasks` | Создать задачу |
| GET | `/api/v1/tasks/{id}` | Получить задачу |
| PATCH | `/api/v1/tasks/{id}` | Обновить задачу |
| DELETE | `/api/v1/tasks/{id}` | Удалить задачу |

### LLM

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/v1/llm/tasks/{id}/categorize` | Предложить категорию (кеш 5 мин, дедупликация) |
| POST | `/api/v1/llm/tasks/{id}/decompose` | Разбить на подзадачи (кеш 5 мин, дедупликация) |
| POST | `/api/v1/llm/tasks/{id}/suggest-priority` | Предложить приоритет (кеш 5 мин, дедупликация) |
| GET | `/api/v1/llm/workload-summary` | Сводка нагрузки (кеш, дедупликация) |
| GET | `/api/v1/llm/workload-summary/stream` | **SSE:** сводка потоком токенов |
| GET | `/api/v1/llm/cache/stats` | Статистика кеша (debug) |

### Alembic

```bash
cd backend
alembic upgrade head      # применить все миграции
alembic downgrade -1      # откатить последнюю
alembic current           # текущее состояние
alembic revision --autogenerate -m "описание"  # новая миграция после изменения моделей
```

---

## 7. Архитектурные решения

### Разделение ответственности (Clean Architecture)

```
api/           ← HTTP: роутеры, валидация, статус-коды
repositories/  ← Доступ к данным, SQL (изолирован от HTTP)
services/      ← Бизнес-логика: LLM, prompt engineering
models/        ← SQLAlchemy ORM
schemas/       ← Pydantic: сериализация / валидация
core/          ← Инфраструктура: конфиг, кеш, очередь
```

Каждый слой знает только о нижестоящем. Роутеры не содержат SQL. Репозитории не знают про HTTP.

### AsyncOpenAI вместо синхронного SDK

Исходный код использовал синхронный `OpenAI(...)` внутри `async`-функций — это блокировало event loop на время HTTP-запроса к OpenAI (3–10 секунд). Заменён на `AsyncOpenAI(...)` с `await` — все вызовы неблокирующие.

### Pydantic Settings v2

Весь конфиг в одном файле `app/core/config.py`. Нет `os.getenv()` или `load_dotenv()` в других модулях. Смена источника (файл / env-переменные / secrets) требует правки одного места.

### LLM-кеш с asyncio-дедупликацией (`app/core/cache.py`)

Паттерн «cache-aside» с защитой от thundering herd:
```
Cache hit          → вернуть немедленно (без LLM)
Miss + in-flight   → await asyncio.shield(existing_future)  ← только 1 LLM вызов
Miss + fresh start → вызвать LLM, закешировать, разбудить ожидающих
```

### Background queue (`app/core/background_queue.py`)

`asyncio.Queue` + одиночный воркер-корутина. При мутации задачи:
1. Кеш сводки инвалидируется
2. В очередь добавляется job `workload-recompute` (дубликаты дропаются)
3. Воркер пересчитывает сводку и сохраняет в кеш
4. Следующий запрос пользователя → мгновенный ответ из кеша

### SSE Streaming (`GET /workload-summary/stream`)

- Статистика (overdue, distribution) вычисляется **локально** — без LLM
- LLM генерирует только текст сводки; стримится токен за токеном
- Cache hit → один `done`-event без `token`-событий (мгновенно)
- Frontend: `EventSource` API + бейдж `⚡ из кеша` при кешированном ответе

### Alembic для миграций

Схема БД управляется только через миграции. `init_db()` (`metadata.create_all`) оставлен как fallback при первом запуске, но в нормальном потоке используется `alembic upgrade head`.

### Drag & Drop (@dnd-kit/core)

`PointerSensor` с `activationConstraint: { distance: 8 }` — клик по карточке (<8px движения) открывает детальную панель; перетаскивание (≥8px) меняет статус задачи. Без конфликта между click и drag.

### CSS без Tailwind-утилит

Tailwind v4 подключён, но все стили — именованные CSS-классы (`.kanban-card`, `.detail-panel`, `.lozenge-done`). Причина: Tailwind v4 + Vite 8 не генерировал utility-классы стабильно для динамических `className`. Семантические классы читаемее в DevTools.

---

## 8. Известные ограничения

| Проблема | Детали |
|---------|--------|
| **In-memory кеш** | Кеш живёт в памяти процесса и сбрасывается при рестарте. При горизонтальном масштабировании (несколько воркеров) каждый воркер имеет свой кеш |
| **Нет аутентификации** | Данные общие для всех клиентов. Вне скоупа ТЗ |
| **Нет пагинации в UI** | Backend поддерживает `offset`/`limit`, фронтенд загружает все задачи за один запрос |
| **Один воркер очереди** | Background queue однопоточный — при длинном LLM-запросе следующие jobs ждут |
| **PostgreSQL enum при откате** | `alembic downgrade` не удаляет типы `priority_enum`/`status_enum` автоматически — нужен `DROP TYPE` вручную |

---

## 9. Что добавить при наличии времени

### Инфраструктура
- **Redis-кеш** — персистентный, работает при рестарте и между воркерами (`aiocache` + Redis backend)
- **ARQ или Celery** — полноценная очередь с retry, приоритетами, мониторингом
- **JWT-аутентификация** — изоляция данных между пользователями

### LLM / AI
- **Fake streaming из кеша** — плавный typewriter-эффект даже при cache hit
- **Инвалидация кеша по содержимому** — сейчас кеш задачи хранится 5 минут; при изменении задачи старая запись недостижима (разный хеш), но не удаляется явно
- **Стриминг декомпозиции** — показывать подзадачи по мере генерации

### UX
- **Инлайн-редактирование** в TaskDetail без открытия отдельной формы
- **Optimistic updates** — status меняется в UI мгновенно, без ожидания сервера
- **Push-уведомления** о приближающихся дедлайнах (Web Notifications API)
- **Горячие клавиши**: `N` — новая задача, `Esc` — закрыть панель, `/` — фокус поиска

### Технический долг
- Unit-тесты для `LLMCache`, `BackgroundQueue`, репозитория (pytest + pytest-asyncio)
- Integration-тесты с реальной тестовой БД и моком OpenAI
- Виртуализация длинных списков (`@tanstack/react-virtual`) при >500 задачах
