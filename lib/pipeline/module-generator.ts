import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'
import type { ModuleInstance } from '@prisma/client'

/**
 * Generate (or populate) all ModuleInstances for a RunItem.
 *
 * For each ModuleDefinition attached to the campaign:
 *  - If type === 'fixed': create a ModuleInstance with the pre-defined content verbatim.
 *  - If type === 'variable': call Claude with the module-specific prompt (or an
 *    auto-built prompt derived from the module's name and goal) plus client context
 *    and the already-generated CoreOffer.
 *
 * @param runItemId - ID of the RunItem for which modules should be generated.
 * @returns Array of created/updated ModuleInstance records.
 */
export async function generateModules(
  runItemId: string
): Promise<ModuleInstance[]> {
  // ── 1. Fetch RunItem with campaign module definitions ─────────────────────
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
            },
          },
        },
      },
    },
  })

  const { clientCompany, contact, run } = runItem
  const moduleDefinitions = run.campaign.moduleDefinitions

  // ── 2. Fetch the CoreOffer generated in the previous step ─────────────────
  const coreOffer = await prisma.coreOffer.findUnique({
    where: { runItemId },
  })

  const coreOfferText = coreOffer?.content ?? ''

  // ── 3. Fetch research summaries for context ───────────────────────────────
  const researchResults = await prisma.researchResult.findMany({
    where: { clientCompanyId: clientCompany.id, status: 'done' },
    include: { researchDefinition: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Build a concise research summary string
  const researchSummary = researchResults.length > 0
    ? researchResults
        .map((r) => `[${r.researchDefinition.name}]: ${r.content.slice(0, 500)}…`)
        .join('\n\n')
    : 'No research data available.'

  // Contact info string for prompt injection
  const contactLine = contact
    ? `${contact.name}${contact.position ? `, ${contact.position}` : ''}`
    : 'the decision maker'

  // ── 4. Process each module definition in order ────────────────────────────
  const instances: ModuleInstance[] = []

  for (const moduleDef of moduleDefinitions) {
    let content: Record<string, unknown>

    if (moduleDef.type === 'fixed') {
      // Use the fixed content verbatim
      content = { text: moduleDef.fixedContent ?? '' }
    } else {
      // variable — generate with Claude
      const systemPrompt = [
        `You are a specialist in B2B offer content creation.`,
        `Generate the "${moduleDef.name}" section of a personalised sales offer.`,
        run.campaign.language
          ? `Respond in language: ${run.campaign.language}.`
          : '',
        'Be specific, professional, and persuasive.',
        'Format the output as clean prose unless the module goal suggests otherwise.',
      ]
        .filter(Boolean)
        .join('\n')

      // Build the user-facing prompt
      let modulePrompt: string

      if (moduleDef.prompt && moduleDef.prompt.trim().length > 0) {
        // Use the author-defined module prompt, resolving common placeholders
        modulePrompt = moduleDef.prompt
          .replace(/\{\{CLIENT_NAME\}\}/g, clientCompany.name)
          .replace(/\{\{CLIENT_INDUSTRY\}\}/g, clientCompany.industry ?? '')
          .replace(/\{\{CLIENT_WEBSITE\}\}/g, clientCompany.website ?? '')
          .replace(/\{\{CONTACT_NAME\}\}/g, contact?.name ?? '')
          .replace(/\{\{CONTACT_POSITION\}\}/g, contact?.position ?? '')
          .replace(/\{\{CORE_OFFER\}\}/g, coreOfferText)
          .replace(/\{\{RESEARCH_SUMMARY\}\}/g, researchSummary)
      } else {
        // Auto-build a prompt from the module's goal and name
        const goalLine = moduleDef.goal
          ? `The goal of this module is: ${moduleDef.goal}`
          : `Generate the "${moduleDef.name}" section.`

        modulePrompt = [
          `## Module: ${moduleDef.name}`,
          goalLine,
          '',
          `## Client`,
          `- Company: ${clientCompany.name}`,
          clientCompany.industry ? `- Industry: ${clientCompany.industry}` : '',
          clientCompany.website ? `- Website: ${clientCompany.website}` : '',
          `- Contact: ${contactLine}`,
          '',
          `## Core Offer (for context)`,
          coreOfferText || '(not yet generated)',
          '',
          `## Research Summary`,
          researchSummary,
          '',
          `## Task`,
          `Write the "${moduleDef.name}" module content for the offer above. ` +
            `${moduleDef.goal ? `Goal: ${moduleDef.goal}` : ''}`.trim(),
        ]
          .filter((line) => line !== null)
          .join('\n')
      }

      const generatedText = await claudeChat(systemPrompt, modulePrompt)
      content = { text: generatedText }
    }

    // Upsert the ModuleInstance (safe for retries)
    const instance = await prisma.moduleInstance.upsert({
      where: {
        // There is no unique constraint on (runItemId, moduleDefinitionId) in the
        // schema; we find an existing record manually and fall back to create.
        // Prisma upsert requires a unique where, so we use a findFirst + create/update pattern.
        id: await getExistingModuleInstanceId(runItemId, moduleDef.id),
      },
      create: {
        runItemId,
        moduleDefinitionId: moduleDef.id,
        content: content as import('@prisma/client').Prisma.InputJsonValue,
        status: 'done',
        version: 1,
      },
      update: {
        content: content as import('@prisma/client').Prisma.InputJsonValue,
        status: 'done',
        version: { increment: 1 },
      },
    })

    instances.push(instance)
  }

  return instances
}

/**
 * Find the ID of an existing ModuleInstance for a given RunItem + ModuleDefinition pair.
 * Returns a sentinel value ('__new__') when no record exists so that the upsert
 * always hits the `create` branch for new instances.
 *
 * Note: Prisma's upsert `where` must reference a unique field. Because the schema
 * does not declare a @@unique on (runItemId, moduleDefinitionId), we resolve the
 * real ID here and fall back to a non-existent ID to force an insert.
 */
async function getExistingModuleInstanceId(
  runItemId: string,
  moduleDefinitionId: string
): Promise<string> {
  const existing = await prisma.moduleInstance.findFirst({
    where: { runItemId, moduleDefinitionId },
    select: { id: true },
  })
  // '__new__' will never match an existing cuid, so upsert will create
  return existing?.id ?? '__new__'
}
