from fastapi import APIRouter
from app.api.v1.endpoints.tasks import router as tasks_router
from app.api.v1.endpoints.llm import router as llm_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(tasks_router)
api_router.include_router(llm_router)
