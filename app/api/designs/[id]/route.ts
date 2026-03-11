import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: { id: true, name: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!design) {
      return NextResponse.json({ error: 'Design not found' }, { status: 404 })
    }
    return NextResponse.json(design)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch design' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const design = await prisma.design.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(design)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update design' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.design.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
