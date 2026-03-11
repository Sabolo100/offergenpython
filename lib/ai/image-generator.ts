import { GoogleGenAI } from '@google/genai'

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? 'gemini-3.1-flash-image-preview'

/**
 * Generate a 16:9 business image using Google Gemini Imagen.
 *
 * @param prompt - English description of the image to generate.
 *                 Should describe a professional business photo without text.
 * @returns Base64-encoded PNG string (without the data URI prefix).
 * @throws If GEMINI_API_KEY is not set, or if the model returns no image.
 */
export async function generateSlideImage(prompt: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: prompt,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '1K',
      },
    },
  })

  // Extract the first IMAGE part from the response
  const parts = response.candidates?.[0]?.content?.parts ?? []
  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data as string // already base64
    }
  }

  throw new Error(`Gemini returned no image for prompt: "${prompt.slice(0, 80)}…"`)
}
