import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const [clientCount, campaignCount, runCount, completedRunItemCount] = await Promise.all([
      prisma.clientCompany.count(),
      prisma.campaign.count(),
      prisma.run.count(),
      prisma.runItem.count({
        where: { status: 'completed' },
      }),
    ])

    return NextResponse.json({
      clientCount,
      campaignCount,
      runCount,
      completedRunItemCount,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
