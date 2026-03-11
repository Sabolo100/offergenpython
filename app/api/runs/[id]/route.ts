import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const run = await prisma.run.findUnique({
      where: { id },
      include: {
        campaign: {
          select: { id: true, name: true, status: true, language: true },
        },
        runItems: {
          include: {
            contact: {
              select: { id: true, name: true, position: true, email: true },
            },
            clientCompany: {
              select: { id: true, name: true, brandName: true, industry: true, country: true, website: true },
            },
            coreOffer: true,
            moduleInstances: {
              include: {
                moduleDefinition: {
                  select: { id: true, name: true, type: true, order: true },
                },
              },
              orderBy: { moduleDefinition: { order: 'asc' } },
            },
            exports: {
              orderBy: { createdAt: 'desc' },
            },
            emailDrafts: {
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }
    return NextResponse.json(run)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 })
  }
}
