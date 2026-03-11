import { NextResponse } from 'next/server'
import { getGmailAuthUrl } from '@/lib/exporters/gmail'

export async function GET() {
  try {
    const authUrl = getGmailAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 })
  }
}
