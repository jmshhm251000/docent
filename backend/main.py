from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import APIKeyHeader
from typing import Optional
from sqlalchemy.orm import Session
import json
from app.api.routes import api_router
from app.database import init_db, get_db
from app.middleware.auth import require_internal_access, api_key_header
from app.services.logging_service import LoggingService
from app.models import ApiLog, TestResult, PortfolioAnalysisLog
from sqlalchemy import func
from datetime import datetime, timedelta

app = FastAPI(
    title="Portfolio Analysis API",
    description="Portfolio analysis API using quantstats",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")

# Include API routes
app.include_router(api_router, prefix="/api")

logging_service = LoggingService()


@app.get("/")
async def root():
    return {"message": "Portfolio Analysis API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    request: Request,
    db: Session = Depends(get_db),
    api_key: Optional[str] = Depends(api_key_header)
):
    """Dashboard HTML page - Internal use only"""
    require_internal_access(request, api_key)
    
    # Get data for dashboard
    cutoff_24h = datetime.utcnow() - timedelta(hours=24)
    cutoff_30d = datetime.utcnow() - timedelta(days=30)
    
    # API metrics
    api_logs = db.query(ApiLog).filter(ApiLog.created_at >= cutoff_24h).all()
    total_requests = len(api_logs)
    successful_requests = len([l for l in api_logs if 200 <= l.status_code < 300])
    failed_requests = len([l for l in api_logs if l.status_code >= 400])
    avg_response_time = (
        sum(l.response_time_ms for l in api_logs) / total_requests
        if total_requests > 0 else 0
    )
    
    # Test results
    recent_tests = db.query(TestResult).order_by(TestResult.created_at.desc()).limit(10).all()
    
    # Popular stocks
    portfolio_logs = db.query(PortfolioAnalysisLog).filter(
        PortfolioAnalysisLog.created_at >= cutoff_30d
    ).all()
    stock_counts = {}
    for log in portfolio_logs:
        stocks = log.stocks.split(',')
        for stock in stocks:
            stock_counts[stock] = stock_counts.get(stock, 0) + 1
    popular_stocks = sorted(stock_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Daily trends
    daily_logs = db.query(
        func.date(ApiLog.created_at).label('date'),
        func.count(ApiLog.id).label('count'),
        func.avg(ApiLog.response_time_ms).label('avg_response_time')
    ).filter(
        ApiLog.created_at >= cutoff_30d
    ).group_by(
        func.date(ApiLog.created_at)
    ).order_by(
        func.date(ApiLog.created_at)
    ).all()
    
    # Format dates for chart
    chart_labels = [str(log.date) for log in daily_logs]
    chart_counts = [log.count for log in daily_logs]
    chart_response_times = [round(log.avg_response_time, 2) if log.avg_response_time else 0 for log in daily_logs]
    
    # Format test results HTML
    test_rows_html = ""
    if recent_tests:
        for test in recent_tests:
            duration_str = f"{test.duration_seconds:.2f}"
            time_str = test.created_at.strftime('%Y-%m-%d %H:%M') if test.created_at else 'N/A'
            test_rows_html += f"""
                        <tr>
                            <td>{test.test_name}</td>
                            <td>{test.test_type}</td>
                            <td><span class="status-badge status-{test.status.lower()}">{test.status}</span></td>
                            <td>{duration_str}s</td>
                            <td>{time_str}</td>
                        </tr>
                        """
    else:
        test_rows_html = "<tr><td colspan='5'>No test results yet</td></tr>"
    
    # Format popular stocks HTML
    stocks_rows_html = ""
    if popular_stocks:
        for stock, count in popular_stocks:
            stocks_rows_html += f"""
                        <tr>
                            <td><strong>{stock}</strong></td>
                            <td>{count}</td>
                        </tr>
                        """
    else:
        stocks_rows_html = "<tr><td colspan='2'>No data yet</td></tr>"
    
    html_content = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio API Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #f5f7fa;
            color: #191f28;
            padding: 20px;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1 {{
            margin-bottom: 30px;
            color: #3182f6;
        }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }}
        .stat-card h3 {{
            font-size: 14px;
            color: #8b95a1;
            margin-bottom: 10px;
        }}
        .stat-card .value {{
            font-size: 32px;
            font-weight: 600;
            color: #191f28;
        }}
        .stat-card .value.success {{
            color: #00c851;
        }}
        .stat-card .value.error {{
            color: #ff4444;
        }}
        .section {{
            background: white;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }}
        .section h2 {{
            margin-bottom: 20px;
            color: #191f28;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        th, td {{
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e8eb;
        }}
        th {{
            font-weight: 600;
            color: #8b95a1;
            font-size: 14px;
        }}
        .status-badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }}
        .status-passed {{
            background: #00c85120;
            color: #00c851;
        }}
        .status-failed {{
            background: #ff444420;
            color: #ff4444;
        }}
        .status-error {{
            background: #ff880020;
            color: #ff8800;
        }}
        .chart-container {{
            position: relative;
            height: 300px;
            margin-top: 20px;
        }}
        .refresh-btn {{
            background: #3182f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin-bottom: 20px;
        }}
        .refresh-btn:hover {{
            background: #2563eb;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Portfolio API Dashboard</h1>
        
        <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Requests (24h)</h3>
                <div class="value">{total_requests:,}</div>
            </div>
            <div class="stat-card">
                <h3>Success Rate</h3>
                <div class="value success">{(successful_requests / total_requests * 100) if total_requests > 0 else 0:.1f}%</div>
            </div>
            <div class="stat-card">
                <h3>Failed Requests</h3>
                <div class="value error">{failed_requests}</div>
            </div>
            <div class="stat-card">
                <h3>Avg Response Time</h3>
                <div class="value">{avg_response_time:.0f}ms</div>
            </div>
        </div>
        
        <div class="section">
            <h2>📈 Daily Trends (Last 30 Days)</h2>
            <div class="chart-container">
                <canvas id="trendsChart"></canvas>
            </div>
        </div>
        
        <div class="section">
            <h2>🧪 Recent Test Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {test_rows_html}
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>📊 Popular Stocks (Last 30 Days)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Stock</th>
                        <th>Analysis Count</th>
                    </tr>
                </thead>
                <tbody>
                    {stocks_rows_html}
                </tbody>
            </table>
        </div>
    </div>
    
    <script>
        // Trends chart
        const trendsData = {{
            labels: {json.dumps(chart_labels)},
            datasets: [
                {{
                    label: 'Request Count',
                    data: {json.dumps(chart_counts)},
                    borderColor: '#3182f6',
                    backgroundColor: 'rgba(49, 130, 246, 0.1)',
                    yAxisID: 'y',
                }},
                {{
                    label: 'Avg Response Time (ms)',
                    data: {json.dumps(chart_response_times)},
                    borderColor: '#ff8800',
                    backgroundColor: 'rgba(255, 136, 0, 0.1)',
                    yAxisID: 'y1',
                }}
            ]
        }};
        
        new Chart(document.getElementById('trendsChart'), {{
            type: 'line',
            data: trendsData,
            options: {{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {{
                    mode: 'index',
                    intersect: false,
                }},
                scales: {{
                    y: {{
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {{
                            display: true,
                            text: 'Request Count'
                        }}
                    }},
                    y1: {{
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {{
                            drawOnChartArea: false,
                        }},
                        title: {{
                            display: true,
                            text: 'Response Time (ms)'
                        }}
                    }}
                }}
            }}
        }});
        
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>
    """
    
    return HTMLResponse(content=html_content)


