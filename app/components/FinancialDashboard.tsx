'use client'
import '../globals.css'

import React, { useState, useEffect } from 'react'
import FileUpload from './FileUpload'

type SummaryData = {
  Team: string
  Category: string
  USD: number
  GBP: number
  'Total USD': number
}

type RawTransaction = {
  Date: string
  Description: string
  Amount: number
  Currency: string
  Team: string
  Category: string
}

type RawDataMapping = {
  [key: string]: RawTransaction[]
}

// Mock data (in a real application, you'd fetch this from an API)
const mockSummaryByTeam: SummaryData[] = [
  { Team: 'Engineering', Category: 'Software', USD: 1000, GBP: 0, 'Total USD': 1000 },
  { Team: 'Engineering', Category: 'Hardware', USD: 500, GBP: 200, 'Total USD': 754.65 },
  { Team: 'Engineering', Category: 'TOTAL', USD: 1500, GBP: 200, 'Total USD': 1754.65 },
  { Team: 'Marketing', Category: 'Advertising', USD: 2000, GBP: 1000, 'Total USD': 2775.19 },
  { Team: 'Marketing', Category: 'TOTAL', USD: 2000, GBP: 1000, 'Total USD': 2775.19 },
  { Team: 'GRAND TOTAL', Category: '', USD: 3500, GBP: 1200, 'Total USD': 4529.84 },
]

const mockSummaryByCategory: SummaryData[] = [
  { Team: 'Software', Category: 'Engineering', USD: 1000, GBP: 0, 'Total USD': 1000 },
  { Team: 'Hardware', Category: 'Engineering', USD: 500, GBP: 200, 'Total USD': 754.65 },
  { Team: 'Advertising', Category: 'Marketing', USD: 2000, GBP: 1000, 'Total USD': 2775.19 },
  { Team: 'GRAND TOTAL', Category: '', USD: 3500, GBP: 1200, 'Total USD': 4529.84 },
]

const mockRawDataMapping: RawDataMapping = {
  'Engineering,Software': [
    { Date: '2023-01-01', Description: 'Software License A', Amount: 500, Currency: 'USD', Team: 'Engineering', Category: 'Software' },
    { Date: '2023-01-15', Description: 'Software License B', Amount: 500, Currency: 'USD', Team: 'Engineering', Category: 'Software' },
  ],
  'Engineering,Hardware': [
    { Date: '2023-02-01', Description: 'Laptops', Amount: 500, Currency: 'USD', Team: 'Engineering', Category: 'Hardware' },
    { Date: '2023-02-15', Description: 'Monitors', Amount: 200, Currency: 'GBP', Team: 'Engineering', Category: 'Hardware' },
  ],
  'Marketing,Advertising': [
    { Date: '2023-03-01', Description: 'Facebook Ads', Amount: 1000, Currency: 'USD', Team: 'Marketing', Category: 'Advertising' },
    { Date: '2023-03-15', Description: 'Google Ads', Amount: 1000, Currency: 'USD', Team: 'Marketing', Category: 'Advertising' },
    { Date: '2023-03-30', Description: 'LinkedIn Ads', Amount: 1000, Currency: 'GBP', Team: 'Marketing', Category: 'Advertising' },
  ],
}

function formatCurrency(amount: number, currencySymbol: string): string {
  const absAmount = Math.abs(amount)
  const formattedAmount = absAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })
  if (amount < 0) {
    return `(${currencySymbol}${formattedAmount})`
  } else {
    return `${currencySymbol}${formattedAmount}`
  }
}

