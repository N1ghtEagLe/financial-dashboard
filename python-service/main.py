from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from typing import Dict, List, Any
import io

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your Next.js app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def process_excel_data(file_contents: bytes) -> Dict[str, Any]:
    try:
        # Read Excel file from bytes
        df = pd.read_excel(io.BytesIO(file_contents))
        
        # Strip whitespace from relevant columns
        df['Team'] = df['Team'].str.strip()
        df['Category'] = df['Category'].str.strip()
        df['Currency'] = df['Currency'].str.strip()
        
        # Remove rows where Team or Category is blank
        df = df.dropna(subset=['Team', 'Category'])
        
        # Create separate columns for USD and GBP amounts
        df['USD'] = df.apply(lambda x: x['Amount'] if x['Currency'] == 'USD' else 0, axis=1)
        df['GBP'] = df.apply(lambda x: x['Amount'] if x['Currency'] == 'GBP' else 0, axis=1)

        def create_summary_data(df: pd.DataFrame, group_by_first: str, group_by_second: str) -> List[Dict]:
            # Group by specified columns and sum the amounts
            summary = df.groupby([group_by_first, group_by_second]).agg({
                'USD': 'sum',
                'GBP': 'sum'
            }).round(2)
            
            output_data = []
            
            # Calculate grand totals
            grand_total_usd = summary['USD'].sum()
            grand_total_gbp = summary['GBP'].sum()
            grand_total_combined = grand_total_usd + (grand_total_gbp * 1.29)
            
            for primary in summary.index.get_level_values(group_by_first).unique():
                primary_data = summary.loc[primary]
                
                # Add data rows
                for secondary in primary_data.index:
                    usd_amount = primary_data.loc[secondary, 'USD']
                    gbp_amount = primary_data.loc[secondary, 'GBP']
                    total_usd = usd_amount + (gbp_amount * 1.29)
                    
                    output_data.append({
                        group_by_first: primary,
                        group_by_second: secondary,
                        'USD': float(usd_amount),
                        'GBP': float(gbp_amount),
                        'Total USD': float(total_usd)
                    })
                
                # Add total row for each section
                total_usd = primary_data['USD'].sum()
                total_gbp = primary_data['GBP'].sum()
                section_total_usd = total_usd + (total_gbp * 1.29)
                
                output_data.append({
                    group_by_first: primary,
                    group_by_second: 'TOTAL',
                    'USD': float(total_usd),
                    'GBP': float(total_gbp),
                    'Total USD': float(section_total_usd)
                })
            
            # Add grand total row
            output_data.append({
                group_by_first: 'GRAND TOTAL',
                group_by_second: '',
                'USD': float(grand_total_usd),
                'GBP': float(grand_total_gbp),
                'Total USD': float(grand_total_combined)
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
async def process_file(file: UploadFile):
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an Excel (.xlsx) file")
    
    contents = await file.read()
    result = process_excel_data(contents)
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)