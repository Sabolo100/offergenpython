import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const def = await prisma.moduleDefinition.findUnique({
      where: { id },
      include: {
        campaign: {
          select: { id: true, name: true },
        },
      },
    })
    if (!def) {
      return NextResponse.json({ error: 'Module definition not found' }, { status: 404 })
    }
    return NextResponse.json(def)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch module definition' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const def = await prisma.moduleDefinition.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(def)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update module definition' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.moduleDefinition.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete module definition' }, { status: 500 })
  }
}
