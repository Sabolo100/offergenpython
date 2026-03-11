import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  try {
    const designs = await prisma.design.findMany({
      where: { ownCompanyId: companyId },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(designs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch designs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const design = await prisma.design.create({ data: body })
    return NextResponse.json(design, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create design' }, { status: 500 })
  }
}
