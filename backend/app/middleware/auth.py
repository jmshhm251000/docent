from fastapi import Request, HTTPException, status
from fastapi.security import APIKeyHeader
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()

# API Key for internal APIs
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "internal-secret-key-change-in-production")

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def check_internal_access(request: Request, api_key: Optional[str] = None) -> bool:
    """
    Check if request has access to internal APIs
    
    Methods:
    1. Check API key in header (X-API-Key)
    2. Check if request is from local network (same as dashboard check)
    
    Args:
        request: FastAPI request object
        api_key: Optional API key from header
        
    Returns:
        True if access is allowed, False otherwise
    """
    # Method 1: Check API key
    if api_key and api_key == INTERNAL_API_KEY:
        return True
    
    # Method 2: Check if from local network
    client_ip = request.client.host if request.client else None
    
    # Allow localhost and private IP ranges
    if client_ip in ['127.0.0.1', 'localhost', '::1']:
        return True
    
    # Check if IP is in private ranges (10.x.x.x, 192.168.x.x, 172.16-31.x.x)
    if client_ip:
        try:
            parts = client_ip.split('.')
            if len(parts) == 4:
                first = int(parts[0])
                second = int(parts[1]) if parts[1].isdigit() else 0
                
                if first == 10:
                    return True
                if first == 192 and second == 168:
                    return True
                if first == 172 and 16 <= second <= 31:
                    return True
        except (ValueError, IndexError):
            pass
    
    return False


def require_internal_access(request: Request, api_key: Optional[str] = None):
    """
    Require internal access, raise exception if not allowed
    
    Args:
        request: FastAPI request object
        api_key: Optional API key from header
        
    Raises:
        HTTPException: If access is not allowed
    """
    if not check_internal_access(request, api_key):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for internal use only. Provide valid API key or access from local network."
        )

