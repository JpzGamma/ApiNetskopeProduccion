from fastapi import APIRouter
from .endpoints import items

api_v1 = APIRouter(prefix="/api/v1")
api_v1.include_router(items.router)