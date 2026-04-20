import uuid
from datetime import datetime, date
from sqlalchemy import String, Text, Enum, DateTime, Date, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db.database import Base
import enum


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Status(str, enum.Enum):
    waiting = "waiting"
    in_progress = "in_progress"
    done = "done"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[Priority] = mapped_column(Enum(Priority), nullable=False, default=Priority.medium)
    status: Mapped[Status] = mapped_column(Enum(Status), nullable=False, default=Status.waiting)
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
