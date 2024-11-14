import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    // Create new FormData for Python service
    const pythonFormData = new FormData()
    pythonFormData.append('file', file)

    // Call Python service
    const response = await fetch('http://localhost:8000/process', {
      method: 'POST',
      body: pythonFormData,
    })

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'Error processing file' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Error processing file upload:', error)
    return NextResponse.json(
      { error: 'Error processing file upload' },
      { status: 500 }
    )
  }
}

export const config = {
  api: {
    bodyParser: false, // Disable body parser as we're handling multipart/form-data
  },
}