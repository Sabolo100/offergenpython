import pptxgen from 'pptxgenjs'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'
import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'
import { generateSlideImage } from '@/lib/ai/image-generator'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

interface ResearchSlideContent {
  title: string
  subtitle: string
  bullets: string[]
  imagePrompt: string
}

/* ═══════════════════════════════════════════════════════════════════
   Design tokens
   ═══════════════════════════════════════════════════════════════════ */

const COLORS = {
  primary: '1E3A5F',   // dark navy
  accent: 'E8F4FD',    // light blue
  text: '1A1A2E',      // near-black
  textLight: '6B7280', // gray
  white: 'FFFFFF',
  overlayBg: '000000',
}

const W = 10     // slide width  (inches, LAYOUT_16x9)
const H = 5.625  // slide height (inches)

/* ═══════════════════════════════════════════════════════════════════
   Image helpers
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Center-crop a base64 PNG to the given aspect ratio.
 * Prevents pptxgenjs from stretching images.
 */
async function cropToRatio(
  base64: string,
  targetW: number,
  targetH: number
): Promise<string> {
  const buffer = Buffer.from(base64, 'base64')
  const image = sharp(buffer)
  const meta = await image.metadata()
  const srcW = meta.width ?? 0
  const srcH = meta.height ?? 0

  if (!srcW || !srcH) return base64

  const targetRatio = targetW / targetH
  const srcRatio = srcW / srcH

  let cropW: number, cropH: number, left: number, top: number

  if (srcRatio > targetRatio) {
    // Source is wider → keep full height, crop sides
    cropH = srcH
    cropW = Math.round(srcH * targetRatio)
    left = Math.floor((srcW - cropW) / 2)
    top = 0
  } else {
    // Source is taller → keep full width, crop top/bottom
    cropW = srcW
    cropH = Math.round(srcW / targetRatio)
    left = 0
    top = Math.floor((srcH - cropH) / 2)
  }

  const cropped = await image
    .extract({ left, top, width: cropW, height: cropH })
    .png()
    .toBuffer()

  return cropped.toString('base64')
}

/* ═══════════════════════════════════════════════════════════════════
   Claude: condense research findings → slide content
   ═══════════════════════════════════════════════════════════════════ */

