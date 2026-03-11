import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'

/**
 * Generate the core offer text for a RunItem and persist it as a CoreOffer record.
 *
 * The function:
 * 1. Fetches the RunItem with its associated ClientCompany, Contact, and Campaign
 *    (including ModuleDefinitions and Design).
 * 2. Fetches all KnowledgeItems from the OwnCompany.
 * 3. Fetches all ResearchResults already produced for the client.
 * 4. Builds a comprehensive system prompt and user message.
 * 5. Calls Claude to generate the offer.
 * 6. Saves the result as a CoreOffer and returns the content string.
 *
 * @param runItemId - ID of the RunItem for which to generate the core offer.
 * @returns The generated offer text.
 */
export async function generateCoreOffer(runItemId: string): Promise<string> {
  // ── 1. Fetch RunItem with all necessary relations ─────────────────────────
  const runItem = await prisma.runItem.findUniqueOrThrow({
    where: { id: runItemId },
    include: {
      clientCompany: true,
      contact: true,
      run: {
        include: {
          campaign: {
            include: {
              moduleDefinitions: {
                orderBy: { order: 'asc' },
              },
              design: true,
            },
          },
        },
      },
    },
  })

  const { clientCompany, contact, run } = runItem
  const { campaign } = run

  // ── 2. Fetch own-company knowledge items ──────────────────────────────────
  const ownCompany = await prisma.ownCompany.findUnique({
    where: { id: campaign.ownCompanyId },
    include: {
      knowledgeItems: {
        orderBy: { type: 'asc' },
      },
    },
  })

  // ── 3. Fetch research results for this client ─────────────────────────────
  const researchResults = await prisma.researchResult.findMany({
    where: {
      clientCompanyId: clientCompany.id,
      status: 'done',
    },
    include: {
      researchDefinition: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // ── 4. Build system prompt ────────────────────────────────────────────────
  const systemPrompt = [
    campaign.systemPrompt,
    '',
    'You are generating a personalised B2B sales offer.',
    'Be specific, professional, and persuasive.',
    'Use the research data and knowledge base provided to craft a compelling offer.',
    campaign.language
      ? `Respond in language: ${campaign.language}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  // ── 5. Build user message ─────────────────────────────────────────────────
  const sections: string[] = []

  // Campaign goal
  if (campaign.goal) {
    sections.push(`## Campaign Goal\n${campaign.goal}`)
  }

  // Client information
  const clientLines = [
    `**Company:** ${clientCompany.name}`,
    clientCompany.brandName ? `**Brand:** ${clientCompany.brandName}` : null,
    clientCompany.industry ? `**Industry:** ${clientCompany.industry}` : null,
    clientCompany.country ? `**Country:** ${clientCompany.country}` : null,
    clientCompany.website ? `**Website:** ${clientCompany.website}` : null,
    clientCompany.notes ? `**Notes:** ${clientCompany.notes}` : null,
  ].filter(Boolean)

  if (contact) {
    clientLines.push(`**Contact Person:** ${contact.name}`)
    if (contact.position) clientLines.push(`**Position:** ${contact.position}`)
    if (contact.notes) clientLines.push(`**Contact Notes:** ${contact.notes}`)
  }

  sections.push(`## Client Information\n${clientLines.join('\n')}`)

  // Research results
  if (researchResults.length > 0) {
    const researchSection = researchResults
      .map(
        (r) =>
          `### ${r.researchDefinition.name}\n${r.content}`
      )
      .join('\n\n')
    sections.push(`## Research Results\n${researchSection}`)
  }

  // Knowledge base summary
  if (ownCompany && ownCompany.knowledgeItems.length > 0) {
    const knowledgeSection = ownCompany.knowledgeItems
      .map((k) => `### [${k.type.toUpperCase()}] ${k.title}\n${k.content}`)
      .join('\n\n')
    sections.push(
      `## Our Company Knowledge Base (${ownCompany.name})\n${knowledgeSection}`
    )
  }

  // Module definitions (names + goals)
  if (campaign.moduleDefinitions.length > 0) {
    const modulesSection = campaign.moduleDefinitions
      .map((m) => {
        const goalLine = m.goal ? ` — Goal: ${m.goal}` : ''
        return `- **${m.name}** (${m.type})${goalLine}`
      })
      .join('\n')
    sections.push(
      `## Offer Modules to Cover\nThe final offer will include the following sections. Keep each in mind when writing the core offer:\n${modulesSection}`
    )
  }

  sections.push(
    '## Task\nWrite a comprehensive core offer that addresses all modules listed above. ' +
      'Be specific to this client\'s situation and industry. ' +
      'This core offer will be used as input for generating individual module content.'
  )

  const userMessage = sections.join('\n\n')

  // ── 6. Call Claude ────────────────────────────────────────────────────────
  const content = await claudeChat(systemPrompt, userMessage)

  // ── 7. Persist CoreOffer (upsert in case of retries) ─────────────────────
  await prisma.coreOffer.upsert({
    where: { runItemId },
    create: {
      runItemId,
      content,
      version: 1,
    },
    update: {
      content,
      version: { increment: 1 },
    },
  })

  return content
}
