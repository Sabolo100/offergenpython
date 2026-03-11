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

interface SlideContent {
  title: string
  bullets: string[]
  imagePrompt: string
}

/* ═══════════════════════════════════════════════════════════════════
   Design tokens
   ═══════════════════════════════════════════════════════════════════ */

const COLORS = {
  primary: '1E3A5F',     // dark navy
  accent: 'E8F4FD',      // light blue
  text: '1A1A2E',        // near-black
  textLight: '6B7280',   // gray
  white: 'FFFFFF',
  overlayBg: '000000',   // for cover overlay
}

// Slide dimensions for LAYOUT_16x9 (inches)
const W = 10    // total width
const H = 5.625 // total height

/* ═══════════════════════════════════════════════════════════════════
   Image helpers
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Center-crop a base64 PNG to the given aspect ratio (targetW : targetH).
 * Returns a base64 PNG string without the data URI prefix.
 *
 * Needed because pptxgenjs `sizing: 'cover'` is unreliable – it stretches
 * instead of cropping. We pre-crop with Sharp before handing the image to pptx.
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

  if (!srcW || !srcH) return base64 // safety – return original if metadata missing

  const targetRatio = targetW / targetH
  const srcRatio = srcW / srcH

  let cropW: number, cropH: number, left: number, top: number

  if (srcRatio > targetRatio) {
    // Source is wider than target → keep full height, crop sides
    cropH = srcH
    cropW = Math.round(srcH * targetRatio)
    left = Math.floor((srcW - cropW) / 2)
    top = 0
  } else {
    // Source is taller than target → keep full width, crop top/bottom
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
   Claude: condense module text → slide content
   ═══════════════════════════════════════════════════════════════════ */

async function condenseModuleForSlide(
  moduleName: string,
  moduleText: string,
  language: string
): Promise<SlideContent> {
  const systemPrompt =
    'You condense B2B offer module content for a single presentation slide. ' +
    'Return ONLY valid JSON with no markdown fences or extra text.'

  const userMessage = [
    `Module: ${moduleName}`,
    `Content:\n${moduleText.slice(0, 3000)}`,
    '',
    'Return a JSON object with exactly these fields:',
    `- title: string  (max 7 words, language: ${language})`,
    `- bullets: string[]  (3-4 items, max 15 words each, language: ${language})`,
    '- imagePrompt: string  (English, professional business photo, no text, 16:9, relevant to module topic)',
  ].join('\n')

  const raw = await claudeChat(systemPrompt, userMessage, 'claude-sonnet-4-5')

  // Extract JSON even if there's surrounding text
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error(`Claude returned no JSON for module "${moduleName}"`)
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<SlideContent>

  return {
    title: parsed.title ?? moduleName,
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 4) : [],
    imagePrompt:
      parsed.imagePrompt ??
      `Professional B2B business presentation scene for "${moduleName}", corporate style, no text`,
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Slide builders
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Cover slide: full-bleed image with dark overlay + company/contact text.
 */
function buildCoverSlide(
  pptx: pptxgen,
  companyName: string,
  contactLine: string,
  campaignName: string,
  coverImageBase64: string | null,
  primaryColor: string
) {
  const slide = pptx.addSlide()

  if (coverImageBase64) {
    slide.addImage({
      data: `image/png;base64,${coverImageBase64}`,
      x: 0, y: 0, w: W, h: H,
    })
    // Semi-transparent dark overlay for readability
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: COLORS.overlayBg, transparency: 40 },
      line: { width: 0, color: COLORS.overlayBg },
    })
  } else {
    // Gradient-style fallback: solid primary color background
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: 0, y: 0, w: W, h: H,
      fill: { color: primaryColor },
      line: { width: 0, color: primaryColor },
    })
  }

  // Accent bar at bottom
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: H - 1.1, w: W, h: 1.1,
    fill: { color: COLORS.overlayBg, transparency: 30 },
    line: { width: 0, color: COLORS.overlayBg },
  })

  // Campaign (sub-heading)
  slide.addText(campaignName, {
    x: 0.6, y: H - 1.0, w: W - 1.2, h: 0.35,
    fontSize: 11, color: 'CCDDEE', italic: true,
  })

  // Company name (large)
  slide.addText(companyName, {
    x: 0.6, y: H - 2.8, w: W - 1.2, h: 1.4,
    fontSize: 38, bold: true, color: COLORS.white,
    wrap: true,
  })

  // Contact line
  if (contactLine) {
    slide.addText(contactLine, {
      x: 0.6, y: H - 0.65, w: W - 1.2, h: 0.35,
      fontSize: 12, color: 'DDDDDD',
    })
  }

  // Date (bottom-right corner)
  slide.addText(new Date().toLocaleDateString('hu-HU'), {
    x: W - 2, y: H - 0.35, w: 1.8, h: 0.25,
    fontSize: 9, color: 'AAAAAA', align: 'right',
  })
}

