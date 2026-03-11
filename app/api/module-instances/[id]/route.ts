import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const instance = await prisma.moduleInstance.findUnique({
      where: { id },
      include: { moduleDefinition: true },
    })
    if (!instance) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(instance)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const updated = await prisma.moduleInstance.update({
      where: { id },
      data: {
        content: body.content ?? body,
        version: { increment: 1 },
      },
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update module instance' }, { status: 500 })
  }
}
