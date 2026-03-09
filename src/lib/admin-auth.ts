import { NextRequest, NextResponse } from 'next/server'

interface AuthResult {
  authorized: boolean
  response?: NextResponse
}

export function requireAdmin(req: NextRequest): AuthResult {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Admin auth not configured' },
        { status: 500 },
      ),
    }
  }

  const header = req.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token || token !== secret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 },
      ),
    }
  }

  return { authorized: true }
}