/**
 * Module slide: AI image on the right, condensed content on the left.
 */
function buildModuleSlide(
  pptx: pptxgen,
  slideContent: SlideContent,
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

  // ── Right panel: image or placeholder ─────────────────────────
  if (imageBase64) {
    slide.addImage({
      data: `image/png;base64,${imageBase64}`,
      x: splitX, y: 0, w: W - splitX, h: H,
    })
  } else {
    // Soft blue placeholder
    slide.addShape('rect' as pptxgen.SHAPE_NAME, {
      x: splitX, y: 0, w: W - splitX, h: H,
      fill: { color: COLORS.accent },
      line: { width: 0, color: COLORS.accent },
    })
  }

  // ── Top accent line (left panel) ──────────────────────────────
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0.35, y: 0.38, w: 0.35, h: 0.06,
    fill: { color: primaryColor },
    line: { width: 0, color: primaryColor },
  })

  // ── Module title ───────────────────────────────────────────────
  slide.addText(slideContent.title, {
    x: 0.35, y: 0.55, w: splitX - 0.5, h: 1.1,
    fontSize: 22, bold: true, color: primaryColor,
    wrap: true,
  })

  // ── Bullets ────────────────────────────────────────────────────
  if (slideContent.bullets.length > 0) {
    const bulletItems = slideContent.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: '25CF', color: primaryColor }, // filled circle
        color: COLORS.text,
        fontSize: 14,
        paraSpaceBefore: 6,
      },
    }))

    slide.addText(bulletItems, {
      x: 0.35, y: 1.8, w: splitX - 0.55, h: H - 2.3,
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

/**
 * Closing slide: CTA + contact info on a branded background.
 */
function buildClosingSlide(
  pptx: pptxgen,
  companyName: string,
  contactLine: string,
  primaryColor: string
) {
  const slide = pptx.addSlide()

  // Background
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: 0, y: 0, w: W, h: H,
    fill: { color: primaryColor },
    line: { width: 0, color: primaryColor },
  })

  // Subtle pattern: light rectangle in the lower-right
  slide.addShape('rect' as pptxgen.SHAPE_NAME, {
    x: W * 0.6, y: H * 0.5, w: W * 0.5, h: H * 0.6,
    fill: { color: COLORS.white, transparency: 90 },
    line: { width: 0, color: COLORS.white },
  })

  // Thank-you message (centre)
  slide.addText('Köszönjük a figyelmet!', {
    x: 0.8, y: 1.2, w: W - 1.6, h: 1,
    fontSize: 32, bold: true, color: COLORS.white,
    align: 'center',
  })

  slide.addText('Örömmel válaszolunk minden kérdésre.', {
    x: 0.8, y: 2.3, w: W - 1.6, h: 0.5,
    fontSize: 16, color: COLORS.accent,
    align: 'center',
  })

  // Contact info
  if (contactLine) {
    slide.addText(contactLine, {
      x: 0.8, y: 3.3, w: W - 1.6, h: 0.5,
      fontSize: 13, color: COLORS.white,
      align: 'center',
    })
  }

  // Company name (bottom)
  slide.addText(companyName, {
    x: 0.8, y: H - 0.7, w: W - 1.6, h: 0.4,
    fontSize: 10, color: 'AACCEE',
    align: 'center',
  })
}

/* ═══════════════════════════════════════════════════════════════════
   Main export function
   ═══════════════════════════════════════════════════════════════════ */

/**
 * Generate a client-facing PPTX presentation for a RunItem.
 *
 * Each module becomes one slide with condensed text (Claude Sonnet)
 * and an AI-generated image (Gemini Imagen).
 *
 * @param runItemId - The RunItem to generate a presentation for.
 * @returns The public file URL (`/exports/filename.pptx`).
 */
