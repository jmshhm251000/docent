import quantstats as qs
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time
from app.services.cache_service import cache_service
from app.services.rate_limiter import rate_limiter


class PortfolioService:
    """Portfolio analysis service using quantstats"""
    
    def __init__(self):
        self.benchmark_ticker = 'SPY'
    
    def _get_cache_key(self, stocks: List[str], period: str, start_date: Optional[str]) -> str:
        """Generate cache key for portfolio analysis"""
        stocks_str = ",".join(sorted(stocks))
        return cache_service.generate_key("portfolio_analysis", stocks_str, period, start_date or "")
    
    def analyze_portfolio(self, stocks: List[str], period: str = '10y', start_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze portfolio performance using quantstats
        
        Args:
            stocks: List of stock tickers (e.g., ['AAPL', 'MSFT', 'GOOGL'])
            period: Period for data download (e.g., '10y', '5y', '1y'). Default is '10y'.
            start_date: Start date for analysis (YYYY-MM-DD format). If None, uses period parameter.
            
        Returns:
            Dictionary containing all portfolio metrics and chart data
        """
        if not stocks:
            raise ValueError("At least one stock ticker is required")
        
        # Check cache first
        cache_key = self._get_cache_key(stocks, period, start_date)
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return cached_result
        
        qs.extend_pandas()
        
        # Download returns for all stocks with specified period
        # Apply rate limiting: max 2 requests per second for yfinance
        returns_list = []
        valid_stocks = []
        
        for ticker in stocks:
            try:
                # Rate limit: 2 requests per second for yfinance API
                rate_limiter.wait_if_needed(
                    key="yfinance:download",
                    max_requests=2,
                    window_seconds=1
                )
                
                stock_returns = qs.utils.download_returns(ticker, period=period)
                if stock_returns is not None and not stock_returns.empty:
                    returns_list.append(stock_returns)
                    valid_stocks.append(ticker)
            except Exception as e:
                print(f"Warning: Failed to download returns for {ticker}: {e}")
                continue
        
        if not returns_list:
            raise ValueError("Failed to download returns for any stock")
        
        # Combine all stock returns
        returns = pd.concat(returns_list, axis=1)
        returns.columns = valid_stocks
        
        # Create equal-weighted portfolio
        returns['Combined'] = returns.mean(axis=1)
        
        # Download benchmark (SPY) returns with same period
        try:
            # Rate limit: 2 requests per second for yfinance API
            rate_limiter.wait_if_needed(
                key="yfinance:download",
                max_requests=2,
                window_seconds=1
            )
            
            benchmark_returns = qs.utils.download_returns(self.benchmark_ticker, period=period)
        except Exception as e:
            print(f"Warning: Failed to download benchmark returns: {e}")
            # Create dummy benchmark if download fails
            benchmark_returns = returns['Combined'].copy() * 0.9
        
        # Align dates
        common_dates = returns.index.intersection(benchmark_returns.index)
        if len(common_dates) == 0:
            raise ValueError("No common dates between portfolio and benchmark")
        
        portfolio_returns = returns.loc[common_dates, 'Combined']
        benchmark_returns = benchmark_returns.loc[common_dates]
        
        # Filter by start_date if provided (overrides period)
        if start_date:
            try:
                start = pd.Timestamp(start_date)
                portfolio_returns = portfolio_returns[portfolio_returns.index >= start]
                benchmark_returns = benchmark_returns[benchmark_returns.index >= start]
            except Exception as e:
                print(f"Warning: Invalid start_date format: {e}")
        
        # Calculate metrics
        metrics = self._calculate_metrics(portfolio_returns, benchmark_returns)
        
        # Generate chart data
        cumulative_data = self._generate_cumulative_data(portfolio_returns, benchmark_returns)
        volatility_data = self._generate_volatility_data(portfolio_returns, benchmark_returns)
        heatmap_data = self._generate_heatmap_data(portfolio_returns)
        
        result = {
            'metrics': metrics,
            'cumulativeChart': cumulative_data,
            'volatilityChart': volatility_data,
            'heatmap': heatmap_data,
            'stocks': valid_stocks,
            'period': {
                'start': portfolio_returns.index[0].strftime('%Y-%m-%d'),
                'end': portfolio_returns.index[-1].strftime('%Y-%m-%d')
            }
        }
        
        # Cache result for 1 hour
        cache_service.set(cache_key, result, expire_seconds=3600)
        
        return result
    
    def _calculate_metrics(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> Dict[str, Any]:
        """Calculate key portfolio metrics"""
        
        # CAGR (Compound Annual Growth Rate)
        portfolio_cagr = qs.stats.cagr(portfolio_returns)
        benchmark_cagr = qs.stats.cagr(benchmark_returns)
        
        # Max Drawdown
        portfolio_mdd = qs.stats.max_drawdown(portfolio_returns)
        benchmark_mdd = qs.stats.max_drawdown(benchmark_returns)
        
        # Sharpe Ratio
        portfolio_sharpe = qs.stats.sharpe(portfolio_returns)
        benchmark_sharpe = qs.stats.sharpe(benchmark_returns)
        
        # Volatility (annualized)
        portfolio_vol = qs.stats.volatility(portfolio_returns)
        benchmark_vol = qs.stats.volatility(benchmark_returns)
        
        # Calculate percentage for comparison bar
        cagr_percentage = self._calculate_percentage(portfolio_cagr, benchmark_cagr)
        mdd_percentage = self._calculate_percentage(abs(portfolio_mdd), abs(benchmark_mdd), reverse=True)
        sharpe_percentage = self._calculate_percentage(portfolio_sharpe, benchmark_sharpe)
        vol_percentage = self._calculate_percentage(portfolio_vol, benchmark_vol, reverse=True)
        
        return {
            'cagr': {
                'portfolio': round(portfolio_cagr * 100, 2),
                'benchmark': round(benchmark_cagr * 100, 2),
                'percentage': cagr_percentage
            },
            'mdd': {
                'portfolio': round(portfolio_mdd * 100, 2),
                'benchmark': round(benchmark_mdd * 100, 2),
                'percentage': mdd_percentage
            },
            'sharpe': {
                'portfolio': round(portfolio_sharpe, 2),
                'benchmark': round(benchmark_sharpe, 2),
                'percentage': sharpe_percentage
            },
            'volatility': {
                'portfolio': round(portfolio_vol * 100, 2),
                'benchmark': round(benchmark_vol * 100, 2),
                'percentage': vol_percentage
            }
        }
    
    def _calculate_percentage(self, portfolio_val: float, benchmark_val: float, reverse: bool = False) -> int:
        """Calculate percentage for comparison bar (0-100)
        
        The percentage represents where the portfolio value sits relative to benchmark.
        For metrics where higher is better (CAGR, Sharpe): 
          - If portfolio > benchmark, percentage > 50
          - If portfolio < benchmark, percentage < 50
        For metrics where lower is better (MDD, Volatility):
          - If portfolio < benchmark, percentage > 50 (better)
          - If portfolio > benchmark, percentage < 50 (worse)
        """
        if benchmark_val == 0:
            return 50
        
        if reverse:
            # For metrics where lower is better (MDD, Volatility)
            # If portfolio is lower than benchmark, it's better (higher percentage)
            if portfolio_val == 0:
                return 50
            ratio = benchmark_val / portfolio_val  # Invert ratio
            percentage = max(0, min(100, int(50 * ratio)))
        else:
            # For metrics where higher is better (CAGR, Sharpe)
            ratio = portfolio_val / benchmark_val if benchmark_val != 0 else 1
            percentage = max(0, min(100, int(50 * ratio)))
        
        return percentage
    
    def _generate_cumulative_data(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series) -> Dict[str, Any]:
        """Generate cumulative returns chart data"""
        
        # Calculate cumulative returns
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        benchmark_cumulative = (1 + benchmark_returns).cumprod()
        
        # Convert to percentage (starting from 1.0 = 100%)
        portfolio_cumulative_pct = portfolio_cumulative - 1.0
        benchmark_cumulative_pct = benchmark_cumulative - 1.0
        
        # Sample data (weekly for performance)
        # Take every 5th data point for weekly sampling
        step = max(1, len(portfolio_cumulative) // 400)
        
        labels = portfolio_cumulative.index[::step].strftime('%Y-%m-%d').tolist()
        portfolio_data = portfolio_cumulative_pct.iloc[::step].tolist()
        benchmark_data = benchmark_cumulative_pct.iloc[::step].tolist()
        
        return {
            'labels': labels,
            'portfolio': portfolio_data,
            'benchmark': benchmark_data
        }
    
    def _generate_volatility_data(self, portfolio_returns: pd.Series, benchmark_returns: pd.Series, window: int = 63) -> Dict[str, Any]:
        """Generate rolling volatility chart data (63 trading days ≈ 3 months)"""
        
        # Calculate rolling volatility (annualized)
        portfolio_rolling_vol = portfolio_returns.rolling(window=window).std() * np.sqrt(252)
        benchmark_rolling_vol = benchmark_returns.rolling(window=window).std() * np.sqrt(252)
        
        # Remove NaN values
        valid_mask = ~(portfolio_rolling_vol.isna() | benchmark_rolling_vol.isna())
        portfolio_rolling_vol = portfolio_rolling_vol[valid_mask]
        benchmark_rolling_vol = benchmark_rolling_vol[valid_mask]
        
        # Sample data
        step = max(1, len(portfolio_rolling_vol) // 200)
        
        labels = portfolio_rolling_vol.index[::step].strftime('%Y-%m-%d').tolist()
        portfolio_data = portfolio_rolling_vol.iloc[::step].tolist()
        benchmark_data = benchmark_rolling_vol.iloc[::step].tolist()
        
        return {
            'labels': labels,
            'portfolio': portfolio_data,
            'benchmark': benchmark_data
        }
    
    def _generate_heatmap_data(self, portfolio_returns: pd.Series) -> List[Dict[str, Any]]:
        """Generate monthly returns heatmap data"""
        
        # Calculate monthly returns
        monthly_returns = portfolio_returns.resample('M').apply(lambda x: (1 + x).prod() - 1) * 100
        
        # Group by year and month
        heatmap_dict = {}
        for date, ret in monthly_returns.items():
            year = str(date.year)
            month = date.month - 1  # 0-indexed for frontend
            
            if year not in heatmap_dict:
                heatmap_dict[year] = [None] * 12
            
            heatmap_dict[year][month] = round(ret, 1)
        
        # Convert to list format expected by frontend
        heatmap_data = []
        for year in sorted(heatmap_dict.keys()):
            heatmap_data.append({
                'year': year,
                'months': heatmap_dict[year]
            })
        
        return heatmap_data

