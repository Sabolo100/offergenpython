import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const campaignContacts = await prisma.campaignContact.findMany({
      where: { campaignId: id },
      include: {
        contact: {
          include: {
            clientCompany: {
              select: { id: true, name: true, brandName: true, industry: true, country: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(campaignContacts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch campaign contacts' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { contactId } = body

    const campaignContact = await prisma.campaignContact.create({
      data: {
        campaignId: id,
        contactId,
      },
      include: {
        contact: {
          include: {
            clientCompany: {
              select: { id: true, name: true, brandName: true },
            },
          },
        },
      },
    })
    return NextResponse.json(campaignContact, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add contact to campaign' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body = await request.json()
    const { contactIds } = body

    // Delete all existing campaign contacts and re-add the provided ones
    await prisma.campaignContact.deleteMany({
      where: { campaignId: id },
    })

    if (contactIds && contactIds.length > 0) {
      await prisma.campaignContact.createMany({
        data: contactIds.map((contactId: string) => ({
          campaignId: id,
          contactId,
        })),
        skipDuplicates: true,
      })
    }

    const campaignContacts = await prisma.campaignContact.findMany({
      where: { campaignId: id },
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
    })
    return NextResponse.json(campaignContacts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update campaign contacts' }, { status: 500 })
  }
}
