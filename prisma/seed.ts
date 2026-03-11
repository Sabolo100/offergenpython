import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Semleges alapértelmezett design ──────────────────────────────────────────

const DEFAULT_DESIGN = {
  name: 'Semleges – Alapértelmezett',
  config: {
    isDefault: true,

    // Színek
    primaryColor: '#2563EB',      // Professzionális kék – gombok, linkek, fejléc kiemelők
    secondaryColor: '#475569',    // Palaszürke – alcímek, secondary elemek
    accentColor: '#0EA5E9',       // Égkék – CTA, highlight boxok
    headerBg: '#0F172A',          // Sötét palakék – fejléc háttér
    bodyBg: '#FFFFFF',            // Fehér – törzsszöveg háttér
    sectionAltBg: '#F8FAFC',      // Nagyon halvány szürke – felváltott szekciók
    textColor: '#0F172A',         // Majdnem fekete – fő szöveg
    mutedText: '#64748B',         // Szürke – leírások, metaadatok
    borderColor: '#E2E8F0',       // Halvány szürke – elválasztók, keretek

    // Tipográfia
    fontFamily: 'Inter',
    fontFamilyHeading: 'Inter',
    fontSize: '14px',
    lineHeight: '1.6',

    // Elrendezés
    pageMarginTop: '20mm',
    pageMarginBottom: '20mm',
    pageMarginLeft: '18mm',
    pageMarginRight: '18mm',

    // Fejléc / lábléc
    logoUrl: '',                  // Ide kerül majd a cég logójának URL-je
    footerText: '',               // Opcionális lábléc szöveg

    // Egyéb
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
}

async function main() {
  console.log('🌱 Seed indítása...')

  // Ellenőrzés: van-e már alapértelmezett design
  const existingDefault = await prisma.design.findFirst({
    where: {
      name: DEFAULT_DESIGN.name,
    },
  })

  if (existingDefault) {
    console.log('✅ Az alapértelmezett design már létezik:', existingDefault.id)
  } else {
    const created = await prisma.design.create({
      data: DEFAULT_DESIGN as Parameters<typeof prisma.design.create>[0]['data'],
    })
    console.log('✅ Alapértelmezett design létrehozva:', created.id)
  }

  console.log('🌱 Seed kész.')
}

main()
  .catch((e) => {
    console.error('❌ Seed hiba:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