export default function FinancialDashboard() {
  const [viewMode, setViewMode] = useState<'team' | 'category'>('team')
  const [summaryData, setSummaryData] = useState<SummaryData[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<RawTransaction[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawTransactions, setRawTransactions] = useState<RawTransaction[]>([])
  const [teamSummary, setTeamSummary] = useState<SummaryData[]>([])
  const [categorySummary, setCategorySummary] = useState<SummaryData[]>([])

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/initial-data`)
        if (!response.ok) {
          throw new Error('Failed to load initial data')
        }
        const data = await response.json()
        setTeamSummary(data.teamSummary)
        setCategorySummary(data.categorySummary)
        setSummaryData(viewMode === 'team' ? data.teamSummary : data.categorySummary)
        setRawTransactions(data.rawTransactions)
      } catch (error) {
        console.error('Error loading initial data:', error)
        setError('Failed to load initial data')
      }
    }

    loadInitialData()
  }, [viewMode])

  const handleUploadSuccess = (data: any) => {
    setTeamSummary(data.teamSummary)
    setCategorySummary(data.categorySummary)
    setSummaryData(viewMode === 'team' ? data.teamSummary : data.categorySummary)
    setRawTransactions(data.rawTransactions)
    setError(null)
  }

  const handleUploadError = (error: string) => {
    setError(error)
  }

  const handleCellClick = (team: string, category: string, currencyType: string) => {
    console.log('Cell clicked:', { team, category, currencyType })

    const filteredTransactions = rawTransactions.filter(transaction => {
      // Handle 'GRAND TOTAL' row
      if (team === 'GRAND TOTAL') {
        if (currencyType === 'Total USD') {
          return true // Include all transactions
        } else {
          return transaction.Currency === currencyType
        }
      }

      // Handle 'TOTAL' rows
      if (category === 'TOTAL') {
        const matchTeam = transaction.Team === team
        if (currencyType === 'Total USD') {
          return matchTeam
        } else {
          return matchTeam && transaction.Currency === currencyType
        }
      }

      // Regular rows
      const matchTeam = transaction.Team === team
      const matchCategory = transaction.Category === category
      if (currencyType === 'Total USD') {
        return matchTeam && matchCategory
      } else {
        return matchTeam && matchCategory && transaction.Currency === currencyType
      }
    })

    console.log('Filtered transactions:', filteredTransactions)
    setSelectedTransactions(filteredTransactions)
    setIsModalOpen(true)
  }

  const handleViewModeChange = (mode: 'team' | 'category') => {
    setViewMode(mode)
    setSummaryData(mode === 'team' ? teamSummary : categorySummary)
  }

  const renderSummaryTable = (data: SummaryData[]) => {
    // Group the data by primary key (Team or Category)
    const groupedData: { [key: string]: SummaryData[] } = {}
    
    data.forEach(row => {
      const primaryKey = viewMode === 'team' ? row.Team : row.Category
      if (primaryKey === 'GRAND TOTAL') return // Handle grand total separately
      
      if (!groupedData[primaryKey]) {
        groupedData[primaryKey] = []
      }
      groupedData[primaryKey].push(row)
    })

    const grandTotal = data.find(row => 
      (viewMode === 'team' ? row.Team : row.Category) === 'GRAND TOTAL'
    )

    return (
      <div className="flex flex-col">
        <div className="border-2 border-gray-600 rounded-lg overflow-hidden shadow-xl">
          <table className="financial-table w-full">
            <thead className="bg-black">
              <tr>
                <th className="w-1/5 px-3 py-3 text-xs font-medium text-white uppercase tracking-wider text-left">
                  {viewMode === 'team' ? 'Team' : 'Category'}
                </th>
                <th className="w-1/5 px-3 py-3 text-xs font-medium text-white uppercase tracking-wider text-left">
                  {viewMode === 'team' ? 'Category' : 'Team'}
                </th>
                <th className="w-1/5 px-3 py-3 text-xs font-medium text-white uppercase tracking-wider text-left">
                  USD
                </th>
                <th className="w-1/5 px-3 py-3 text-xs font-medium text-white uppercase tracking-wider text-left">
                  GBP
                </th>
                <th className="w-1/5 px-3 py-3 text-xs font-medium text-white uppercase tracking-wider text-left">
                  Total USD
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-black">
              {Object.entries(groupedData).map(([groupName, rows]) => (
                <React.Fragment key={groupName}>
                  {/* Group Header */}
                  <tr className="bg-black">
                    <td colSpan={5} className="px-6 py-2 font-semibold text-white text-left">
                      {groupName.toUpperCase()}
                    </td>
                  </tr>
                  {/* Group Rows */}
                  {rows.map((row, index) => (
                    <tr 
                      key={`${groupName}-${index}`}
                      className={`
                        bg-black ${
                          row[viewMode === 'team' ? 'Category' : 'Team'] === 'TOTAL' 
                            ? 'font-semibold' 
                            : 'hover:bg-gray-800'
                        }
                      `}
                    >
                      <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm font-medium text-white text-left">
                        {viewMode === 'team' ? row.Team : row.Category}
                      </td>
                      <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                        {viewMode === 'team' ? row.Category : row.Team}
                      </td>
                      <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                        <button
                          onClick={() => handleCellClick(row.Team, row.Category, 'USD')}
                          className="text-white hover:text-blue-300 hover:underline bg-transparent"
                        >
                          {formatCurrency(row.USD, '$')}
                        </button>
                      </td>
                      <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                        <button
                          onClick={() => handleCellClick(row.Team, row.Category, 'GBP')}
                          className="text-white hover:text-blue-300 hover:underline bg-transparent"
                        >
                          {formatCurrency(row.GBP, '£')}
                        </button>
                      </td>
                      <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                        <button
                          onClick={() => handleCellClick(row.Team, row.Category, 'Total USD')}
                          className="text-white hover:text-blue-300 hover:underline bg-transparent"
                        >
                          {formatCurrency(row['Total USD'], '$')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Add two blank rows between groups with no gridlines */}
                  <tr className="border-0"><td colSpan={5}>&nbsp;</td></tr>
                  <tr className="border-0"><td colSpan={5}>&nbsp;</td></tr>
                </React.Fragment>
              ))}
              {/* Grand Total */}
              {grandTotal && (
                <tr className="font-bold bg-black">
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                    {grandTotal[viewMode === 'team' ? 'Team' : 'Category']}
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                    {grandTotal[viewMode === 'team' ? 'Category' : 'Team']}
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                    {formatCurrency(grandTotal.USD, '$')}
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                    {formatCurrency(grandTotal.GBP, '£')}
                  </td>
                  <td className="w-1/5 px-6 py-4 whitespace-nowrap text-sm text-white text-left">
                    {formatCurrency(grandTotal['Total USD'], '$')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  console.log('FinancialDashboard rendering with viewMode:', viewMode)

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Financial Dashboard</h1>
        
        <FileUpload 
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />

        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => handleViewModeChange('team')}
            className={`mr-2 px-4 py-2 rounded-full transition-colors duration-200 ${
              viewMode === 'team'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Summary by Team
          </button>
          <button
            onClick={() => handleViewModeChange('category')}
            className={`px-4 py-2 rounded-full transition-colors duration-200 ${
              viewMode === 'category'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Summary by Category
          </button>
        </div>
        <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden w-fit">
          <div className="px-6 py-4">
            <h3 className="text-xl font-semibold text-gray-100">
              {viewMode === 'team' ? 'Team Summary' : 'Category Summary'}
            </h3>
          </div>
          <div className="border-t border-gray-700">
            {renderSummaryTable(summaryData)}
          </div>
        </div>
      </div>
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto"
          aria-labelledby="modal-title" 
          role="dialog" 
          aria-modal="true"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-black opacity-75 transition-opacity" 
              aria-hidden="true"
              style={{ position: 'fixed', zIndex: 40 }}
            ></div>
            
            <div className="inline-block align-middle bg-black rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full relative" 
                 style={{ 
                   zIndex: 50,
                   boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
                 }}>
              <div className="bg-black px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg leading-6 font-medium text-gray-100" id="modal-title">
                        Transaction Details
                      </h3>
                      <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        <span className="sr-only">Close</span>
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 max-h-[70vh] overflow-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-black">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Currency</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                          </tr>
                        </thead>
                        <tbody className="bg-black divide-y divide-gray-700">
                          {selectedTransactions.map((transaction, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {formatCurrency(transaction.Amount, transaction.Currency === 'USD' ? '$' : '£')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Currency}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Team}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-black px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setIsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}