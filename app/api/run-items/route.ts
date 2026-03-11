import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const completed = searchParams.get('completed')

    const where = completed
      ? {
          status: {
            in: ['modules_done', 'export_done', 'email_done', 'completed'],
          },
        }
      : {}

    const runItems = await prisma.runItem.findMany({
      where,
      include: {
        clientCompany: { select: { name: true } },
        contact: { select: { name: true, email: true } },
        exports: { select: { type: true, fileUrl: true }, orderBy: { createdAt: 'desc' } },
        emailDrafts: { select: { status: true, gmailDraftId: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        run: {
          select: {
            campaign: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(runItems)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch run items' }, { status: 500 })
  }
}
