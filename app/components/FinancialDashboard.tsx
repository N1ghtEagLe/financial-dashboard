'use client'

import React, { useState, useEffect } from 'react'

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

export default function FinancialDashboard() {
  const [viewMode, setViewMode] = useState<'team' | 'category'>('team')
  const [summaryData, setSummaryData] = useState<SummaryData[]>(mockSummaryByTeam)
  const [selectedTransactions, setSelectedTransactions] = useState<RawTransaction[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    setSummaryData(viewMode === 'team' ? mockSummaryByTeam : mockSummaryByCategory)
  }, [viewMode])

  const handleCellClick = (team: string, category: string) => {
    const key = `${team},${category}`
    const transactions = mockRawDataMapping[key] || []
    setSelectedTransactions(transactions)
    setIsModalOpen(true)
  }

  const renderSummaryTable = (data: SummaryData[]) => (
    <table className="min-w-full divide-y divide-gray-700 rounded-lg overflow-hidden">
      <thead className="bg-gray-800">
        <tr>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            {viewMode === 'team' ? 'Team' : 'Category'}
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            {viewMode === 'team' ? 'Category' : 'Team'}
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            USD
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            GBP
          </th>
          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
            Total USD
          </th>
        </tr>
      </thead>
      <tbody className="bg-gray-900 divide-y divide-gray-700">
        {data.map((row, index) => (
          <tr key={index}>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
              {row[viewMode === 'team' ? 'Team' : 'Category']}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              {row[viewMode === 'team' ? 'Category' : 'Team']}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <button
                onClick={() => handleCellClick(row.Team, row.Category)}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                ${row.USD.toFixed(2)}
              </button>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <button
                onClick={() => handleCellClick(row.Team, row.Category)}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                £{row.GBP.toFixed(2)}
              </button>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
              <button
                onClick={() => handleCellClick(row.Team, row.Category)}
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                ${row['Total USD'].toFixed(2)}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Financial Dashboard</h1>
        <div className="mb-6">
          <button
            onClick={() => setViewMode('team')}
            className={`mr-2 px-4 py-2 rounded-full transition-colors duration-200 ${
              viewMode === 'team'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Summary by Team
          </button>
          <button
            onClick={() => setViewMode('category')}
            className={`px-4 py-2 rounded-full transition-colors duration-200 ${
              viewMode === 'category'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Summary by Category
          </button>
        </div>
        <div className="bg-gray-800 shadow-lg rounded-lg overflow-hidden">
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
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-100" id="modal-title">
                      Transaction Details
                    </h3>
                    <div className="mt-2">
                      <table className="min-w-full divide-y divide-gray-700 rounded-lg overflow-hidden">
                        <thead className="bg-gray-900">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Currency</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Team</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Category</th>
                          </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                          {selectedTransactions.map((transaction, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Description}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{transaction.Amount.toFixed(2)}</td>
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
              <div className="bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
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