from fastapi import APIRouter, Query, HTTPException, status, Depends
from fastapi import Request
from typing import List
from sqlalchemy.orm import Session
import time
from app.services.portfolio_service import PortfolioService
from app.services.logging_service import LoggingService
from app.services.rate_limiter import rate_limiter
from app.database import get_db

router = APIRouter()
portfolio_service = PortfolioService()
logging_service = LoggingService()


@router.get("/analyze")
async def analyze_portfolio(
    request: Request,
    stocks: str = Query(..., description="Comma-separated list of stock tickers (e.g., 'AAPL,MSFT,GOOGL')"),
    period: str = Query('10y', description="Period for data download (e.g., '10y', '5y', '1y'). Default is '10y'"),
    start_date: str = Query(None, description="Start date for analysis (YYYY-MM-DD format). Overrides period if provided."),
    db: Session = Depends(get_db)
):
    """
    Analyze portfolio performance using quantstats
    
    Args:
        stocks: Comma-separated list of stock tickers
        period: Period for data download (default: '10y')
        start_date: Optional start date for analysis (YYYY-MM-DD). Overrides period if provided.
        
    Returns:
        Portfolio analysis data including metrics, charts, and heatmap
    """
    start_time = time.time()
    try:
        # Rate limit API endpoint: 10 requests per minute per IP
        client_ip = request.client.host if request.client else "unknown"
        rate_limit_key = f"api:portfolio:analyze:{client_ip}"
        
        is_allowed, wait_time = rate_limiter.is_allowed(
            key=rate_limit_key,
            max_requests=10,
            window_seconds=60
        )
        
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Please wait {wait_time} seconds before trying again."
            )
        
        # Parse stock tickers
        stock_list = [s.strip().upper() for s in stocks.split(',') if s.strip()]
        
        if not stock_list:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one stock ticker is required"
            )
        
        if len(stock_list) > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 5 stocks allowed"
            )
        
        # Analyze portfolio
        result = portfolio_service.analyze_portfolio(stock_list, period=period, start_date=start_date)
        
        # Log the request
        response_time_ms = (time.time() - start_time) * 1000
        logging_service.log_api_request(
            db=db,
            endpoint="/api/portfolio/analyze",
            method="GET",
            status_code=200,
            response_time_ms=response_time_ms,
            request_params={"stocks": stocks, "period": period, "start_date": start_date},
            user_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        
        # Log portfolio analysis
        logging_service.log_portfolio_analysis(
            db=db,
            stocks=stock_list,
            period=period,
            start_date=start_date,
            metrics=result.get('metrics')
        )
        
        return result
        
    except ValueError as e:
        response_time_ms = (time.time() - start_time) * 1000
        logging_service.log_api_request(
            db=db,
            endpoint="/api/portfolio/analyze",
            method="GET",
            status_code=400,
            response_time_ms=response_time_ms,
            request_params={"stocks": stocks, "period": period, "start_date": start_date},
            user_ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent")
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error in portfolio analyze endpoint: {str(e)}")
        print(f"Traceback: {error_traceback}")
        
        response_time_ms = (time.time() - start_time) * 1000
        try:
            logging_service.log_api_request(
                db=db,
                endpoint="/api/portfolio/analyze",
                method="GET",
                status_code=500,
                response_time_ms=response_time_ms,
                request_params={"stocks": stocks, "period": period, "start_date": start_date},
                user_ip=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
        except Exception as log_error:
            print(f"Failed to log API request: {log_error}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing portfolio: {str(e)}"
        )


