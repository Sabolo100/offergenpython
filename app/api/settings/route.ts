import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const anthropicSet = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('...')
    const perplexitySet = !!process.env.PERPLEXITY_API_KEY && !process.env.PERPLEXITY_API_KEY.includes('...')
    const gmailClientIdSet = !!process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_ID !== ''
    const gmailClientSecretSet = !!process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_CLIENT_SECRET !== ''

    // Check DB
    let dbConnected = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbConnected = true
    } catch {
      dbConnected = false
    }

    // Check Gmail token
    let gmailConnected = false
    let gmailEmail: string | null = null
    try {
      const token = await prisma.gmailToken.findFirst()
      gmailConnected = !!token
    } catch {
      gmailConnected = false
    }

    return NextResponse.json({
      apiKeys: [
        { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', isSet: anthropicSet },
        { key: 'PERPLEXITY_API_KEY', label: 'Perplexity AI', isSet: perplexitySet },
        { key: 'GMAIL_CLIENT_ID', label: 'Gmail OAuth Client ID', isSet: gmailClientIdSet },
        { key: 'GMAIL_CLIENT_SECRET', label: 'Gmail OAuth Client Secret', isSet: gmailClientSecretSet },
      ],
      gmail: { connected: gmailConnected, email: gmailEmail },
      db: { connected: dbConnected },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}
