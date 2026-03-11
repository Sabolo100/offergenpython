import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clientCompanyId = searchParams.get('clientCompanyId')

    const contacts = await prisma.contact.findMany({
      where: clientCompanyId ? { clientCompanyId } : undefined,
      include: {
        clientCompany: {
          select: { id: true, name: true, brandName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(contacts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const contact = await prisma.contact.create({ data: body })
    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
