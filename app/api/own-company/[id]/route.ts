import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const company = await prisma.ownCompany.findUnique({
      where: { id },
      include: {
        knowledgeItems: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!company) {
      return NextResponse.json({ error: 'Own company not found' }, { status: 404 })
    }
    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch own company' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const company = await prisma.ownCompany.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update own company' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.ownCompany.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete own company' }, { status: 500 })
  }
}
