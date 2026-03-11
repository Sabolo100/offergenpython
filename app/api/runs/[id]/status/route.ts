import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

/* ═══════════════════════════════════════════════════════════════
   Status-set helpers
   ═══════════════════════════════════════════════════════════════ */

/** Statuses where the research phase is already fully complete */
const RESEARCH_COMPLETE = new Set([
  'generating_offer',
  'offer_done',
  'generating_modules',
  'modules_done',
  'generating_email',
  'email_done',
  'gmail_drafting',
  'completed',
])

/** Statuses where the core-offer phase is fully complete */
const OFFER_COMPLETE = new Set([
  'generating_modules',
  'modules_done',
  'generating_email',
  'email_done',
  'gmail_drafting',
  'completed',
])

/** Statuses where the modules phase is fully complete */
const MODULES_COMPLETE = new Set([
  'generating_email',
  'email_done',
  'gmail_drafting',
  'completed',
])

type SubItemStatus = 'done' | 'running' | 'pending'

/* ═══════════════════════════════════════════════════════════════
   GET handler
   ═══════════════════════════════════════════════════════════════ */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    // ── 1. Fetch the run + its items ──────────────────────────────────────────
    const run = await prisma.run.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        campaignId: true,
        runItems: {
          select: {
            id: true,
            status: true,
            currentStep: true,
            errorMessage: true,
            clientCompanyId: true,
            contact: { select: { id: true, name: true, email: true } },
            clientCompany: { select: { id: true, name: true, brandName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const runItemIds = run.runItems.map((ri) => ri.id)
    const clientCompanyIds = [...new Set(run.runItems.map((ri) => ri.clientCompanyId))]

    // ── 2. Batch queries for sub-progress ─────────────────────────────────────
    const [researchDefs, moduleDefs, researchResults, moduleInstances, coreOffers] =
      await Promise.all([
        prisma.researchDefinition.findMany({
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { priority: 'asc' },
        }),
        prisma.moduleDefinition.findMany({
          where: { campaignId: run.campaignId },
          select: { id: true, name: true },
          orderBy: { order: 'asc' },
        }),
        prisma.researchResult.findMany({
          where: {
            clientCompanyId: { in: clientCompanyIds },
            status: 'done',
          },
          select: { clientCompanyId: true, researchDefinitionId: true },
        }),
        prisma.moduleInstance.findMany({
          where: {
            runItemId: { in: runItemIds },
            status: 'done',
          },
          select: { runItemId: true, moduleDefinitionId: true },
        }),
        prisma.coreOffer.findMany({
          where: { runItemId: { in: runItemIds } },
          select: { runItemId: true },
        }),
      ])

    // ── 3. Build lookup sets for O(1) membership checks ───────────────────────
    const doneResearch = new Set(
      researchResults.map((r) => `${r.clientCompanyId}:${r.researchDefinitionId}`)
    )
    const doneModules = new Set(
      moduleInstances.map((m) => `${m.runItemId}:${m.moduleDefinitionId}`)
    )
    const doneCoreOffers = new Set(coreOffers.map((c) => c.runItemId))

    // ── 4. Build enriched run items ───────────────────────────────────────────
    const richRunItems = run.runItems.map((item) => {
      const { status, clientCompanyId } = item

      const isResearchComplete = RESEARCH_COMPLETE.has(status)
      const isOfferComplete = OFFER_COMPLETE.has(status)
      const isModulesComplete = MODULES_COMPLETE.has(status)
      const isResearching = status === 'researching'
      const isGeneratingOffer = status === 'generating_offer'
      const isGeneratingModules = status === 'generating_modules'
      const isGeneratingEmail = status === 'generating_email' || status === 'gmail_drafting'

      // ── Research sub-items (sequential → first without result = running) ───
      let foundResearchRunning = false
      const researchItems = researchDefs.map((def) => {
        const isDone =
          isResearchComplete ||
          doneResearch.has(`${clientCompanyId}:${def.id}`)

        if (isDone) return { id: def.id, name: def.name, status: 'done' as SubItemStatus }

        if (isResearching && !foundResearchRunning) {
          foundResearchRunning = true
          return { id: def.id, name: def.name, status: 'running' as SubItemStatus }
        }

        return { id: def.id, name: def.name, status: 'pending' as SubItemStatus }
      })

      // ── Module sub-items (sequential → first without instance = running) ──
      let foundModuleRunning = false
      const moduleItems = moduleDefs.map((def) => {
        const isDone =
          isModulesComplete ||
          doneModules.has(`${item.id}:${def.id}`)

        if (isDone) return { id: def.id, name: def.name, status: 'done' as SubItemStatus }

        if (isGeneratingModules && !foundModuleRunning) {
          foundModuleRunning = true
          return { id: def.id, name: def.name, status: 'running' as SubItemStatus }
        }

        return { id: def.id, name: def.name, status: 'pending' as SubItemStatus }
      })

      // ── Single-item phases ─────────────────────────────────────────────────
      const coreOfferDone = doneCoreOffers.has(item.id) || isOfferComplete
      const coreOfferRunning = isGeneratingOffer && !coreOfferDone

      const emailDone = status === 'completed'
      const emailRunning = isGeneratingEmail

      return {
        id: item.id,
        status: item.status,
        currentStep: item.currentStep,
        errorMessage: item.errorMessage,
        contact: item.contact,
        clientCompany: item.clientCompany,
        researchProgress: {
          total: researchDefs.length,
          completed: researchItems.filter((i) => i.status === 'done').length,
          items: researchItems,
        },
        coreOffer: {
          done: coreOfferDone,
          running: coreOfferRunning,
        },
        moduleProgress: {
          total: moduleDefs.length,
          completed: moduleItems.filter((i) => i.status === 'done').length,
          items: moduleItems,
        },
        email: {
          done: emailDone,
          running: emailRunning,
        },
      }
    })

    return NextResponse.json({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      runItems: richRunItems,
    })
  } catch (error) {
    console.error('[Status API]', error)
    return NextResponse.json({ error: 'Failed to fetch run status' }, { status: 500 })
  }
}
