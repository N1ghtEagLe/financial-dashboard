import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'This route is deprecated' })
}

export async function POST() {
  return NextResponse.json({ message: 'This route is deprecated' })
}
