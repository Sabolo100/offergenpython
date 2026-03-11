import axios, { AxiosError } from 'axios'

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'
const PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL ?? 'sonar-pro'

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface PerplexityChoice {
  message: {
    role: string
    content: string
  }
  finish_reason: string
  index: number
}

interface PerplexityResponse {
  id: string
  model: string
  choices: PerplexityChoice[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Run a research query against the Perplexity API.
 *
 * @param prompt     - The research prompt; may contain the {{CLIENT_NAME}} placeholder.
 * @param clientName - The actual client company name used to replace {{CLIENT_NAME}}.
 * @returns The assistant's text response from Perplexity.
 * @throws  If the API key is missing, the request fails, or no content is returned.
 */
export async function perplexitySearch(
  prompt: string,
  clientName: string
): Promise<string> {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY environment variable is not set')
  }

  const resolvedPrompt = prompt.replace(/\{\{CLIENT_NAME\}\}/g, clientName)

  const messages: PerplexityMessage[] = [
    {
      role: 'system',
      content:
        'You are a professional B2B market research assistant. Provide detailed, factual, structured information.',
    },
    {
      role: 'user',
      content: resolvedPrompt,
    },
  ]

  try {
    const response = await axios.post<PerplexityResponse>(
      PERPLEXITY_API_URL,
      {
        model: PERPLEXITY_MODEL,
        messages,
        max_tokens: 4096,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60_000,
      }
    )

    const content = response.data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Perplexity API returned an empty response')
    }

    return content
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status
      const detail = JSON.stringify(err.response?.data ?? err.message)
      throw new Error(
        `Perplexity API request failed (HTTP ${status ?? 'unknown'}): ${detail}`
      )
    }
    throw err
  }
}