async function condenseResearchForSlide(
  topicName: string,
  topicDescription: string | null,
  content: string,
  language: string
): Promise<ResearchSlideContent> {
  const systemPrompt =
    'You condense B2B market research findings for a single presentation slide. ' +
    'Return ONLY valid JSON with no markdown fences or extra text.'

  const userMessage = [
    `Research topic: ${topicName}`,
    topicDescription ? `Description: ${topicDescription}` : null,
    `Findings:\n${content.slice(0, 4000)}`,
    '',
    'Return a JSON object with exactly these fields:',
    `- title: string  (max 8 words, the research headline, language: ${language})`,
    `- subtitle: string  (max 15 words, the single most important insight, language: ${language})`,
    `- bullets: string[]  (4-6 items, concise key findings with numbers/percentages/data where available, max 20 words each, language: ${language})`,
    '- imagePrompt: string  (English, infographic or abstract data-visualization style illustration, professional, no text or labels visible, relevant to the topic, 16:9)',
  ]
    .filter(Boolean)
    .join('\n')

  const raw = await claudeChat(systemPrompt, userMessage, 'claude-sonnet-4-5')

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Claude returned no JSON for research topic "${topicName}"`)
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<ResearchSlideContent>

  return {
    title: parsed.title ?? topicName,
    subtitle: parsed.subtitle ?? '',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 6) : [],
    imagePrompt:
      parsed.imagePrompt ??
      `Professional infographic data visualization for "${topicName}", abstract geometric shapes, corporate blue palette, no text`,
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Slide builders
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Cover slide: full-bleed image + dark overlay + company name + report title.
 */
function buildCoverSlide(
  pptx: pptxgen,
  companyName: string,
  coverImageBase64: string | null,
  primaryColor: string
) {
  const slide = pptx.addSlide()

  if (coverImageBase64) {
    slide.addImage({
      data: `image/png;base64,${coverImageBase64}`,
      x: 0, y: 0, w: W, h: H,
    })
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: COLORS.overlayBg, transparency: 35 },
      line: { width: 0, color: COLORS.overlayBg },
    })
  } else {
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: primaryColor },
      line: { width: 0, color: primaryColor },
    })
  }

  // Bottom dark bar
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: H - 1.4, w: W, h: 1.4,
    fill: { color: COLORS.overlayBg, transparency: 25 },
    line: { width: 0, color: COLORS.overlayBg },
  })

  // "KUTATÁSI JELENTÉS" tag
  slide.addText('KUTATÁSI JELENTÉS', {
    x: 0.6, y: 1.1, w: 5, h: 0.35,
    fontSize: 11, color: 'AACCEE', bold: true, charSpacing: 2.5,
  })

  // Company name (large)
  slide.addText(companyName, {
    x: 0.6, y: 1.6, w: W - 1.2, h: 1.6,
    fontSize: 42, bold: true, color: COLORS.white,
    wrap: true,
  })

  // Date (bottom-right)
  slide.addText(new Date().toLocaleDateString('hu-HU'), {
    x: W - 2, y: H - 0.36, w: 1.8, h: 0.26,
    fontSize: 9, color: 'AAAAAA', align: 'right',
  })
}

/**
 * Research slide: AI infographic on the right, condensed findings on the left.
 * Includes subtitle (key insight) + horizontal rule + bullets.
 */
function buildResearchSlide(
  pptx: pptxgen,
  content: ResearchSlideContent,
  imageBase64: string | null,
  slideIndex: number,
  totalSlides: number,
  primaryColor: string
) {
  const slide = pptx.addSlide()
  const splitX = W * 0.55 // 55% left / 45% right

  // ── Left panel background ──────────────────────────────────────
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: splitX, h: H,
    fill: { color: COLORS.white },
    line: { width: 0, color: COLORS.white },
  })

  // ── Right panel: infographic image or placeholder ──────────────
  if (imageBase64) {
    slide.addImage({
      data: `image/png;base64,${imageBase64}`,
      x: splitX, y: 0, w: W - splitX, h: H,
    })
  } else {
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: splitX, y: 0, w: W - splitX, h: H,
      fill: { color: COLORS.accent },
      line: { width: 0, color: COLORS.accent },
    })
    // Placeholder icon hint
    slide.addText('📊', {
      x: splitX + 0.5, y: H / 2 - 0.4, w: W - splitX - 1, h: 0.8,
      fontSize: 32, align: 'center',
    })
  }

  // ── Top accent bar (full width of left panel) ──────────────────
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: splitX, h: 0.07,
    fill: { color: primaryColor },
    line: { width: 0, color: primaryColor },
  })

  // ── "KUTATÁS" micro-label ──────────────────────────────────────
  slide.addText('KUTATÁS', {
    x: 0.35, y: 0.16, w: 1.5, h: 0.22,
    fontSize: 7.5, color: primaryColor, bold: true, charSpacing: 1.5,
  })

  // ── Title ──────────────────────────────────────────────────────
  slide.addText(content.title, {
    x: 0.35, y: 0.42, w: splitX - 0.5, h: 0.95,
    fontSize: 19, bold: true, color: primaryColor,
    wrap: true,
  })

  // ── Subtitle (key insight) ─────────────────────────────────────
  if (content.subtitle) {
    slide.addText(content.subtitle, {
      x: 0.35, y: 1.42, w: splitX - 0.5, h: 0.45,
      fontSize: 11, italic: true, color: COLORS.textLight,
      wrap: true,
    })
  }

  // ── Horizontal rule ───────────────────────────────────────────
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0.35, y: 1.92, w: splitX - 0.7, h: 0.03,
    fill: { color: COLORS.accent },
    line: { width: 0, color: COLORS.accent },
  })

  // ── Bullets (key findings) ────────────────────────────────────
  if (content.bullets.length > 0) {
    const bulletItems = content.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: '25CF', color: primaryColor },
        color: COLORS.text,
        fontSize: 11.5,
        paraSpaceBefore: 5,
      },
    }))

    slide.addText(bulletItems, {
      x: 0.35, y: 2.0, w: splitX - 0.55, h: H - 2.45,
      valign: 'top',
      wrap: true,
    })
  }

  // ── Slide counter (bottom-left) ────────────────────────────────
  slide.addText(`${slideIndex} / ${totalSlides}`, {
    x: 0.35, y: H - 0.28, w: 1, h: 0.22,
    fontSize: 8, color: COLORS.textLight,
  })
}

/* ═══════════════════════════════════════════════════════════════════
   Main export function
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Generate a comprehensive research report PPTX for a RunItem.
 *
 * Cover slide + one slide per completed ResearchResult for the client company.
 * Each slide shows condensed findings (Claude Sonnet) and an AI infographic
 * (Gemini Imagen), pre-cropped to 4:5 with Sharp.
 *
 * @param runItemId - The RunItem whose client company's research to export.
 * @returns The public file URL (`/exports/filename.pptx`).
 */
export async function generateResearchPPT(runItemId: string): Promise<string> {
  // ── 1. Fetch RunItem ──────────────────────────────────────────────
  const runItem = await prisma.runItem.findUnique({
    where: { id: runItemId },
    include: {
      clientCompany: true,
      run: {
        include: {
          campaign: { include: { design: true } },
        },
      },
    },
  })

  if (!runItem) throw new Error('RunItem not found')

  const { clientCompany, run } = runItem
  const campaign = run.campaign
  const design = campaign.design?.config as Record<string, string> | null
  const primaryColor = (design?.primaryColor ?? COLORS.primary).replace('#', '')
  const language = campaign.language ?? 'hu'
  const companyName = clientCompany.brandName ?? clientCompany.name

  // ── 2. Fetch all completed research results for this client ────────
  const allResults = await prisma.researchResult.findMany({
    where: {
      clientCompanyId: clientCompany.id,
      status: 'done',
    },
    include: { researchDefinition: true },
    orderBy: { createdAt: 'desc' },
  })

  // Deduplicate: keep most recent result per research definition
  const seenDefs = new Set<string>()
  const uniqueResults = allResults.filter((r) => {
    if (seenDefs.has(r.researchDefinitionId)) return false
    seenDefs.add(r.researchDefinitionId)
    return true
  })

  if (uniqueResults.length === 0) {
    throw new Error('No completed research results found for this company. Run the pipeline first.')
  }

  // Sort by research definition priority (ascending)
  uniqueResults.sort(
    (a, b) => (a.researchDefinition.priority ?? 0) - (b.researchDefinition.priority ?? 0)
  )

  // ── 3. Cover image ────────────────────────────────────────────────
  const coverPrompt = [
    'Professional corporate research report hero image',
    clientCompany.industry ? `related to "${clientCompany.industry}" industry` : '',
    'data analytics, modern office setting, abstract visualization, no text, 16:9, high quality',
  ]
    .filter(Boolean)
    .join(', ')

  let coverImageBase64: string | null = null
  try {
    coverImageBase64 = await generateSlideImage(coverPrompt)
  } catch (e) {
    console.warn('[ResearchPPT] Cover image generation failed, using fallback:', e)
  }

  // ── 4. Condense findings + generate infographics in parallel ───────
  const slideData = await Promise.allSettled(
    uniqueResults.map(async (r) => {
      const def = r.researchDefinition

      // 4a. Claude Sonnet → slide content
      const content = await condenseResearchForSlide(
        def.name,
        def.description ?? null,
        r.content,
        language
      )

      // 4b. Gemini → infographic image (graceful degradation)
      let imageBase64: string | null = null
      try {
        const raw = await generateSlideImage(content.imagePrompt)
        // Pre-crop to right panel ratio: 4.5" × 5.625" = 4:5 portrait
        imageBase64 = await cropToRatio(raw, W * 0.45, H)
      } catch (e) {
        console.warn(`[ResearchPPT] Image failed for "${def.name}":`, e)
      }

      return { content, imageBase64, topicName: def.name }
    })
  )

  // ── 5. Build PPTX ─────────────────────────────────────────────────
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'OfferGen'
  pptx.company = companyName
  pptx.subject = `Kutatási Jelentés – ${campaign.name}`
  pptx.title = `${companyName} – Kutatási Jelentés`

  const successfulSlides = slideData.filter((r) => r.status === 'fulfilled')
  const totalSlides = successfulSlides.length

  // 5a. Cover slide
  buildCoverSlide(pptx, companyName, coverImageBase64, primaryColor)

  // 5b. Research slides
  let slideIdx = 1
  for (const result of slideData) {
    if (result.status === 'fulfilled') {
      const { content, imageBase64 } = result.value
      buildResearchSlide(pptx, content, imageBase64, slideIdx, totalSlides, primaryColor)
      slideIdx++
    } else {
      console.warn('[ResearchPPT] Skipping slide due to error:', result.reason)
    }
  }

  // ── 6. Save to disk ───────────────────────────────────────────────
  const exportDir = path.join(process.cwd(), 'public', 'exports')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const filename = `research-ppt-${runItemId}-v${Date.now()}.pptx`
  const filePath = path.join(exportDir, filename)

  await pptx.writeFile({ fileName: filePath })

  const fileUrl = `/exports/${filename}`

  // ── 7. Persist Export record ──────────────────────────────────────
  await prisma.export.create({
    data: {
      runItemId,
      type: 'research-ppt',
      fileUrl,
      filePath,
    },
  })

  return fileUrl
}
