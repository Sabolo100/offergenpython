import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const runs = await prisma.run.findMany({
      include: {
        campaign: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: { runItems: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(runs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    // Fetch all campaign contacts to create run items for each
    const campaignContacts = await prisma.campaignContact.findMany({
      where: { campaignId },
      include: {
        contact: {
          include: {
            clientCompany: true,
          },
        },
      },
    })

    const run = await prisma.run.create({
      data: {
        campaignId,
        status: 'pending',
        runItems: {
          create: campaignContacts.map((cc) => ({
            clientCompanyId: cc.contact.clientCompanyId,
            contactId: cc.contactId,
            status: 'pending',
          })),
        },
      },
      include: {
        campaign: {
          select: { id: true, name: true },
        },
        _count: {
          select: { runItems: true },
        },
      },
    })

    return NextResponse.json(run, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
  }
}
