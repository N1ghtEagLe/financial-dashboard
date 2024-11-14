import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      console.log('No file received in request')
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      )
    }

    console.log('Received file:', file.name)

    const pythonFormData = new FormData()
    pythonFormData.append('file', file)

    console.log('Sending request to Python service...')
    
    const response = await fetch('http://localhost:8000/process', {
      method: 'POST',
      body: pythonFormData,
    })

    console.log('Python service response status:', response.status)

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Python service error:', data)
      return NextResponse.json(
        { error: data.error || 'Error processing file' },
        { status: response.status }
      )
    }

    console.log('Successfully processed data')
    return NextResponse.json(data)

  } catch (error) {
    console.error('Detailed error:', error)
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