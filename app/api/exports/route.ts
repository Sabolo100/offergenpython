import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePDF } from '@/lib/exporters/pdf'
import { generatePPT } from '@/lib/exporters/ppt'
import { generateResearchPPT } from '@/lib/exporters/research-ppt'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const runItemId = searchParams.get('runItemId')

    const where = runItemId ? { runItemId } : {}
    const exports = await prisma.export.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(exports)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { runItemId, type } = await request.json()
    if (!runItemId || !type) {
      return NextResponse.json({ error: 'runItemId and type required' }, { status: 400 })
    }

    if (type === 'pdf') {
      const fileUrl = await generatePDF(runItemId)

      // Update RunItem status
      await prisma.runItem.update({
        where: { id: runItemId },
        data: { status: 'export_done', currentStep: 'export_done' },
      })

      return NextResponse.json({ fileUrl, type: 'pdf' }, { status: 201 })
    }

    if (type === 'ppt') {
      const fileUrl = await generatePPT(runItemId)
      return NextResponse.json({ fileUrl, type: 'ppt' }, { status: 201 })
    }

    if (type === 'research-ppt') {
      const fileUrl = await generateResearchPPT(runItemId)
      return NextResponse.json({ fileUrl, type: 'research-ppt' }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unsupported export type' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
