import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get('companyId')
  if (!companyId) return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  try {
    const [clientCount, campaignCount, runCount, completedRunItemCount] = await Promise.all([
      prisma.clientCompany.count({ where: { ownCompanyId: companyId } }),
      prisma.campaign.count({ where: { ownCompanyId: companyId } }),
      prisma.run.count({ where: { campaign: { ownCompanyId: companyId } } }),
      prisma.runItem.count({
        where: { status: 'completed', run: { campaign: { ownCompanyId: companyId } } },
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
