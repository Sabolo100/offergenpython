import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { modules } = body as { modules: { id: string; order: number }[] }

    if (!modules || !Array.isArray(modules)) {
      return NextResponse.json({ error: 'Invalid payload: modules array required' }, { status: 400 })
    }

    const updates = await prisma.$transaction(
      modules.map(({ id, order }) =>
        prisma.moduleDefinition.update({
          where: { id },
          data: { order },
        })
      )
    )

    return NextResponse.json(updates)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reorder module definitions' }, { status: 500 })
  }
}
