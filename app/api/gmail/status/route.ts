import { NextRequest, NextResponse } from 'next/server'
import { getGmailConnectionStatus } from '@/lib/exporters/gmail'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ connected: false }, { status: 200 })
  try {
    const status = await getGmailConnectionStatus(companyId)
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ connected: false }, { status: 200 })
  }
}
