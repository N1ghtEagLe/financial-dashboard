import redis
import json
from utils.logger import logger
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class RedisService:
    def __init__(self):
        try:
            # Upstash Redis REST URL
            self.redis_client = redis.Redis(
                host='still-gelding-35156.upstash.io',
                port=6379,
                password='AYlUAAIjcDEyNjc5Nzg3Nzk1ZTM0ZThmYmQ5NDJkMzhmM2I5MTQxYXAxMA',
                ssl=True,
                decode_responses=True
            )
            
            # Test connection
            self.redis_client.ping()
            logger.info("Successfully connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            
            # Let's add more detailed error logging
            logger.error("Redis connection details:")
            logger.error(f"Host: still-gelding-35156.upstash.io")
            logger.error(f"Port: 6379")

    def save_data(self, data: dict) -> bool:
        """Save processed data to Redis"""
        try:
            self.redis_client.hset(
                "october_2024",
                mapping={
                    "team_summary": json.dumps(data["teamSummary"]),
                    "category_summary": json.dumps(data["categorySummary"]),
                    "raw_transactions": json.dumps(data["rawTransactions"])
                }
            )
            logger.info("Successfully saved data to Redis")
            return True
        except Exception as e:
            logger.error(f"Redis save error: {str(e)}")
            return False

    def get_data(self) -> dict:
        """Get data from Redis"""
        try:
            data = self.redis_client.hgetall("october_2024")
            if not data:
                logger.info("No data found in Redis")
                return None
            
            logger.info("Successfully retrieved data from Redis")
            return {
                "teamSummary": json.loads(data["team_summary"]),
                "categorySummary": json.loads(data["category_summary"]),
                "rawTransactions": json.loads(data["raw_transactions"])
            }
        except Exception as e:
            logger.error(f"Redis get error: {str(e)}")
            return None 