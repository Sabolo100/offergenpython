import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_DESIGN_NAME = 'Semleges – Alapértelmezett'

const DEFAULT_CONFIG = {
  isDefault: true,

  // Színek
  primaryColor: '#2563EB',      // Professzionális kék
  secondaryColor: '#475569',    // Palaszürke
  accentColor: '#0EA5E9',       // Égkék – CTA elemek
  headerBg: '#0F172A',          // Sötét palakék – fejléc
  bodyBg: '#FFFFFF',            // Fehér – törzs
  sectionAltBg: '#F8FAFC',      // Halvány szürke – felváltott szekciók
  textColor: '#0F172A',         // Majdnem fekete – fő szöveg
  mutedText: '#64748B',         // Szürke – leírások
  borderColor: '#E2E8F0',       // Elválasztók

  // Tipográfia
  fontFamily: 'Inter',
  fontFamilyHeading: 'Inter',
  fontSize: '14px',
  lineHeight: '1.6',

  // Oldalmargók (PDF)
  pageMarginTop: '20mm',
  pageMarginBottom: '20mm',
  pageMarginLeft: '18mm',
  pageMarginRight: '18mm',

  // Fejléc / lábléc
  logoUrl: '',
  footerText: '',

  // Egyéb
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

export async function POST(request: NextRequest) {
  try {
    const { ownCompanyId } = await request.json()
    if (!ownCompanyId) {
      return NextResponse.json({ error: 'ownCompanyId required' }, { status: 400 })
    }

    // Idempotens: ha már létezik ilyen nevű az adott workspace-ben, visszaadjuk azt
    const existing = await prisma.design.findFirst({
      where: { name: DEFAULT_DESIGN_NAME, ownCompanyId },
      include: { _count: { select: { campaigns: true } } },
    })

    if (existing) {
      return NextResponse.json({ design: existing, created: false })
    }

    const design = await prisma.design.create({
      data: {
        ownCompanyId,
        name: DEFAULT_DESIGN_NAME,
        config: DEFAULT_CONFIG,
      },
      include: { _count: { select: { campaigns: true } } },
    })

    return NextResponse.json({ design, created: true }, { status: 201 })
  } catch (error) {
    console.error('[seed-default design]', error)
    return NextResponse.json(
      { error: 'Alapértelmezett design létrehozása sikertelen.' },
      { status: 500 }
    )
  }
}
