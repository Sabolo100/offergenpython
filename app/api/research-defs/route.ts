import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const defs = await prisma.researchDefinition.findMany({
      include: {
        _count: {
          select: { results: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json(defs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch research definitions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const def = await prisma.researchDefinition.create({ data: body })
    return NextResponse.json(def, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create research definition' }, { status: 500 })
  }
}
