import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'

// ── Típus a Claude által visszaadott modul struktúrához ─────────────────────

interface GeneratedModule {
  name: string
  type: 'fixed' | 'variable'
  goal: string
  prompt?: string
  fixedContent?: string
  designNotes?: string
  isRequired: boolean
}

// ── JSON kinyerő – markdown code fence-eket is kezel ────────────────────────

function extractJsonArray(raw: string): GeneratedModule[] {
  let cleaned = raw.trim()

  // 1. Markdown code fence eltávolítása: ```json ... ``` vagy ``` ... ```
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  // 2. Próbáljuk közvetlenül parse-olni (ha tiszta JSON)
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch {
    // folytatjuk a regex-alapú kinyeréssel
  }

  // 3. Regex: első [ ... ] blokk kinyerése (ha van bevezető/záró szöveg)
  // Mohó match hogy az utolsó ]-ig menjen
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch {
      // folytatjuk
    }
  }

  // 4. Ha még mindig nem sikerült: keressük az összes { ... } objektumot
  const objectMatches = cleaned.matchAll(/\{[\s\S]*?\}(?=\s*[,\]]|\s*$)/g)
  const objects: GeneratedModule[] = []
  for (const m of objectMatches) {
    try {
      const obj = JSON.parse(m[0])
      if (obj && typeof obj.name === 'string') objects.push(obj)
    } catch {
      // skip
    }
  }
  if (objects.length > 0) return objects

  throw new Error(`Nem sikerült JSON tömböt kinyerni. Első 300 karakter: ${raw.slice(0, 300)}`)
}

// ── Meta-prompt ──────────────────────────────────────────────────────────────

