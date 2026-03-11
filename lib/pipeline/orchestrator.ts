import { prisma } from '@/lib/prisma'
import { runResearchForClient } from './research-runner'
import { generateCoreOffer } from './offer-generator'
import { generateModules } from './module-generator'
import { generateEmail } from './email-generator'

// ─── Types ────────────────────────────────────────────────────────────────────

type RunItemStatus =
  | 'pending'
  | 'researching'
  | 'generating_offer'
  | 'generating_modules'
  | 'generating_email'
  | 'completed'
  | 'error'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Update a RunItem's status (and optional currentStep label) in the database.
 */
async function updateRunItemStatus(
  id: string,
  status: RunItemStatus,
  step?: string
): Promise<void> {
  await prisma.runItem.update({
    where: { id },
    data: {
      status,
      currentStep: step ?? status,
    },
  })
}

// ─── processRunItem ────────────────────────────────────────────────────────────

/**
 * Execute the full generation pipeline for a single RunItem.
 *
 * Steps (in order):
 *   1. Research    — gather client intelligence via Perplexity / Claude
 *   2. Core Offer  — synthesise a personalised core offer text
 *   3. Modules     — generate all campaign module instances
 *   4. Email       — draft the outreach email
 *
 * Each step updates the RunItem status so progress can be tracked in real time.
 * Any error sets the RunItem to 'error' and records the message before re-throwing.
 *
 * @param runItemId - ID of the RunItem to process.
 */
export async function processRunItem(runItemId: string): Promise<void> {
  // Fetch minimal RunItem data needed for the research runner
  const runItem = await prisma.runItem.findUniqueOrThrow({
    where: { id: runItemId },
    select: { clientCompanyId: true },
  })

  // ── Step 1: Research ───────────────────────────────────────────────────────
  await updateRunItemStatus(runItemId, 'researching', 'research')
  try {
    await runResearchForClient(runItem.clientCompanyId, runItemId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.runItem.update({
      where: { id: runItemId },
      data: { status: 'error', currentStep: 'research', errorMessage: message },
    })
    throw new Error(`[research] ${message}`)
  }

  // ── Step 2: Core Offer ─────────────────────────────────────────────────────
  await updateRunItemStatus(runItemId, 'generating_offer', 'core_offer')
  try {
    await generateCoreOffer(runItemId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.runItem.update({
      where: { id: runItemId },
      data: { status: 'error', currentStep: 'core_offer', errorMessage: message },
    })
    throw new Error(`[core_offer] ${message}`)
  }

  // ── Step 3: Modules ────────────────────────────────────────────────────────
  await updateRunItemStatus(runItemId, 'generating_modules', 'modules')
  try {
    await generateModules(runItemId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.runItem.update({
      where: { id: runItemId },
      data: { status: 'error', currentStep: 'modules', errorMessage: message },
    })
    throw new Error(`[modules] ${message}`)
  }

  // ── Step 4: Email ──────────────────────────────────────────────────────────
  await updateRunItemStatus(runItemId, 'generating_email', 'email')
  try {
    await generateEmail(runItemId)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await prisma.runItem.update({
      where: { id: runItemId },
      data: { status: 'error', currentStep: 'email', errorMessage: message },
    })
    throw new Error(`[email] ${message}`)
  }

  // ── All steps complete ─────────────────────────────────────────────────────
  await updateRunItemStatus(runItemId, 'completed', 'done')
}

// ─── startRun ─────────────────────────────────────────────────────────────────

/**
 * Kick off a Run for the given runId.
 *
 * 1. Marks the Run as 'running' and records startedAt.
 * 2. Loads all CampaignContacts for the campaign.
 * 3. Creates a RunItem for each contact.
 * 4. Processes all RunItems in parallel via Promise.allSettled.
 * 5. Marks the Run as 'completed' (all succeeded) or 'partial' (some failed).
 *
 * @param runId - ID of the Run to start.
 */
export async function startRun(runId: string): Promise<void> {
  // ── 1. Ensure Run is marked as running (idempotent – may already be set by API) ──
  const run = await prisma.run.findUniqueOrThrow({
    where: { id: runId },
    include: { campaign: true },
  })

  if (run.status !== 'running') {
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'running', startedAt: new Date() },
    })
  }

  // ── 2. Use existing RunItems (created when the Run was first created) ──────
  const existingItems = await prisma.runItem.findMany({
    where: { runId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })

  const runItemIds = existingItems.map((ri) => ri.id)

  // ── 3. Fallback: create RunItems only if none exist ────────────────────────
  if (runItemIds.length === 0) {
    const campaignContacts = await prisma.campaignContact.findMany({
      where: { campaignId: run.campaignId },
      include: {
        contact: {
          select: { id: true, clientCompanyId: true },
        },
      },
    })

    if (campaignContacts.length === 0) {
      await prisma.run.update({
        where: { id: runId },
        data: { status: 'completed', completedAt: new Date() },
      })
      return
    }

    for (const cc of campaignContacts) {
      const runItem = await prisma.runItem.create({
        data: {
          runId,
          clientCompanyId: cc.contact.clientCompanyId,
          contactId: cc.contactId,
          status: 'pending',
        },
        select: { id: true },
      })
      runItemIds.push(runItem.id)
    }
  }

  if (runItemIds.length === 0) {
    await prisma.run.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: new Date() },
    })
    return
  }

  // ── 4. Process all RunItems in parallel ────────────────────────────────────
  const results = await Promise.allSettled(
    runItemIds.map((id) => processRunItem(id))
  )

  // ── 5. Determine final Run status ──────────────────────────────────────────
  const hasFailures = results.some((r) => r.status === 'rejected')
  const hasSuccesses = results.some((r) => r.status === 'fulfilled')

  let finalStatus: 'completed' | 'partial' | 'failed'
  if (!hasFailures) {
    finalStatus = 'completed'
  } else if (hasSuccesses) {
    finalStatus = 'partial'
  } else {
    finalStatus = 'failed'
  }

  // Collect error messages for logging
  const logs = results.map((r, i) => ({
    runItemId: runItemIds[i],
    status: r.status,
    error: r.status === 'rejected'
      ? (r.reason instanceof Error ? r.reason.message : String(r.reason))
      : null,
  }))

  await prisma.run.update({
    where: { id: runId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      logs,
    },
  })
}
