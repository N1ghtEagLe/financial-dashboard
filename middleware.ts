import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only redirect the root path to login
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Allow all other paths to proceed
  return NextResponse.next()
}

// Only match the root path for now
export const config = {
  matcher: '/'
}