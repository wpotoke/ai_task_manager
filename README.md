# AI Task Manager

Интеллектуальный менеджер задач с ИИ-ассистентом на базе OpenAI GPT-4o-mini. Jira-подобный интерфейс с канбан-доской, бэклогом, drag & drop и полным набором LLM-функций.

---

## 1. Реализованные функции

### Управление задачами (CRUD)
- Создание задач с названием, описанием, приоритетом, статусом, сроком и категорией
- Редактирование и удаление задач (с диалогом подтверждения — без `window.confirm`)
- Фильтрация по статусу, приоритету, сроку и полнотекстовый поиск
- Детальная карточка задачи (slide-in панель) с отображением всех полей и смены статуса в один клик

### Представления
- **Бэклог** — таблица с кликабельными заголовками, сортировкой, hover-действиями
- **Канбан-доска** — три колонки (К выполнению / В работе / Готово) с drag & drop между статусами

### LLM-функции (GPT-4o-mini)
| Функция | Описание |
|---------|----------|
| Категоризация | Автоматическое определение категории задачи |
| Приоритизация | Рекомендация приоритета с объяснением |
| Декомпозиция | Разбивка на 3–7 подзадач с описаниями |
| Сводка нагрузки | Анализ всего бэклога: просроченные, ближайшие дедлайны, баланс приоритетов |

### Продвинутые функции (частично)
| Функция | Статус | Примечание |
|---------|--------|------------|
| Клиентское кеширование | ✅ | TanStack Query: `staleTime: 30s`, ленивая загрузка сводки |
| Дедупликация запросов | ✅ | TanStack Query автоматически дедуплицирует по `queryKey` |
| Streaming LLM | ❌ | Не реализован — вызов синхронный через `json_object` mode |
| Фоновая очередь | ❌ | Нет Celery/ARQ — LLM блокирует event loop в `asyncio.to_thread` |

---

## 2. Настройка среды

### Требования
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Шаг 1 — Создать базу данных

```sql
CREATE DATABASE ai_task_manager;
```

### Шаг 2 — Виртуальное окружение и зависимости backend

```bash
# Из корня проекта
python -m venv venv

# Активация (Windows)
venv\Scripts\activate
# Активация (Linux/macOS)
source venv/bin/activate

pip install -r backend/requirements.txt
```

### Шаг 3 — Переменные окружения

```bash
cp backend/.env.example backend/.env
```

Отредактировать `backend/.env`:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/ai_task_manager
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
DEBUG=false
```

Полный список переменных:

| Переменная | Обязательна | По умолчанию | Описание |
|------------|-------------|--------------|----------|
| `DATABASE_URL` | Да | — | PostgreSQL DSN с asyncpg драйвером |
| `OPENAI_API_KEY` | Да (LLM) | — | API ключ OpenAI |
| `OPENAI_MODEL` | Нет | `gpt-4o-mini` | Модель OpenAI |
| `CORS_ORIGINS` | Нет | `["http://localhost:5173", ...]` | Список разрешённых origins |
| `APP_TITLE` | Нет | `AI Task Manager` | Заголовок в Swagger |
| `DEBUG` | Нет | `false` | Включает SQL-лог SQLAlchemy |

> Без `OPENAI_API_KEY` всё приложение работает — CRUD и фильтрация полностью доступны. LLM-функции вернут `503 Service Unavailable`.

### Шаг 4 — Применить миграции Alembic

```bash
cd backend
alembic upgrade head
```

### Шаг 5 — Загрузить тестовые данные (опционально)

```bash
cd backend
PYTHONPATH=. python fixtures/seed.py           # добавить 10 задач
PYTHONPATH=. python fixtures/seed.py --clear   # очистить и добавить заново
```

### Шаг 6 — Зависимости frontend

```bash
cd frontend
npm install
```

---

## 3. Запуск приложения

### Backend (порт 8002)

```bash
# Windows — готовый скрипт
start_backend.bat

# Или вручную
cd backend
set PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### Frontend (порт 5173)

```bash
cd frontend
npm run dev
```

