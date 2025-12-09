from fastapi import APIRouter
from app.api import portfolio, dashboard

api_router = APIRouter()

api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])


