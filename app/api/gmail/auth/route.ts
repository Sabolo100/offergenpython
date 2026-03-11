import { NextRequest, NextResponse } from 'next/server'
import { getGmailAuthUrl } from '@/lib/exporters/gmail'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }
  try {
    const authUrl = getGmailAuthUrl(companyId)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
