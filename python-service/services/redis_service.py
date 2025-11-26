import redis
import json
from utils.logger import logger
import os
from urllib.parse import urlparse

class RedisService:
    def __init__(self):
        try:
            rest_url = os.getenv("UPSTASH_REDIS_REST_URL")
            rest_token = os.getenv("UPSTASH_REDIS_REST_TOKEN")
            port = int(os.getenv("REDIS_PORT", "6379"))

            if not rest_url or not rest_token:
                raise ValueError("Redis configuration missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN")

            parsed = urlparse(rest_url)
            host = parsed.hostname or rest_url.replace("https://", "").replace("http://", "").split("/")[0]

            self.redis_client = redis.Redis(
                host=host,
                port=port,
                password=rest_token,
                ssl=True,
                decode_responses=True
            )
            self.redis_client.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")

    def save_data(self, data: dict, month_key: str) -> bool:
        """Save data to Redis with specific month key"""
        try:
            # Add prefix to avoid key collisions
            redis_key = f"month:{month_key}"
            logger.info(f"Saving data to Redis with key: {redis_key}")
            
            self.redis_client.hset(
                redis_key,
                mapping={
                    "team_summary": json.dumps(data["teamSummary"]),
                    "category_summary": json.dumps(data["categorySummary"]),
                    "raw_transactions": json.dumps(data["rawTransactions"])
                }
            )
            logger.info(f"Successfully saved data to Redis for month: {redis_key}")
            return True
        except Exception as e:
            logger.error(f"Redis save error for {month_key}: {str(e)}")
            return False

    def get_data(self, month_key: str = "october_2025") -> dict:
        """Get data from Redis for specific month"""
        try:
            redis_key = f"month:{month_key}"
            data = self.redis_client.hgetall(redis_key)
            if not data:
                logger.info(f"No data found in Redis for key: {redis_key}")
                return None
            
            processed_data = {
                "teamSummary": json.loads(data["team_summary"]),
                "categorySummary": json.loads(data["category_summary"]),
                "rawTransactions": json.loads(data["raw_transactions"])
            }
            
            logger.info(f"Retrieved data from Redis for month {redis_key}")
            return processed_data
        except Exception as e:
            logger.error(f"Redis get error for {month_key}: {str(e)}")
            return None

    def get_available_months(self) -> list:
        """Get list of available months in Redis"""
        try:
            # Get all keys that match our pattern
            pattern = "month:*"
            all_keys = self.redis_client.keys(pattern)
            logger.info(f"Found Redis keys: {all_keys}")
            
            months = []
            for key in all_keys:
                # Extract month name from key (e.g., "month:september_2025" -> "September 2025")
                month_name = key.replace('month:', '').replace('_', ' ').title()
                months.append(month_name)
            
            logger.info(f"Available months in Redis: {months}")
            return sorted(months)
        except Exception as e:
            logger.error(f"Redis get months error: {str(e)}")
            return []

    def clear_all_data(self) -> bool:
        """Clear all month data from Redis"""
        try:
            pattern = "month:*"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            logger.info("Cleared all month data from Redis")
            return True
        except Exception as e:
            logger.error(f"Redis clear error: {str(e)}")
            return False
