import redis
import os
import time
from typing import Optional, Tuple
from functools import wraps


class RateLimiter:
    """Redis-based rate limiter for API calls"""
    
    def __init__(self):
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_client = redis.from_url(redis_url, decode_responses=True)
    
    def is_allowed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> Tuple[bool, Optional[int]]:
        """
        Check if request is allowed based on rate limit
        
        Args:
            key: Unique key for rate limiting (e.g., 'yfinance:api')
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            Tuple of (is_allowed, remaining_requests)
        """
        try:
            current_time = int(time.time())
            window_start = current_time - window_seconds
            
            # Use sorted set to track requests with timestamps
            pipe = self.redis_client.pipeline()
            
            # Remove old entries outside the window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window_seconds)
            
            results = pipe.execute()
            current_count = results[1]
            
            if current_count < max_requests:
                # Request allowed
                remaining = max_requests - current_count - 1
                return True, remaining
            else:
                # Rate limit exceeded
                # Get oldest request time to calculate wait time
                oldest = self.redis_client.zrange(key, 0, 0, withscores=True)
                if oldest:
                    oldest_time = int(oldest[0][1])
                    wait_time = window_seconds - (current_time - oldest_time)
                    return False, wait_time
                return False, window_seconds
                
        except Exception as e:
            print(f"Rate limiter error: {e}")
            # On error, allow request (fail open)
            return True, None
    
    def wait_if_needed(
        self,
        key: str,
        max_requests: int,
        window_seconds: int
    ) -> None:
        """
        Wait if rate limit is exceeded
        
        Args:
            key: Unique key for rate limiting
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
        """
        is_allowed, wait_time = self.is_allowed(key, max_requests, window_seconds)
        
        if not is_allowed and wait_time:
            print(f"Rate limit exceeded for {key}. Waiting {wait_time} seconds...")
            time.sleep(wait_time)
            # Try once more after waiting
            is_allowed, _ = self.is_allowed(key, max_requests, window_seconds)
            if not is_allowed:
                raise Exception(f"Rate limit still exceeded for {key} after waiting")


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests: int, window_seconds: int, key_prefix: str = "api"):
    """
    Decorator for rate limiting function calls
    
    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds
        key_prefix: Prefix for Redis key
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate key from function name and arguments
            func_key = f"{key_prefix}:{func.__name__}"
            if args:
                func_key += f":{str(args[0])}"  # Use first arg as identifier
            
            rate_limiter.wait_if_needed(func_key, max_requests, window_seconds)
            return func(*args, **kwargs)
        
        return wrapper
    return decorator

