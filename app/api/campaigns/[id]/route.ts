import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        moduleDefinitions: {
          orderBy: { order: 'asc' },
        },
        campaignContacts: {
          include: {
            contact: {
              include: {
                clientCompany: {
                  select: { id: true, name: true, brandName: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        design: true,
        _count: {
          select: { runs: true },
        },
      },
    })
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    return NextResponse.json(campaign)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const campaign = await prisma.campaign.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(campaign)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await prisma.campaign.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 })
  }
}
