import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { content } = await request.json()
    if (!content) {
      return NextResponse.json({ error: 'content required' }, { status: 400 })
    }

    const updated = await prisma.coreOffer.upsert({
      where: { runItemId: id },
      update: { content, version: { increment: 1 } },
      create: { runItemId: id, content },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update core offer' }, { status: 500 })
  }
}
