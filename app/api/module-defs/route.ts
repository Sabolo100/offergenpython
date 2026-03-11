import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')

    const defs = await prisma.moduleDefinition.findMany({
      where: campaignId ? { campaignId } : undefined,
      include: {
        campaign: { select: { id: true, name: true } },
      },
      orderBy: [{ campaignId: 'asc' }, { order: 'asc' }],
    })
    return NextResponse.json(defs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch module definitions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const def = await prisma.moduleDefinition.create({ data: body })
    return NextResponse.json(def, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create module definition' }, { status: 500 })
  }
}
