import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { subject, body, emailDraftId } = await request.json()

    if (emailDraftId) {
      const updated = await prisma.emailDraft.update({
        where: { id: emailDraftId },
        data: { subject, body },
      })
      return NextResponse.json(updated)
    }

    // Find latest email draft for this runItem
    const draft = await prisma.emailDraft.findFirst({
      where: { runItemId: id },
      orderBy: { createdAt: 'desc' },
    })

    if (!draft) {
      return NextResponse.json({ error: 'No email draft found' }, { status: 404 })
    }

    const updated = await prisma.emailDraft.update({
      where: { id: draft.id },
      data: { subject, body },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update email draft' }, { status: 500 })
  }
}
