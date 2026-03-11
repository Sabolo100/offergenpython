import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForToken } from '@/lib/exporters/gmail'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const stateRaw = searchParams.get('state')

  if (error) {
    return NextResponse.redirect(new URL('/settings?gmail=error', request.url))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?gmail=no-code', request.url))
  }

  let companyId: string | undefined
  try {
    if (stateRaw) {
      const parsed = JSON.parse(stateRaw)
      companyId = parsed.companyId
    }
  } catch {}

  if (!companyId) {
    return NextResponse.redirect(new URL('/settings?gmail=no-company', request.url))
  }

  try {
    await exchangeCodeForToken(code, companyId)
    return NextResponse.redirect(new URL('/settings?gmail=success', request.url))
  } catch (err) {
    console.error('Gmail OAuth error:', err)
    return NextResponse.redirect(new URL('/settings?gmail=failed', request.url))
  }
}
