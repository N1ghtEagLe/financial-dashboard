from fastapi import FastAPI, UploadFile, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
from typing import Dict, List, Any
import io
import logging
import numpy as np
import os

app = FastAPI()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add API key verification function
async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != os.environ.get('API_KEY'):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

# Update CORS middleware to allow all origins (you can restrict this later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with your frontend URL once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": str(exc)}
    )

def process_excel_data(file_contents: bytes) -> Dict[str, Any]:
    try:
        # Read Excel file from bytes
        df = pd.read_excel(io.BytesIO(file_contents))
        
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
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/process")
async def process_file(
    file: UploadFile,
    api_key: str = Depends(verify_api_key)
):
    try:
        logger.info(f"Received file: {file.filename}")
        
        if not file.filename.endswith('.xlsx'):
            logger.error("Invalid file type")
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid file type. Please upload an Excel (.xlsx) file"}
            )

        contents = await file.read()
        logger.info(f"File size: {len(contents)} bytes")

        # Try to read the Excel file
        try:
            df = pd.read_excel(io.BytesIO(contents))
            logger.info(f"Successfully read Excel file with {len(df)} rows")
        except Exception as e:
            logger.error(f"Error reading Excel file: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Error reading Excel file: {str(e)}"}
            )

        # Verify required columns
        required_columns = ['Team', 'Category', 'Amount', 'Currency']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            return JSONResponse(
                status_code=400,
                content={"error": f"Missing required columns: {', '.join(missing_columns)}"}
            )

        # Process the data
        try:
            result = process_excel_data(contents)
            logger.info("Successfully processed file")
            return result
        except Exception as e:
            logger.error(f"Error processing file: {str(e)}")
            return JSONResponse(
                status_code=400,
                content={"error": str(e)}
            )
    except Exception as e:
        logger.error(f"Global error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)