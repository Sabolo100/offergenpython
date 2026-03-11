import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const def = await prisma.researchDefinition.findUnique({
      where: { id },
      include: {
        _count: {
          select: { results: true },
        },
      },
    })
    if (!def) {
      return NextResponse.json({ error: 'Research definition not found' }, { status: 404 })
    }
    return NextResponse.json(def)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch research definition' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const def = await prisma.researchDefinition.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(def)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update research definition' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.researchDefinition.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete research definition' }, { status: 500 })
  }
}
