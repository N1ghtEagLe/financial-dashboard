import redis
import json
from utils.logger import logger
import os

class RedisService:
    def __init__(self):
        try:
            self.redis_client = redis.Redis(
                host='still-gelding-35156.upstash.io',
                port=6379,
                password='AYlUAAIjcDEyNjc5Nzg3Nzk1ZTM0ZThmYmQ5NDJkMzhmM2I5MTQxYXAxMA',
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

    def get_data(self, month_key: str = "october_2024") -> dict:
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
            pattern = "month:*_2024"
            all_keys = self.redis_client.keys(pattern)
            logger.info(f"Found Redis keys: {all_keys}")
            
            months = []
            for key in all_keys:
                # Extract month name from key (e.g., "month:september_2024" -> "September 2024")
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
            pattern = "month:*_2024"
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            logger.info("Cleared all month data from Redis")
            return True
        except Exception as e:
            logger.error(f"Redis clear error: {str(e)}")
            return False