import os
import logging
import io
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, HTTPException, Header, Depends, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Any
from openpyxl.styles import Font, Border, Side, Alignment, numbers
from pathlib import Path
from services.redis_service import RedisService
from utils.logger import logger

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Initialize Redis service
redis_service = RedisService()

# Update CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

port = os.getenv("PORT", "8080")
logger.info(f"Starting server on port: {port}")

INITIAL_DATA_PATH = Path(__file__).parent / "october_2024.xlsx"
logger.info(f"Looking for Excel file at: {INITIAL_DATA_PATH}")

def create_summary_data(df: pd.DataFrame, group_by_first: str, group_by_second: str, exchange_rate: float) -> List[Dict]:
    # Group by specified columns and sum the amounts
    summary = df.groupby([group_by_first, group_by_second]).agg({
        'USD': 'sum',
        'GBP': 'sum'
    }).round(2)
    
    output_data = []
    
    # Calculate grand totals using provided exchange rate
    grand_total_usd = float(summary['USD'].sum())
    grand_total_gbp = float(summary['GBP'].sum())
    grand_total_combined = grand_total_usd + (grand_total_gbp * exchange_rate)
    
    for primary in summary.index.get_level_values(group_by_first).unique():
        primary_data = summary.loc[primary]
        
        # Add data rows
        for secondary in primary_data.index:
            usd_amount = float(primary_data.loc[secondary, 'USD'])
            gbp_amount = float(primary_data.loc[secondary, 'GBP'])
            total_usd = usd_amount + (gbp_amount * exchange_rate)
            
            output_data.append({
                group_by_first: primary,
                group_by_second: secondary,
                'USD': usd_amount,
                'GBP': gbp_amount,
                'Total USD': total_usd,
                'Exchange Rate': exchange_rate  # Include exchange rate in each row
            })
        
        # Add total row for each section
        total_usd = float(primary_data['USD'].sum())
        total_gbp = float(primary_data['GBP'].sum())
        section_total_usd = total_usd + (total_gbp * exchange_rate)
        
        output_data.append({
            group_by_first: primary,
            group_by_second: 'TOTAL',
            'USD': total_usd,
            'GBP': total_gbp,
            'Total USD': section_total_usd,
            'Exchange Rate': exchange_rate
        })
    
    # Add grand total row
    output_data.append({
        group_by_first: 'GRAND TOTAL',
        group_by_second: '',
        'USD': grand_total_usd,
        'GBP': grand_total_gbp,
        'Total USD': grand_total_combined,
        'Exchange Rate': exchange_rate
    })
    
    return output_data

def process_excel_data(file_contents: bytes) -> Dict[str, Any]:
    try:
        # Read Excel file from bytes
        df = pd.read_excel(io.BytesIO(file_contents))
        logger.info(f"Successfully read Excel file with {len(df)} rows")
        
        # Clean column names (remove extra spaces)
        df.columns = df.columns.str.strip()
        
        # Get exchange rate from first row only
        try:
            first_rate = df['Exchange Rate'].iloc[0]
            if pd.isna(first_rate):
                logger.warning("First exchange rate is NaN, using default 1.29")
                exchange_rate = 1.29
            else:
                exchange_rate = float(first_rate)
                logger.info(f"Successfully converted exchange rate to float: {exchange_rate}")
        except Exception as e:
            logger.error(f"Error processing exchange rate: {str(e)}")
            exchange_rate = 1.29

        logger.info(f"Final exchange rate being used: {exchange_rate}")
        
        # Replace NaN values with None
        df = df.replace({np.nan: None})
        
        # Handle date conversion with specific format
        if 'Date' in df.columns:
            try:
                if df['Date'].dtype == 'datetime64[ns]':
                    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
                else:
                    df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%Y').dt.strftime('%Y-%m-%d')
            except Exception as e:
                logger.error(f"Date conversion error: {str(e)}")
                df['Date'] = df['Date'].astype(str)
        
        # Strip whitespace from string columns
        for col in ['Team', 'Category', 'Currency', 'Description']:
            if col in df.columns:
                df[col] = df[col].str.strip()
        
        # Remove rows where Team or Category is blank or whitespace-only
        df = df[
            (df['Team'].notna()) & (df['Team'].str.strip() != '') &
            (df['Category'].notna()) & (df['Category'].str.strip() != '')
        ]
        
        logger.info(f"After removing blank Team/Category rows: {len(df)} rows")
        
        # Create separate columns for USD and GBP amounts with error handling
        def safe_float_conversion(value, currency_match):
            try:
                if currency_match and pd.notna(value):
                    return float(value)
                return 0
            except (ValueError, TypeError):
                logger.warning(f"Could not convert value to float: {value}")
                return 0

        # Create USD and GBP columns with safe conversion
        df['USD'] = df.apply(
            lambda x: safe_float_conversion(x['Amount'], x['Currency'] == 'USD'), 
            axis=1
        )
        df['GBP'] = df.apply(
            lambda x: safe_float_conversion(x['Amount'], x['Currency'] == 'GBP'), 
            axis=1
        )

        # Convert DataFrame to dict before creating summaries
        df_dict = df.to_dict('records')
        
        # Ensure all values are JSON serializable
        for row in df_dict:
            for key, value in row.items():
                if pd.isna(value):
                    row[key] = None
                elif isinstance(value, pd.Timestamp):
                    row[key] = value.strftime('%Y-%m-%d')
                elif isinstance(value, (np.int64, np.float64)):
                    row[key] = float(value)

        # Create summaries using the processed data and exchange rate
        team_summary = create_summary_data(df, 'Team', 'Category', exchange_rate)
        category_summary = create_summary_data(df, 'Category', 'Team', exchange_rate)
        
        result = {
            "teamSummary": team_summary,
            "categorySummary": category_summary,
            "rawTransactions": df_dict,
            "exchangeRate": exchange_rate  # Include in result for frontend reference
        }
        
        # Verify JSON serialization before returning
        try:
            import json
            json.dumps(result)  # Test if result is JSON serializable
        except TypeError as e:
            logger.error(f"JSON serialization error: {str(e)}")
            raise HTTPException(status_code=400, detail="Data contains non-serializable values")
        
        logger.info("Data processed successfully")
        return result
        
    except Exception as e:
        logger.error(f"Error processing Excel: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/process")