Открыть в браузере: **http://localhost:5173**

Swagger UI (API документация): **http://localhost:8002/docs**

### Таблица эндпоинтов

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/tasks` | Список задач (фильтры: `status`, `priority`, `search`, `deadline_before`) |
| POST | `/api/v1/tasks` | Создать задачу |
| GET | `/api/v1/tasks/{id}` | Получить задачу по ID |
| PATCH | `/api/v1/tasks/{id}` | Обновить задачу (частично) |
| DELETE | `/api/v1/tasks/{id}` | Удалить задачу |
| POST | `/api/v1/llm/tasks/{id}/categorize` | LLM: предложить категорию |
| POST | `/api/v1/llm/tasks/{id}/decompose` | LLM: разбить на подзадачи |
| POST | `/api/v1/llm/tasks/{id}/suggest-priority` | LLM: предложить приоритет |
| GET | `/api/v1/llm/workload-summary` | LLM: сводка рабочей нагрузки |

---

## 4. Архитектурные решения

### Структура проекта

```
ai_task_manager/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py          # Pydantic Settings — единый источник конфигурации
│   │   ├── db/
│   │   │   └── database.py        # Async engine, session factory, Base
│   │   ├── models/task.py         # SQLAlchemy ORM (Priority/Status enum)
│   │   ├── schemas/               # Pydantic схемы для валидации запросов/ответов
│   │   ├── repositories/          # Слой доступа к данным (SQL-запросы изолированы)
│   │   ├── services/
│   │   │   └── llm_service.py     # Prompt engineering, вызовы OpenAI
│   │   └── api/v1/                # FastAPI роутеры
│   ├── alembic/                   # Миграции схемы БД
│   │   └── versions/
│   ├── fixtures/seed.py           # Тестовые данные (10 задач)
│   └── .env.example
└── frontend/
    └── src/
        ├── api/tasks.ts           # Axios-клиент для всех эндпоинтов
        ├── types/task.ts          # TypeScript типы
        ├── components/
        │   ├── Sidebar.tsx        # Навигационная панель
        │   ├── BacklogView.tsx    # Табличный вид бэклога
        │   ├── KanbanBoard.tsx    # Канбан с drag & drop (@dnd-kit)
        │   ├── TaskDetail.tsx     # Slide-in панель деталей задачи
        │   ├── TaskForm.tsx       # Модальная форма создания/редактирования
        │   ├── LLMPanel.tsx       # Панель LLM-ассистента (3 режима)
        │   ├── WorkloadSummary.tsx # Сворачиваемая сводка нагрузки
        │   ├── FilterBar.tsx      # Фильтры бэклога
        │   └── Badge.tsx          # Иконки приоритетов, статусные лозенджи
        └── index.css              # Jira-стиль, именованные CSS-классы
