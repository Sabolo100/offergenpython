import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { startRun } from '@/lib/pipeline/orchestrator'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // ── 1. Immediately mark the Run as running (BEFORE returning response) ──
    // This ensures the client sees status='running' on the next fetch,
    // eliminating the race condition where fetchRun() returns 'pending'.
    await prisma.run.update({
      where: { id },
      data: { status: 'running', startedAt: new Date() },
    })

    // ── 2. Fire-and-forget the actual pipeline processing ───────────────────
    // startRun will detect status='running' and skip the initial update.
    startRun(id).catch((error) => {
      console.error(`[Pipeline] Run ${id} failed:`, error)
    })

    return NextResponse.json({ message: 'Pipeline started', runId: id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start run'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
