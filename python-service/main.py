import os
import logging
import io
import numpy as np
import pandas as pd
from fastapi import FastAPI, UploadFile, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Any
from openpyxl.styles import Font, Border, Side, Alignment, numbers
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

# Update CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

port = os.getenv("PORT", "8080")
logger.info(f"Starting server on port: {port}")

INITIAL_DATA_PATH = Path(__file__).parent / "initial_data.xlsx"

def create_summary_data(df: pd.DataFrame, group_by_first: str, group_by_second: str) -> List[Dict]:
    # Group by specified columns and sum the amounts
    summary = df.groupby([group_by_first, group_by_second]).agg({
        'USD': 'sum',
        'GBP': 'sum'
    }).round(2)
    
    output_data = []
    
    # Calculate grand totals
    grand_total_usd = float(summary['USD'].sum())
    grand_total_gbp = float(summary['GBP'].sum())
    grand_total_combined = grand_total_usd + (grand_total_gbp * 1.29)
    
    for primary in summary.index.get_level_values(group_by_first).unique():
        primary_data = summary.loc[primary]
        
        # Add data rows
        for secondary in primary_data.index:
            usd_amount = float(primary_data.loc[secondary, 'USD'])
            gbp_amount = float(primary_data.loc[secondary, 'GBP'])
            total_usd = usd_amount + (gbp_amount * 1.29)
            
            output_data.append({
                group_by_first: primary,
                group_by_second: secondary,
                'USD': usd_amount,
                'GBP': gbp_amount,
                'Total USD': total_usd
            })
        
        # Add total row for each section
        total_usd = float(primary_data['USD'].sum())
        total_gbp = float(primary_data['GBP'].sum())
        section_total_usd = total_usd + (total_gbp * 1.29)
        
        output_data.append({
            group_by_first: primary,
            group_by_second: 'TOTAL',
            'USD': total_usd,
            'GBP': total_gbp,
            'Total USD': section_total_usd
        })
    
    # Add grand total row
    output_data.append({
        group_by_first: 'GRAND TOTAL',
        group_by_second: '',
        'USD': grand_total_usd,
        'GBP': grand_total_gbp,
        'Total USD': grand_total_combined
    })
    
    return output_data

def process_excel_data(file_contents: bytes) -> Dict[str, Any]:
    try:
        # Read Excel file from bytes
        df = pd.read_excel(io.BytesIO(file_contents))
        logger.info(f"Successfully read Excel file with {len(df)} rows")
        
        # Clean column names (remove extra spaces)
        df.columns = df.columns.str.strip()
        
        # Replace NaN values with None
        df = df.replace({np.nan: None})
        
        # Handle date conversion with specific format
        if 'Date' in df.columns:
            try:
                # First convert any existing datetime objects to string
                if df['Date'].dtype == 'datetime64[ns]':
                    df['Date'] = df['Date'].dt.strftime('%Y-%m-%d')
                else:
                    # Try to parse as DD-MM-YYYY
                    df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%Y').dt.strftime('%Y-%m-%d')
            except Exception as e:
                logger.error(f"Date conversion error: {str(e)}")
                # If conversion fails, try to convert to string
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
        
        # Create separate columns for USD and GBP amounts (handling negative values)
        df['USD'] = df.apply(lambda x: float(x['Amount']) if x['Currency'] == 'USD' else 0, axis=1)
        df['GBP'] = df.apply(lambda x: float(x['Amount']) if x['Currency'] == 'GBP' else 0, axis=1)

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

        # Create summaries using the processed data
        df = pd.DataFrame(df_dict)
        team_summary = create_summary_data(df, 'Team', 'Category')
        category_summary = create_summary_data(df, 'Category', 'Team')
        
        result = {
            "teamSummary": team_summary,
            "categorySummary": category_summary,
            "rawTransactions": df_dict
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

        # Process the file
        result = process_excel_data(contents)
        logger.info("File processed successfully")
        logger.info(f"Result: {result}")
        
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
    try:
        if not INITIAL_DATA_PATH.exists():
            logger.error("Initial data file not found")
            return JSONResponse(
                status_code=404,
                content={"error": "Initial data not found"},
                headers={"Access-Control-Allow-Origin": "*"}
            )
            
        with open(INITIAL_DATA_PATH, "rb") as f:
            contents = f.read()
            
        result = process_excel_data(contents)
        logger.info("Initial data processed successfully")
        
        return JSONResponse(
            content=result,
            headers={"Access-Control-Allow-Origin": "*"}
        )
        
    except Exception as e:
        logger.error(f"Error loading initial data: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Error loading initial data: {str(e)}"},
            headers={"Access-Control-Allow-Origin": "*"}
        )