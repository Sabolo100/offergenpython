import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// PDF generation using @react-pdf/renderer
// We do server-side rendering of the PDF
export async function generatePDF(runItemId: string): Promise<string> {
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
          campaign: {
            include: { design: true },
          },
        },
      },
    },
  })

  if (!runItem) throw new Error('RunItem not found')

  const design = runItem.run.campaign.design?.config as Record<string, string> | null
  const primaryColor = design?.primaryColor || '#2563EB'
  const companyName = runItem.clientCompany.name
  const contactName = runItem.contact?.name || ''
  const campaignName = runItem.run.campaign.name

  // Build HTML content for PDF
  const modulesHtml = runItem.moduleInstances
    .map((mi) => {
      const content = mi.content as { text?: string }
      const text = content.text || ''
      return `
        <div style="margin-bottom: 32px; page-break-inside: avoid;">
          <h2 style="font-size: 18px; font-weight: bold; color: ${primaryColor}; margin-bottom: 12px; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px;">
            ${mi.moduleDefinition.name}
          </h2>
          <div style="font-size: 13px; line-height: 1.8; color: #374151; white-space: pre-wrap;">${text}</div>
        </div>
      `
    })
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #1F2937; }
    .header { background: ${primaryColor}; color: white; padding: 32px 40px; margin: -40px -40px 40px; }
    .header h1 { font-size: 28px; margin: 0 0 8px; }
    .header p { margin: 0; opacity: 0.8; font-size: 14px; }
    .meta { display: flex; gap: 24px; margin-bottom: 32px; font-size: 13px; color: #6B7280; }
    .meta span { display: flex; align-items: center; gap: 4px; }
    .section { margin-bottom: 32px; }
    .section h2 { font-size: 18px; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 8px; margin-bottom: 12px; }
    .core-offer { background: #F8FAFC; border-left: 4px solid ${primaryColor}; padding: 20px; border-radius: 4px; font-size: 13px; line-height: 1.8; white-space: pre-wrap; margin-bottom: 40px; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${campaignName}</h1>
    <p>${companyName}${contactName ? ' · ' + contactName : ''}</p>
  </div>

  ${
    runItem.coreOffer
      ? `
  <div class="section">
    <h2>Összefoglaló ajánlat</h2>
    <div class="core-offer">${runItem.coreOffer.content}</div>
  </div>`
      : ''
  }

  ${modulesHtml}

  <div class="footer">
    <p>Generálva: ${new Date().toLocaleDateString('hu-HU')} · OfferGen Platform</p>
  </div>
</body>
</html>
  `

  // Save HTML file and use it as the export (in production, use puppeteer or similar)
  const exportDir = path.join(process.cwd(), 'public', 'exports')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const filename = `offer-${runItemId}-v${Date.now()}.html`
  const filePath = path.join(exportDir, filename)
  fs.writeFileSync(filePath, html, 'utf-8')

  const fileUrl = `/exports/${filename}`

  // Save export record
  await prisma.export.create({
    data: {
      runItemId,
      type: 'pdf',
      fileUrl,
      filePath,
    },
  })

  return fileUrl
}
