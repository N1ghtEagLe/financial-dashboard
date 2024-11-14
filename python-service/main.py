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
        
        # Replace NaN values with None
        df = df.replace({np.nan: None})
        
        # Strip whitespace from relevant columns
        df['Team'] = df['Team'].str.strip()
        df['Category'] = df['Category'].str.strip()
        df['Currency'] = df['Currency'].str.strip()
        
        # Remove rows where Team or Category is blank
        df = df.dropna(subset=['Team', 'Category'])
        
        # Create separate columns for USD and GBP amounts
        df['USD'] = df.apply(lambda x: float(x['Amount']) if x['Currency'] == 'USD' else 0, axis=1)
        df['GBP'] = df.apply(lambda x: float(x['Amount']) if x['Currency'] == 'GBP' else 0, axis=1)

        # Create summaries
        team_summary = create_summary_data(df, 'Team', 'Category')
        category_summary = create_summary_data(df, 'Category', 'Team')
        
        # Prepare raw transactions
        raw_transactions = df.to_dict('records')
        
        return {
            "teamSummary": team_summary,
            "categorySummary": category_summary,
            "rawTransactions": raw_transactions
        }
        
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