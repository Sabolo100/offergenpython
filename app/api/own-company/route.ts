import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const companies = await prisma.ownCompany.findMany({
      select: { id: true, name: true, description: true, website: true },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(companies)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch own companies' }, { status: 500 })
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
