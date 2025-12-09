from fastapi import APIRouter, Depends, HTTPException, status
from fastapi import Request
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.services.logging_service import LoggingService
from app.middleware.auth import require_internal_access, api_key_header
from app.models import ApiLog, TestResult, SystemMetric, PortfolioAnalysisLog
from sqlalchemy import func

router = APIRouter()
logging_service = LoggingService()


@router.get("/test-results")
async def get_test_results(
    request: Request,
    test_type: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Get test results (pytest, stress test, load test) - Internal use only"""
    require_internal_access(request, api_key)
    
    results = logging_service.get_test_results(db, test_type=test_type, limit=limit)
    
    return {
        "test_results": [
            {
                "id": r.id,
                "test_type": r.test_type,
                "test_name": r.test_name,
                "status": r.status,
                "duration_seconds": r.duration_seconds,
                "details": r.details,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in results
        ]
    }


@router.get("/api-metrics")
async def get_api_metrics(
    request: Request,
    hours: int = 24,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Get API metrics and statistics - Internal use only"""
    require_internal_access(request, api_key)
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    # Get API logs
    logs = db.query(ApiLog).filter(ApiLog.created_at >= cutoff).all()
    
    # Calculate statistics
    total_requests = len(logs)
    successful_requests = len([l for l in logs if 200 <= l.status_code < 300])
    failed_requests = len([l for l in logs if l.status_code >= 400])
    
    avg_response_time = (
        sum(l.response_time_ms for l in logs) / total_requests
        if total_requests > 0 else 0
    )
    
    # Group by endpoint
    endpoint_stats = {}
    for log in logs:
        if log.endpoint not in endpoint_stats:
            endpoint_stats[log.endpoint] = {
                "count": 0,
                "avg_response_time": 0,
                "error_count": 0
            }
        endpoint_stats[log.endpoint]["count"] += 1
        endpoint_stats[log.endpoint]["avg_response_time"] += log.response_time_ms
        if log.status_code >= 400:
            endpoint_stats[log.endpoint]["error_count"] += 1
    
    for endpoint in endpoint_stats:
        count = endpoint_stats[endpoint]["count"]
        endpoint_stats[endpoint]["avg_response_time"] = endpoint_stats[endpoint]["avg_response_time"] / count
    
    return {
        "total_requests": total_requests,
        "successful_requests": successful_requests,
        "failed_requests": failed_requests,
        "success_rate": (successful_requests / total_requests * 100) if total_requests > 0 else 0,
        "avg_response_time_ms": round(avg_response_time, 2),
        "endpoint_stats": endpoint_stats,
        "period_hours": hours
    }


@router.get("/system-metrics")
async def get_system_metrics(
    request: Request,
    metric_type: Optional[str] = None,
    hours: int = 24,
    limit: int = 1000,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Get system metrics - Internal use only"""
    require_internal_access(request, api_key)
    
    metrics = logging_service.get_system_metrics(
        db, metric_type=metric_type, hours=hours, limit=limit
    )
    
    return {
        "metrics": [
            {
                "id": m.id,
                "metric_type": m.metric_type,
                "value": m.value,
                "metadata": m.meta_data,
                "created_at": m.created_at.isoformat() if m.created_at else None
            }
            for m in metrics
        ]
    }


@router.get("/trends")
async def get_trends(
    request: Request,
    days: int = 30,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Get trends and analytics - Internal use only"""
    require_internal_access(request, api_key)
    
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Portfolio analysis trends
    portfolio_logs = db.query(PortfolioAnalysisLog).filter(
        PortfolioAnalysisLog.created_at >= cutoff
    ).all()
    
    # Most popular stocks
    stock_counts = {}
    for log in portfolio_logs:
        stocks = log.stocks.split(',')
        for stock in stocks:
            stock_counts[stock] = stock_counts.get(stock, 0) + 1
    
    popular_stocks = sorted(
        stock_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    # API usage trends by day
    api_logs = db.query(
        func.date(ApiLog.created_at).label('date'),
        func.count(ApiLog.id).label('count'),
        func.avg(ApiLog.response_time_ms).label('avg_response_time')
    ).filter(
        ApiLog.created_at >= cutoff
    ).group_by(
        func.date(ApiLog.created_at)
    ).order_by(
        func.date(ApiLog.created_at)
    ).all()
    
    daily_trends = [
        {
            "date": str(row.date),
            "request_count": row.count,
            "avg_response_time_ms": round(row.avg_response_time, 2) if row.avg_response_time else 0
        }
        for row in api_logs
    ]
    
    return {
        "popular_stocks": [{"stock": stock, "count": count} for stock, count in popular_stocks],
        "total_portfolio_analyses": len(portfolio_logs),
        "daily_trends": daily_trends,
        "period_days": days
    }


@router.post("/test-result")
async def log_test_result(
    request: Request,
    test_type: str,
    test_name: str,
    status: str,
    duration_seconds: float,
    details: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Log a test result - Internal use only"""
    require_internal_access(request, api_key)
    
    log = logging_service.log_test_result(
        db=db,
        test_type=test_type,
        test_name=test_name,
        status=status,
        duration_seconds=duration_seconds,
        details=details or {}
    )
    
    return {
        "id": log.id,
        "message": "Test result logged successfully"
    }


@router.post("/system-metric")
async def log_system_metric(
    request: Request,
    metric_type: str,
    value: float,
    metadata: Optional[Dict[str, Any]] = None,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Log a system metric - Internal use only"""
    require_internal_access(request, api_key)
    
    log = logging_service.log_system_metric(
        db=db,
        metric_type=metric_type,
        value=value,
        metadata=metadata or {}
    )
    
    return {
        "id": log.id,
        "message": "System metric logged successfully"
    }

