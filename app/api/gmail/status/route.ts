import { NextResponse } from 'next/server'
import { getGmailConnectionStatus } from '@/lib/exporters/gmail'

export async function GET() {
  try {
    const status = await getGmailConnectionStatus()
    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json({ connected: false }, { status: 200 })
  }
}