async def process_file(file: UploadFile):
    try:
        logger.info(f"Processing file: {file.filename}")
        
        # Read file contents
        contents = await file.read()
        logger.info(f"File size: {len(contents)} bytes")

        # Get month key from filename (remove .xlsx extension)
        month_key = file.filename.split('.')[0].lower()
        logger.info(f"Using month key: {month_key}")

        # Process the file
        result = process_excel_data(contents)
        logger.info("File processed successfully")
        
        # Save to Redis with the month key
        if redis_service.save_data(result, month_key):
            logger.info(f"Data saved to Redis with key: {month_key}")
        else:
            logger.warning(f"Failed to save data to Redis for key: {month_key}")
        
        return JSONResponse(
            content=result,
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            }
        )

    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Error processing file: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            }
        )

# Add a health check endpoint
@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "port": port}

@app.get("/initial-data")
async def get_initial_data():
    logger.info("Initial data endpoint called")
    try:
        # First try to get data from Redis
        logger.info("Attempting to get data from Redis")
        redis_data = redis_service.get_data("october_2024")  # Specify the default month
        if redis_data:
            logger.info("Data retrieved from Redis successfully")
            return JSONResponse(
                content=redis_data,
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        logger.info("No data in Redis, checking Excel file")
        # If no Redis data, process Excel and save to Redis
        if not INITIAL_DATA_PATH.exists():
            logger.error(f"Excel file not found at path: {INITIAL_DATA_PATH}")
            return JSONResponse(
                status_code=404,
                content={"error": "Initial data not found"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        logger.info(f"Excel file found, size: {INITIAL_DATA_PATH.stat().st_size} bytes")
        with open(INITIAL_DATA_PATH, "rb") as f:
            contents = f.read()
            logger.info(f"Read {len(contents)} bytes from Excel file")
        
        logger.info("Processing Excel data")
        result = process_excel_data(contents)
        
        # Save to Redis with specific month key
        logger.info("Saving processed data to Redis")
        if redis_service.save_data(result, "october_2024"):
            logger.info("Data saved to Redis successfully")
        else:
            logger.warning("Failed to save data to Redis")
        
        return JSONResponse(
            content=result,
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    except Exception as e:
        logger.error(f"Error in get_initial_data: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Error loading initial data: {str(e)}"},
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        
        # Get month key from filename (remove .xlsx extension)
        month_key = file.filename.split('.')[0].lower()
        logger.info(f"Processing file for month: {month_key}")
        
        result = process_excel_data(contents)
        
        # Save to Redis with the month key
        if redis_service.save_data(result, month_key):
            logger.info(f"Data processed and saved to Redis for month: {month_key}")
        else:
            logger.warning(f"Data processed but not saved to Redis for month: {month_key}")
            
        return JSONResponse(
            content=result,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={"error": f"Error processing file: {str(e)}"},
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.get("/available-months")
async def get_available_months():
    try:
        # Get available months from Redis
        months = redis_service.get_available_months()
        logger.info(f"Available months endpoint returning: {months}")
        return JSONResponse(
            content={"months": months},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error getting available months: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.get("/debug/redis-keys")
async def debug_redis_keys():
    try:
        all_keys = redis_service.redis_client.keys("*")
        key_values = {}
        for key in all_keys:
            value = redis_service.redis_client.type(key)
            key_values[key] = value
        return JSONResponse(
            content={"keys": key_values},
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error getting Redis keys: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )

@app.get("/month/{month_key}")
async def get_month_data(month_key: str):
    """Get data for a specific month"""
    try:
        logger.info(f"Getting data for month: {month_key}")
        data = redis_service.get_data(month_key)
        if not data:
            logger.error(f"No data found for month: {month_key}")
            return JSONResponse(
                status_code=404,
                content={"error": "Month not found"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
        
        logger.info(f"Successfully retrieved data for month: {month_key}")
        return JSONResponse(
            content=data,
            headers={"Access-Control-Allow-Origin": "*"}
        )
    except Exception as e:
        logger.error(f"Error getting month data: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)},
            headers={"Access-Control-Allow-Origin": "*"}
        )