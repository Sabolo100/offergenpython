import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'
import { perplexitySearch } from '@/lib/ai/perplexity'
import type { ResearchResult } from '@prisma/client'

const PLACEHOLDER_MAP = {
  CLIENT_NAME: (name: string) => name,
  CLIENT_WEBSITE: (website: string | null) => website ?? '',
  CLIENT_INDUSTRY: (industry: string | null) => industry ?? '',
} as const

/**
 * Replace template placeholders in a research prompt with real client data.
 */
function resolvePrompt(
  prompt: string,
  clientName: string,
  clientWebsite: string | null,
  clientIndustry: string | null
): string {
  return prompt
    .replace(/\{\{CLIENT_NAME\}\}/g, PLACEHOLDER_MAP.CLIENT_NAME(clientName))
    .replace(
      /\{\{CLIENT_WEBSITE\}\}/g,
      PLACEHOLDER_MAP.CLIENT_WEBSITE(clientWebsite)
    )
    .replace(
      /\{\{CLIENT_INDUSTRY\}\}/g,
      PLACEHOLDER_MAP.CLIENT_INDUSTRY(clientIndustry)
    )
}

/**
 * Check whether an existing ResearchResult is still considered fresh.
 */
function isFresh(createdAt: Date, freshnessDays: number): boolean {
  const ageMs = Date.now() - createdAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  return ageDays < freshnessDays
}

/**
 * Run all active research definitions for a given client company.
 *
 * - Fetches all active ResearchDefinitions ordered by priority (ascending).
 * - Reuses an existing ResearchResult when it is within the definition's freshness window.
 * - Otherwise runs the appropriate AI platform (Perplexity or Claude) and persists the result.
 * - Associates each new result with the provided RunItem.
 *
 * @param clientCompanyId - ID of the ClientCompany to research.
 * @param runItemId       - ID of the RunItem that triggered this research pass.
 * @returns Array of ResearchResult records (both reused and freshly generated).
 */
export async function runResearchForClient(
  clientCompanyId: string,
  runItemId: string
): Promise<ResearchResult[]> {
  // Fetch the client company
  const clientCompany = await prisma.clientCompany.findUniqueOrThrow({
    where: { id: clientCompanyId },
    select: {
      id: true,
      name: true,
      website: true,
      industry: true,
    },
  })

  // Fetch all active research definitions, ordered by priority ascending
  const definitions = await prisma.researchDefinition.findMany({
    where: { isActive: true },
    orderBy: { priority: 'asc' },
  })

  if (definitions.length === 0) {
    return []
  }

  const results: ResearchResult[] = []

  for (const definition of definitions) {
    // Check for a fresh existing result for this client + definition
    const existingResult = await prisma.researchResult.findFirst({
      where: {
        clientCompanyId,
        researchDefinitionId: definition.id,
        status: 'done',
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingResult && isFresh(existingResult.createdAt, definition.freshnessDays)) {
      // Reuse the existing fresh result
      results.push(existingResult)
      continue
    }

    // Resolve the prompt with actual client data
    const resolvedPrompt = resolvePrompt(
      definition.prompt,
      clientCompany.name,
      clientCompany.website,
      clientCompany.industry
    )

    let content: string
    let modelUsed: string

    try {
      if (definition.aiPlatform === 'claude') {
        const systemPrompt =
          'You are a professional B2B market research assistant. Provide detailed, factual, structured information.'
        content = await claudeChat(systemPrompt, resolvedPrompt)
        modelUsed = 'claude-opus-4-6'
      } else {
        // Default to Perplexity
        content = await perplexitySearch(definition.prompt, clientCompany.name)
        modelUsed = 'llama-3.1-sonar-large-128k-online'
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      // Persist a failed record so we can diagnose it later, then re-throw
      await prisma.researchResult.create({
        data: {
          clientCompanyId,
          researchDefinitionId: definition.id,
          runItemId,
          content: `ERROR: ${message}`,
          model: definition.aiPlatform,
          status: 'error',
        },
      })
      throw new Error(
        `Research definition "${definition.name}" failed for client "${clientCompany.name}": ${message}`
      )
    }

    const saved = await prisma.researchResult.create({
      data: {
        clientCompanyId,
        researchDefinitionId: definition.id,
        runItemId,
        content,
        model: modelUsed,
        status: 'done',
      },
    })

    results.push(saved)
  }

  return results
}
