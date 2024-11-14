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

    console.log('Starting upload with API URL:', API_URL)
    console.log('API Key exists:', !!API_KEY)

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

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Upload error:', errorData)
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      console.log('Upload success:', data)
      onUploadSuccess(data)
    } catch (error) {
      console.error('Upload error:', error)
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