export async function generatePPT(runItemId: string): Promise<string> {
  // ── 1. Fetch all required data ────────────────────────────────────
  const runItem = await prisma.runItem.findUnique({
    where: { id: runItemId },
    include: {
      clientCompany: true,
      contact: true,
      coreOffer: true,
      moduleInstances: {
        include: { moduleDefinition: true },
        orderBy: { moduleDefinition: { order: 'asc' } },
      },
      run: {
        include: {
          campaign: { include: { design: true } },
        },
      },
    },
  })

  if (!runItem) throw new Error('RunItem not found')

  const { clientCompany, contact, run } = runItem
  const campaign = run.campaign
  const design = campaign.design?.config as Record<string, string> | null
  const primaryColor = (design?.primaryColor ?? COLORS.primary).replace('#', '')
  const language = campaign.language ?? 'hu'

  const companyName = clientCompany.brandName ?? clientCompany.name
  const contactLine = contact
    ? `${contact.name}${contact.position ? ` · ${contact.position}` : ''}  ·  ${contact.email}`
    : ''

  // Only process modules that have text content
  const modules = runItem.moduleInstances.filter(
    (mi) => (mi.content as { text?: string }).text?.trim()
  )

  // ── 2. Cover image ────────────────────────────────────────────────
  const coverPrompt = [
    `Professional corporate B2B hero image for a business proposal`,
    clientCompany.industry ? `for a company in the "${clientCompany.industry}" industry` : '',
    `modern office or professional setting, no text, 16:9 aspect ratio, high quality`,
  ]
    .filter(Boolean)
    .join(', ')

  let coverImageBase64: string | null = null
  try {
    coverImageBase64 = await generateSlideImage(coverPrompt)
  } catch (e) {
    console.warn('[PPT] Cover image generation failed, using fallback:', e)
  }

  // ── 3. Condense modules + generate images in parallel ─────────────
  const moduleSlideData = await Promise.allSettled(
    modules.map(async (mi) => {
      const text = (mi.content as { text?: string }).text ?? ''
      const moduleName = mi.moduleDefinition.name

      // 3a. Claude Sonnet → slide content
      const slideContent = await condenseModuleForSlide(moduleName, text, language)

      // 3b. Gemini → image (graceful degradation)
      let imageBase64: string | null = null
      try {
        const raw = await generateSlideImage(slideContent.imagePrompt)
        // Pre-crop to the right panel's 4:5 aspect ratio so pptxgenjs
        // doesn't stretch the image (W*0.45 wide × H tall = 4.5 × 5.625 = 4:5)
        imageBase64 = await cropToRatio(raw, W * 0.45, H)
      } catch (e) {
        console.warn(`[PPT] Image generation/crop failed for module "${moduleName}":`, e)
      }

      return { slideContent, imageBase64, moduleName }
    })
  )

  // ── 4. Build the PPTX ─────────────────────────────────────────────
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_16x9'

  // Author meta
  pptx.author = 'OfferGen'
  pptx.company = companyName
  pptx.subject = campaign.name
  pptx.title = `${companyName} – ${campaign.name}`

  // Count total content slides (modules) + 1 closing
  const successfulSlides = moduleSlideData.filter((r) => r.status === 'fulfilled')
  const totalContentSlides = successfulSlides.length

  // 4a. Cover slide
  buildCoverSlide(pptx, companyName, contactLine, campaign.name, coverImageBase64, primaryColor)

  // 4b. Module slides
  let slideIdx = 1
  for (const result of moduleSlideData) {
    if (result.status === 'fulfilled') {
      const { slideContent, imageBase64 } = result.value
      buildModuleSlide(
        pptx,
        slideContent,
        imageBase64,
        slideIdx,
        totalContentSlides,
        primaryColor
      )
      slideIdx++
    } else {
      console.warn('[PPT] Skipping module slide due to error:', result.reason)
    }
  }

  // 4c. Closing slide
  buildClosingSlide(pptx, companyName, contactLine, primaryColor)

  // ── 5. Save to disk ───────────────────────────────────────────────
  const exportDir = path.join(process.cwd(), 'public', 'exports')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const filename = `ppt-${runItemId}-v${Date.now()}.pptx`
  const filePath = path.join(exportDir, filename)

  await pptx.writeFile({ fileName: filePath })

  const fileUrl = `/exports/${filename}`

  // ── 6. Persist Export record ──────────────────────────────────────
  await prisma.export.create({
    data: {
      runItemId,
      type: 'ppt',
      fileUrl,
      filePath,
    },
  })

  return fileUrl
}
