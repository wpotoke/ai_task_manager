from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import Optional
from app.models.task import Task, Priority, Status
from app.schemas.task import TaskCreate, TaskUpdate
import uuid


class TaskRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: TaskCreate) -> Task:
        task = Task(
            id=str(uuid.uuid4()),
            **data.model_dump(exclude_none=False),
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def get_by_id(self, task_id: str) -> Optional[Task]:
        result = await self.db.execute(select(Task).where(Task.id == task_id))
        return result.scalar_one_or_none()

    async def get_all(
        self,
        status: Optional[Status] = None,
        priority: Optional[Priority] = None,
        search: Optional[str] = None,
        deadline_before: Optional[str] = None,
        offset: int = 0,
        limit: int = 100,
    ) -> tuple[list[Task], int]:
        query = select(Task)
        count_query = select(func.count()).select_from(Task)

        filters = []
        if status:
            filters.append(Task.status == status)
        if priority:
            filters.append(Task.priority == priority)
        if search:
            term = f"%{search}%"
            filters.append(or_(Task.title.ilike(term), Task.description.ilike(term)))
        if deadline_before:
            filters.append(Task.deadline <= deadline_before)

        if filters:
            from sqlalchemy import and_
            query = query.where(and_(*filters))
            count_query = count_query.where(and_(*filters))

        total_result = await self.db.execute(count_query)
        total = total_result.scalar_one()

        query = query.order_by(Task.created_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all(), total

    async def update(self, task: Task, data: TaskUpdate) -> Task:
        update_data = data.model_dump(exclude_none=True)
        for key, value in update_data.items():
            setattr(task, key, value)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete(self, task: Task) -> None:
        await self.db.delete(task)
        await self.db.commit()

    async def get_all_active(self) -> list[Task]:
        result = await self.db.execute(
            select(Task).where(Task.status != Status.done)
        )
        return result.scalars().all()