function buildMetaPrompt(
  campaign: {
    name: string
    goal: string | null
    systemPrompt: string
    language: string
  },
  knowledgeByType: Record<string, { title: string; content: string }[]>
): { system: string; user: string } {
  const langLabel =
    campaign.language === 'hu' ? 'Magyar' :
    campaign.language === 'en' ? 'Angol' : 'Német'

  const typeLabels: Record<string, string> = {
    service: 'Szolgáltatások',
    reference: 'Referenciák / Ügyfelek',
    'case-study': 'Esettanulmányok',
    team: 'Csapat / Szakértők',
    closing: 'Záró / CTA elemek',
    other: 'Egyéb anyagok',
  }

  const kbSections: string[] = []
  for (const [type, items] of Object.entries(knowledgeByType)) {
    if (items.length === 0) continue
    const label = typeLabels[type] ?? type
    kbSections.push(
      `[${label}]\n` +
      items.map((i) => `Cím: ${i.title}\n${i.content.slice(0, 600)}`).join('\n---\n')
    )
  }
  const knowledgeText = kbSections.length > 0
    ? kbSections.join('\n\n')
    : '(Nincs feltöltött tudásbázis anyag)'

  // FONTOS: A system prompt egyértelműen jelzi a kimeneti formátumot
  const systemPrompt = `Te egy B2B értékesítési szakértő vagy. Feladatod professzionális ajánlat modul-struktúrák tervezése.

KRITIKUS SZABÁLY: A válaszod KIZÁRÓLAG egy valid JSON tömb legyen. Semmi más szöveg, semmi magyarázat, semmi markdown jelölés (ne használj \`\`\`json\`\`\` blokkot). Csak a nyers JSON tömb karakterei szerepeljenek a válaszban – az első karakter [ legyen, az utolsó ] legyen.

A JSON tömb elemei ebben a struktúrában legyenek:
{
  "name": "Modul rövid neve (max 60 karakter)",
  "type": "fixed" vagy "variable",
  "goal": "A modul célja 1-2 mondatban",
  "prompt": "Részletes AI generálási utasítás – CSAK variable típusnál töltsd ki, fixed-nél hagyd üres stringnek",
  "fixedContent": "A tényleges szöveg – CSAK fixed típusnál töltsd ki, variable-nél hagyd üres stringnek",
  "designNotes": "Design tipp pl. kiemelő doboz, ikonokkal, stb.",
  "isRequired": true
}`

  const userMessage = `Kampány neve: ${campaign.name}
Nyelv: ${langLabel}
Kampánycél: ${campaign.goal ?? '(nem megadott)'}

RENDSZERPROMPT (ez határozza meg az ajánlat logikáját):
${campaign.systemPrompt}

SAJÁT CÉG TUDÁSBÁZISA:
${knowledgeText}

FELADAT:
Hozz létre 8-12 modult, amelyek együtt egy teljes, konvertáló B2B ajánlatot alkotnak. A modulok sorrendje egy logikus értékesítési ívet kövessen.

KÖTELEZŐ MODULOK:
1. Fejléc / Személyes megszólítás (variable) – személyre szabott nyitás, hivatkozás a kutatásból ismert ügyfélhelyzetre
2. Küldő cég bemutatása (fixed) – a tudásbázis alapján töltsd ki
3. Miért most, miért ez (variable) – az ügyfél aktuális helyzetéhez igazítva
4. Kutatás alapú helyzetértékelés (variable) – az ügyfél iparágára/kihívásaira vonatkozó meglátások
5. Ajánlott megoldás (variable) – személyre szabott ajánlat
6. Referenciák / Esettanulmányok (fixed) – a tudásbázisból, ha van ilyen anyag
7. Személyre szabott egyedi javaslat (variable) – konkrét next step javaslattal
8. CTA – Call to Action (variable vagy fixed) – egyértelmű cselekvési felhívás

MINŐSÉGI ELVEK:
- variable modulok prompt mezője: legalább 150 szó, részletes utasítás az AI-nak, hivatkozzon a kampány célcsoportjára, hangtusára, nyelvére, fókusz: ügyfél fájdalompontjai, ROI, versenyelőny
- fixed modulok fixedContent mezője: a tudásbázisból kinyert konkrét szöveg (Markdown formázás ok: **kiemelés**, bullet listák)
- designNotes: hasznos elrendezési tippek (pl. "Kiemelő doboz sárga háttérrel", "2 oszlopos layout logókkal")
- Az ajánlat ${langLabel} nyelven fog megjelenni, a promptok is legyenek ${langLabel} nyelvűek

Válaszodban CSAK a JSON tömb szerepeljen, semmi más!`

  return { system: systemPrompt, user: userMessage }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const body = await request.json()
    const replaceExisting: boolean = body.replaceExisting ?? false

    // 1. Kampány adatok
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, goal: true, systemPrompt: true, language: true },
    })
    if (!campaign) {
      return NextResponse.json({ error: 'Kampány nem található' }, { status: 404 })
    }
    if (!campaign.systemPrompt?.trim()) {
      return NextResponse.json(
        { error: 'A kampánynak kell legyen kitöltött rendszerpromptja a modulok generálásához.' },
        { status: 400 }
      )
    }

    // 2. Saját cég tudásbázisa
    const ownCompany = await prisma.ownCompany.findFirst({
      include: { knowledgeItems: { orderBy: { createdAt: 'desc' } } },
    })
    if (!ownCompany || ownCompany.knowledgeItems.length === 0) {
      return NextResponse.json(
        { error: 'A saját cég tudásbázisa üres. Tölts fel legalább néhány anyagot a Saját cég oldalon.' },
        { status: 400 }
      )
    }

    const knowledgeByType: Record<string, { title: string; content: string }[]> = {}
    for (const item of ownCompany.knowledgeItems) {
      if (!knowledgeByType[item.type]) knowledgeByType[item.type] = []
      knowledgeByType[item.type].push({ title: item.title, content: item.content })
    }

    // 3. AI hívás
    const { system, user } = buildMetaPrompt(campaign, knowledgeByType)

    let rawResponse: string
    try {
      rawResponse = await claudeChat(system, user, 'claude-opus-4-6')
    } catch (aiError) {
      console.error('[generate-modules] Claude API error:', aiError)
      return NextResponse.json(
        { error: 'AI generálás sikertelen. Ellenőrizd az Anthropic API kulcsot.' },
        { status: 502 }
      )
    }

    console.log('[generate-modules] Raw response (first 400 chars):', rawResponse.slice(0, 400))

    // 4. JSON kinyerése
    let generatedModules: GeneratedModule[]
    try {
      generatedModules = extractJsonArray(rawResponse)
    } catch (parseError) {
      console.error('[generate-modules] JSON parse failed:', parseError)
      console.error('[generate-modules] Full raw response:', rawResponse)
      return NextResponse.json(
        {
          error: 'Az AI nem megfelelő formátumban adta vissza az adatokat. Próbáld újra – általában 1-2 próba után sikerül.',
          debug: process.env.NODE_ENV === 'development' ? rawResponse.slice(0, 500) : undefined,
        },
        { status: 422 }
      )
    }

    // 5. Mezők validálása és sanitizálása
    const sanitized = generatedModules
      .filter((m) => m && typeof m.name === 'string' && m.name.trim())
      .map((m, idx) => ({
        name: String(m.name ?? `Modul ${idx + 1}`).slice(0, 100),
        type: m.type === 'fixed' ? 'fixed' : 'variable',
        goal: m.goal ? String(m.goal).slice(0, 500) : null,
        prompt: m.type !== 'fixed' && m.prompt ? String(m.prompt) : null,
        fixedContent: m.type === 'fixed' && m.fixedContent ? String(m.fixedContent) : null,
        designNotes: m.designNotes ? String(m.designNotes).slice(0, 200) : null,
        isRequired: m.isRequired !== false,
      }))

    if (sanitized.length === 0) {
      return NextResponse.json(
        { error: 'Az AI nem generált érvényes modulokat. Próbáld újra.' },
        { status: 422 }
      )
    }

    // 6. Meglévő modulok törlése (ha kérték)
    if (replaceExisting) {
      await prisma.moduleDefinition.deleteMany({ where: { campaignId } })
    }

    // 7. Meglévő max order
    let startOrder = 0
    if (!replaceExisting) {
      const lastModule = await prisma.moduleDefinition.findFirst({
        where: { campaignId },
        orderBy: { order: 'desc' },
      })
      startOrder = lastModule ? lastModule.order + 1 : 0
    }

    // 8. Modulok mentése
    const created = await Promise.all(
      sanitized.map((mod, idx) =>
        prisma.moduleDefinition.create({
          data: {
            campaignId,
            ...mod,
            order: startOrder + idx,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      modules: created,
      count: created.length,
      message: `✅ ${created.length} modul sikeresen létrehozva`,
    })
  } catch (error) {
    console.error('[generate-modules] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Modulok generálása sikertelen: ' + (error instanceof Error ? error.message : 'Ismeretlen hiba') },
      { status: 500 }
    )
  }
}
