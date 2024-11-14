'use client'

import React, { useCallback, useState } from 'react'

interface FileUploadProps {
  onUploadSuccess: (data: any) => void
  onUploadError: (error: string) => void
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx')) {
      onUploadError('Please upload an Excel (.xlsx) file')
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const data = await response.json()
      onUploadSuccess(data)
    } catch (error) {
      onUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      // Reset the input
      event.target.value = ''
    }
  }, [onUploadSuccess, onUploadError])

  return (
    <div className="mb-6">
      <label className="relative flex items-center justify-center px-6 py-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".xlsx"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <div className="text-center">
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7 7 0 018 9.291V12h2.707a1 1 0 010 2H8v2.707a1 1 0 01-2 0V12H3.293A7 7 0 018 9.293v-2.586z"></path>
              </svg>
              <span>Uploading...</span>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <span className="font-semibold text-white">Click to upload</span>
              <span className="font-normal"> or drag and drop an Excel (.xlsx) file</span>
            </div>
          )}
        </div>
      </label>
    </div>
  )
} 