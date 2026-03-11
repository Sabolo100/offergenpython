import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const runItem = await prisma.runItem.findUnique({
      where: { id },
      include: {
        clientCompany: true,
        contact: true,
        coreOffer: true,
        moduleInstances: {
          include: { moduleDefinition: true },
          orderBy: { moduleDefinition: { order: 'asc' } },
        },
        emailDrafts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        exports: {
          orderBy: { createdAt: 'desc' },
        },
        run: {
          include: {
            campaign: { select: { name: true, language: true } },
          },
        },
      },
    })

    if (!runItem) {
      return NextResponse.json({ error: 'RunItem not found' }, { status: 404 })
    }

    return NextResponse.json(runItem)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch run item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const runItem = await prisma.runItem.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(runItem)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update run item' }, { status: 500 })
  }
}
