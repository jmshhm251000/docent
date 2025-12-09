from sqlalchemy.orm import Session
from app.models import ApiLog, PortfolioAnalysisLog, TestResult, SystemMetric
from typing import Dict, Any, Optional
from datetime import datetime


class LoggingService:
    """Service for logging various events to PostgreSQL"""
    
    def log_api_request(
        self,
        db: Session,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: float,
        request_params: Optional[Dict[str, Any]] = None,
        user_ip: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log API request"""
        log = ApiLog(
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            request_params=request_params or {},
            user_ip=user_ip,
            user_agent=user_agent
        )
        db.add(log)
        db.commit()
        return log
    
    def log_portfolio_analysis(
        self,
        db: Session,
        stocks: list,
        period: str,
        start_date: Optional[str],
        metrics: Optional[Dict[str, Any]] = None
    ):
        """Log portfolio analysis request"""
        log = PortfolioAnalysisLog(
            stocks=",".join(stocks),
            period=period,
            start_date=start_date,
            metrics=metrics or {}
        )
        db.add(log)
        db.commit()
        return log
    
    def log_test_result(
        self,
        db: Session,
        test_type: str,
        test_name: str,
        status: str,
        duration_seconds: float,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log test result"""
        log = TestResult(
            test_type=test_type,
            test_name=test_name,
            status=status,
            duration_seconds=duration_seconds,
            details=details or {}
        )
        db.add(log)
        db.commit()
        return log
    
    def log_system_metric(
        self,
        db: Session,
        metric_type: str,
        value: float,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log system metric"""
        log = SystemMetric(
            metric_type=metric_type,
            value=value,
            meta_data=metadata or {}  # Changed to meta_data (metadata is reserved in SQLAlchemy)
        )
        db.add(log)
        db.commit()
        return log
    
    def get_recent_api_logs(self, db: Session, limit: int = 100):
        """Get recent API logs"""
        return db.query(ApiLog).order_by(ApiLog.created_at.desc()).limit(limit).all()
    
    def get_test_results(self, db: Session, test_type: Optional[str] = None, limit: int = 100):
        """Get test results"""
        query = db.query(TestResult)
        if test_type:
            query = query.filter(TestResult.test_type == test_type)
        return query.order_by(TestResult.created_at.desc()).limit(limit).all()
    
    def get_system_metrics(
        self,
        db: Session,
        metric_type: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000
    ):
        """Get system metrics"""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        query = db.query(SystemMetric).filter(SystemMetric.created_at >= cutoff)
        if metric_type:
            query = query.filter(SystemMetric.metric_type == metric_type)
        return query.order_by(SystemMetric.created_at.desc()).limit(limit).all()
    
    def get_portfolio_analysis_stats(self, db: Session, days: int = 30):
        """Get portfolio analysis statistics"""
        from datetime import timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        
        return db.query(PortfolioAnalysisLog).filter(
            PortfolioAnalysisLog.created_at >= cutoff
        ).all()

