import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'

export interface EmailDraftResult {
  subject: string
  body: string
}

/**
 * Parse the Claude response looking for "SUBJECT:" and "BODY:" section markers.
 *
 * Expected format (Claude is instructed to follow this):
 * ```
 * SUBJECT: <single-line subject>
 *
 * BODY:
 * <multi-line body>
 * ```
 *
 * Falls back gracefully when the markers are absent.
 */
function parseEmailResponse(raw: string): EmailDraftResult {
  const subjectMatch = raw.match(/^SUBJECT:\s*(.+)$/im)
  const bodyMatch = raw.match(/^BODY:\s*([\s\S]+)$/im)

  if (subjectMatch && bodyMatch) {
    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim(),
    }
  }

  // Fallback: treat the first non-empty line as subject, the rest as body
  const lines = raw.trim().split('\n')
  const subject = lines[0]?.trim() ?? '(no subject)'
  const body = lines.slice(1).join('\n').trim()
  return { subject, body }
}

/**
 * Generate a personalised outreach email for a RunItem's contact and persist it
 * as an EmailDraft record.
 *
 * The function:
 * 1. Fetches the RunItem with contact, clientCompany, campaign, and moduleInstances.
 * 2. Builds a language-aware email system prompt.
 * 3. Asks Claude to produce a subject line and body using "SUBJECT:" / "BODY:" markers.
 * 4. Parses the response and upserts an EmailDraft in the database.
 *
 * @param runItemId - ID of the RunItem for which to generate the email.
 * @returns The parsed { subject, body } pair.
 */
export async function generateEmail(runItemId: string): Promise<EmailDraftResult> {
  // ── 1. Fetch RunItem with all necessary relations ─────────────────────────
  const runItem = await prisma.runItem.findUniqueOrThrow({
    where: { id: runItemId },
    include: {
      contact: true,
      clientCompany: true,
      run: {
        include: {
          campaign: true,
        },
      },
      moduleInstances: {
        include: {
          moduleDefinition: {
            select: { name: true, type: true, goal: true, order: true },
          },
        },
        orderBy: {
          moduleDefinition: { order: 'asc' },
        },
      },
    },
  })

  const { contact, clientCompany, run, moduleInstances } = runItem
  const { campaign } = run

  if (!contact) {
    throw new Error(
      `RunItem ${runItemId} has no associated contact; cannot generate email.`
    )
  }

  // ── 2. Fetch the CoreOffer for additional context ─────────────────────────
  const coreOffer = await prisma.coreOffer.findUnique({
    where: { runItemId },
    select: { content: true },
  })

  // ── 3. Build module content summary ──────────────────────────────────────
  const moduleSummaryLines = moduleInstances
    .map((mi) => {
      const text =
        typeof mi.content === 'object' &&
        mi.content !== null &&
        'text' in (mi.content as Record<string, unknown>)
          ? String((mi.content as Record<string, unknown>).text ?? '').slice(0, 400)
          : JSON.stringify(mi.content).slice(0, 400)
      return `**${mi.moduleDefinition.name}**:\n${text}…`
    })
    .join('\n\n')

  // ── 4. Build system prompt ────────────────────────────────────────────────
  const language = campaign.language ?? 'en'
  const languageLabel =
    language === 'hu'
      ? 'Hungarian'
      : language === 'de'
      ? 'German'
      : language === 'fr'
      ? 'French'
      : language === 'es'
      ? 'Spanish'
      : 'English'

  const systemPrompt = [
    `You are an expert B2B sales copywriter writing personalised cold-outreach emails.`,
    `Write in ${languageLabel}. Be professional, concise, and compelling.`,
    `Always structure your response EXACTLY as follows — include both markers on their own lines:`,
    `SUBJECT: <a single-line email subject>`,
    ``,
    `BODY:`,
    `<the full email body>`,
  ].join('\n')

  // ── 5. Build user message ─────────────────────────────────────────────────
  const sections: string[] = []

  sections.push(`## Campaign Goal\n${campaign.goal ?? '(not specified)'}`)

  sections.push(
    [
      `## Recipient`,
      `- Name: ${contact.name}`,
      contact.position ? `- Position: ${contact.position}` : null,
      `- Company: ${clientCompany.name}`,
      clientCompany.industry ? `- Industry: ${clientCompany.industry}` : null,
      clientCompany.country ? `- Country: ${clientCompany.country}` : null,
      contact.notes ? `- Notes: ${contact.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  )

  if (coreOffer?.content) {
    sections.push(
      `## Core Offer Summary (use as reference)\n${coreOffer.content.slice(0, 1500)}…`
    )
  }

  if (moduleSummaryLines) {
    sections.push(`## Offer Modules\n${moduleSummaryLines}`)
  }

  sections.push(
    `## Task\nWrite a personalised B2B outreach email to ${contact.name} at ${clientCompany.name}. ` +
      `Reference specific details about their company and the value we can deliver. ` +
      `Keep the email under 300 words. ` +
      `Use the SUBJECT: / BODY: format exactly as instructed.`
  )

  const userMessage = sections.join('\n\n')

  // ── 6. Call Claude ────────────────────────────────────────────────────────
  const raw = await claudeChat(systemPrompt, userMessage)

  // ── 7. Parse the response ─────────────────────────────────────────────────
  const { subject, body } = parseEmailResponse(raw)

  // ── 8. Upsert EmailDraft ──────────────────────────────────────────────────
  const existingDraft = await prisma.emailDraft.findFirst({
    where: { runItemId, contactId: contact.id },
    select: { id: true },
  })

  if (existingDraft) {
    await prisma.emailDraft.update({
      where: { id: existingDraft.id },
      data: { subject, body, status: 'pending' },
    })
  } else {
    await prisma.emailDraft.create({
      data: {
        runItemId,
        contactId: contact.id,
        subject,
        body,
        status: 'pending',
      },
    })
  }

  return { subject, body }
}
