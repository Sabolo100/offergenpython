import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/exporters/gmail'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?gmail=no-code', request.url))
  }

  try {
    await exchangeCodeForToken(code)
    return NextResponse.redirect(new URL('/settings?gmail=success', request.url))
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(new URL('/settings?gmail=failed', request.url))
  }
}