```

### Ключевые решения

**Чистая архитектура backend**
Слои `api → repositories → services → models` с явными границами. Роутеры не знают про SQL; репозитории не знают про HTTP; сервисы не знают про транспорт. Это упрощает тестирование каждого слоя в изоляции.

**Pydantic Settings v2**
Весь конфиг централизован в `app/core/config.py`. Нет `os.getenv()` или `load_dotenv()` в других модулях. Смена источника конфига (файл / env / Vault) требует изменения одного файла.

**Async first**
FastAPI + async SQLAlchemy 2.0 + asyncpg — все операции с БД неблокирующие. Единственное исключение: вызов `OpenAI SDK` в `llm_service.py` синхронный (обоснование — см. раздел "Ограничения").

**Prompt Engineering**
Каждая LLM-функция имеет точную JSON-схему в промпте с примерами, что обеспечивает стабильный вывод. Используется `response_format={"type": "json_object"}` для надёжного парсинга. Реализован `_parse_json` с обработкой markdown-обёртки.

**Alembic для миграций**
Схема БД управляется только через миграции. `init_db()` (автосоздание таблиц через `metadata.create_all`) оставлен как fallback, но в продакшне используется `alembic upgrade head`.

**Drag & drop (@dnd-kit/core)**
Для Канбан-доски выбран `@dnd-kit` вместо `react-beautiful-dnd` (заброшен) и `react-dnd` (сложная конфигурация). `PointerSensor` с `activationConstraint: { distance: 8 }` позволяет кликать по карточке (открытие деталей) без случайного запуска drag.

**Клиентское кеширование (TanStack Query)**
- Список задач: `staleTime: 30s` — не рефетчит при быстрых переходах между видами
- Сводка нагрузки: `enabled: false` — загружается только по запросу пользователя, результат кешируется на сессию
- Автодедупликация: одновременные запросы с одинаковым `queryKey` объединяются в один HTTP-запрос

**CSS без utility-классов**
Tailwind v4 подключён, но все стили написаны через именованные CSS-классы (`.kanban-card`, `.lozenge-done`, `.detail-panel` и т.д.). Причина: Tailwind v4 с Vite 8 не генерировал утилиты стабильно для динамических className. Семантические классы читаемее в DevTools и проще переиспользовать.

---

## 5. Известные проблемы и ограничения

**LLM-вызовы блокируют event loop**
`OpenAI SDK` использует `httpx` синхронно внутри `async`-функции. При нескольких одновременных LLM-запросах это замедлит обработку обычных запросов к БД. Правильное решение — обернуть в `asyncio.to_thread()` или перейти на `AsyncOpenAI`.

**Нет streaming LLM-ответов**
Используется `response_format={"type": "json_object"}` который несовместим со streaming в OpenAI API (streaming не гарантирует валидный JSON до получения полного ответа). Для streaming потребуется изменить архитектуру LLM-слоя: отдельный endpoint с SSE и парсинг JSON после получения полного стрима.

**Нет фоновой очереди**
LLM-операции (декомпозиция, сводка нагрузки) могут занимать 3–10 секунд. Они выполняются прямо в HTTP-запросе. При таймаутах (nginx/proxy с 30s лимитом) длинные операции будут обрываться.

**Нет аутентификации**
Все данные общие для всех клиентов. Вне скоупа ТЗ, но критично для реального деплоя.

**Нет пагинации в UI**
Backend поддерживает `offset`/`limit`, но фронтенд загружает все задачи за один запрос. При > 500 задач появится деградация производительности рендеринга.

**PostgreSQL enum в Alembic**
При `alembic downgrade` типы `priority_enum` и `status_enum` не удаляются автоматически из-за зависимостей PostgreSQL. Добавлен `checkfirst=True` при создании, но ручная очистка через `DROP TYPE` может потребоваться при повторном `upgrade` после неполного `downgrade`.

---

## 6. Что добавить при наличии времени

### Критично для продакшна
- **`AsyncOpenAI` + `asyncio.to_thread`** — неблокирующие LLM-вызовы, корректная работа под нагрузкой
- **SSE streaming** — отдавать токены LLM по мере генерации (нужен отдельный endpoint и клиентский `EventSource`)
- **Фоновая обработка (ARQ/Celery)** — тяжёлые операции (сводка нагрузки по большому бэклогу) выполняются в воркерах, клиент получает task_id и поллит статус
- **Redis-кеш для LLM** — кешировать результат по хешу задачи: одинаковые запросы не уходят в OpenAI повторно
- **JWT-аутентификация** — мультипользовательность с изоляцией данных

### Улучшения UX
- **Инлайн-редактирование** в TaskDetail (без открытия отдельной формы)
- **Push-уведомления о дедлайнах** через Web Notifications API
- **Drag & drop в бэклоге** для переупорядочивания
- **Горячие клавиши** (N — новая задача, Esc — закрыть панель, / — поиск)
- **Экспорт** задач в CSV

### Технический долг
- Unit-тесты репозитория и LLM-сервиса (моки OpenAI + тестовая БД)
- `GET /api/v1/tasks/{id}` на фронте для обновления TaskDetail без полного рефетча
- Виртуализация списка (react-virtual) при большом количестве задач
- Optimistic updates для смены статуса без ожидания сервера
