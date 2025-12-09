from sqlalchemy import Column, Integer, String, DateTime, Float, Text, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class ApiLog(Base):
    """Logs for API requests"""
    __tablename__ = "api_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(255), index=True)
    method = Column(String(10))
    status_code = Column(Integer)
    response_time_ms = Column(Float)
    request_params = Column(JSON)
    user_ip = Column(String(45))
    user_agent = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class PortfolioAnalysisLog(Base):
    """Logs for portfolio analysis requests"""
    __tablename__ = "portfolio_analysis_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    stocks = Column(String(255), index=True)
    period = Column(String(10))
    start_date = Column(String(20))
    metrics = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class TestResult(Base):
    """Test results (pytest, stress test, load test)"""
    __tablename__ = "test_results"
    
    id = Column(Integer, primary_key=True, index=True)
    test_type = Column(String(50), index=True)  # 'pytest', 'stress', 'load'
    test_name = Column(String(255))
    status = Column(String(20))  # 'passed', 'failed', 'error'
    duration_seconds = Column(Float)
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class SystemMetric(Base):
    """System metrics and trends"""
    __tablename__ = "system_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    metric_type = Column(String(50), index=True)  # 'cpu', 'memory', 'api_latency', 'error_rate'
    value = Column(Float)
    meta_data = Column(JSON)  # Changed from 'metadata' to 'meta_data' (metadata is reserved in SQLAlchemy)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

