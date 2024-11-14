'use client'

import React, { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL
const API_KEY = process.env.NEXT_PUBLIC_API_KEY

export default function FileUpload({ onUploadSuccess, onUploadError }: {
  onUploadSuccess: (data: any) => void
  onUploadError: (error: string) => void
}) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    console.log('Starting upload...')
    console.log('API URL:', API_URL)
    console.log('File name:', file.name)

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: {
          'X-API-Key': API_KEY || '',
        },
        body: formData,
      })

      console.log('Response status:', response.status)
      
      // Log the raw response text for debugging
      const responseText = await response.text()
      console.log('Raw response:', responseText)

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        console.error('Error response:', data)
        throw new Error(data.error || 'Upload failed')
      }

      console.log('Success response:', data)
      onUploadSuccess(data)
    } catch (error) {
      console.error('Upload error details:', error)
      onUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="mb-6">
      <label className="relative inline-block">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          disabled={isUploading}
        />
        <span className={`
          px-4 py-2 rounded-full transition-colors duration-200
          ${isUploading 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}
          text-white
        `}>
          {isUploading ? 'Uploading...' : 'Upload Excel File'}
        </span>
      </label>
    </div>
  )
} 