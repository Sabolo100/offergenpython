import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type ClaudeModel =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-3-5'

/**
 * Send a single-turn chat message to Claude and return the text response.
 *
 * @param systemPrompt - The system-level instructions for Claude.
 * @param userMessage  - The user-turn message content.
 * @param model        - The Claude model to use (defaults to claude-opus-4-6).
 * @returns The assistant's text reply.
 * @throws  If the API call fails or the response content is not plain text.
 */
export async function claudeChat(
  systemPrompt: string,
  userMessage: string,
  model: ClaudeModel = 'claude-opus-4-6'
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }

  const response = await client.messages.create({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error(
      `Unexpected response content type from Claude: "${content.type}"`
    )
  }

  return content.text
}
