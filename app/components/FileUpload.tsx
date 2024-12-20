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

    console.log('Starting upload to:', API_URL)
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('Sending request...')
      const response = await fetch(`${API_URL}/process`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      })

      console.log('Response received:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        throw new Error(errorData.error || 'Upload failed')
      }

      const data = await response.json()
      console.log('Success data:', data)
      onUploadSuccess(data)
    } catch (error) {
      console.error('Upload error:', error)
      onUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
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