import { NextRequest, NextResponse } from 'next/server'
import { createGmailDraft } from '@/lib/exporters/gmail'

export async function POST(request: NextRequest) {
  try {
    const { runItemId } = await request.json()
    if (!runItemId) {
      return NextResponse.json({ error: 'runItemId required' }, { status: 400 })
    }
    const gmailDraftId = await createGmailDraft(runItemId)
    return NextResponse.json({ gmailDraftId, success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Gmail draft'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
