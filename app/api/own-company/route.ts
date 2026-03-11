import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const company = await prisma.ownCompany.findFirst({
      include: {
        knowledgeItems: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch own company' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const company = await prisma.ownCompany.create({ data: body })
    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create own company' }, { status: 500 })
  }
}
