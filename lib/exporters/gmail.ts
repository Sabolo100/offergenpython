import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3000/api/gmail/callback'
  )
}

export function getGmailAuthUrl(): string {
  const oauth2Client = getOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.compose'],
    prompt: 'consent',
  })
}

export async function exchangeCodeForToken(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  // Save tokens to DB
  const existing = await prisma.gmailToken.findFirst()
  if (existing) {
    await prisma.gmailToken.update({
      where: { id: existing.id },
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? existing.refreshToken,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      },
    })
  } else {
    await prisma.gmailToken.create({
      data: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token ?? null,
        expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
      },
    })
  }

  return tokens
}

async function getAuthenticatedClient() {
  const tokenRecord = await prisma.gmailToken.findFirst()
  if (!tokenRecord) throw new Error('Gmail not connected. Please authenticate first.')

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokenRecord.accessToken,
    refresh_token: tokenRecord.refreshToken ?? undefined,
    expiry_date: tokenRecord.expiryDate ? Number(tokenRecord.expiryDate) : undefined,
  })

  // Auto-refresh if needed
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.gmailToken.updateMany({
        data: {
          accessToken: tokens.access_token,
          expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
        },
      })
    }
  })

  return oauth2Client
}

export async function createGmailDraft(runItemId: string): Promise<string> {
  const runItem = await prisma.runItem.findUnique({
    where: { id: runItemId },
    include: {
      contact: true,
      emailDrafts: { orderBy: { createdAt: 'desc' }, take: 1 },
      exports: { where: { type: 'pdf' }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  })

  if (!runItem) throw new Error('RunItem not found')
  if (!runItem.contact) throw new Error('No contact for this RunItem')

  const emailDraft = runItem.emailDrafts[0]
  if (!emailDraft) throw new Error('No email draft generated yet')

  const auth = await getAuthenticatedClient()
  const gmail = google.gmail({ version: 'v1', auth })

  const to = runItem.contact.email
  const subject = emailDraft.subject
  const body = emailDraft.body

  // Check if we have a PDF export to attach
  const pdfExport = runItem.exports[0]
  let attachments: Array<{ filename: string; content: string; mimeType: string }> = []

  if (pdfExport?.filePath && fs.existsSync(pdfExport.filePath)) {
    const fileContent = fs.readFileSync(pdfExport.filePath)
    attachments.push({
      filename: `ajanlat-${runItem.contact.name?.replace(/\s+/g, '-') || 'ajanlat'}.html`,
      content: fileContent.toString('base64'),
      mimeType: 'text/html',
    })
  }

  // Build MIME message
  const boundary = `boundary_${Date.now()}`
  let rawMessage: string

  if (attachments.length > 0) {
    rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(body).toString('base64'),
      ...attachments.flatMap((att) => [
        `--${boundary}`,
        `Content-Type: ${att.mimeType}; name="${att.filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${att.filename}"`,
        '',
        att.content,
      ]),
      `--${boundary}--`,
    ].join('\r\n')
  } else {
    rawMessage = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(body).toString('base64'),
    ].join('\r\n')
  }

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const response = await gmail.users.drafts.create({
    userId: 'me',
    requestBody: {
      message: { raw: encodedMessage },
    },
  })

  const gmailDraftId = response.data.id!

  // Update EmailDraft record
  await prisma.emailDraft.update({
    where: { id: emailDraft.id },
    data: {
      gmailDraftId,
      status: 'created',
      attachments: attachments.map((a) => ({ filename: a.filename })),
    },
  })

  return gmailDraftId
}

export async function getGmailConnectionStatus(): Promise<{
  connected: boolean
  email?: string
}> {
  try {
    const tokenRecord = await prisma.gmailToken.findFirst()
    if (!tokenRecord) return { connected: false }

    const auth = await getAuthenticatedClient()
    const gmail = google.gmail({ version: 'v1', auth })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    return { connected: true, email: profile.data.emailAddress ?? undefined }
  } catch {
    return { connected: false }
  }
}
