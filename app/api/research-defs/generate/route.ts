import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'

// ── Típus ────────────────────────────────────────────────────────────────────

interface GeneratedResearchDef {
  name: string
  description: string
  aiPlatform: 'perplexity' | 'claude'
  prompt: string
  resultFormat: string
  freshnessDays: number
  priority: number
  isActive: boolean
}

// ── JSON kinyerő (markdown code fence kezelés) ────────────────────────────────

function extractJsonArray(raw: string): GeneratedResearchDef[] {
  let cleaned = raw.trim()
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed) && parsed.length > 0) return parsed
  } catch { /* folytatjuk */ }

  const match = cleaned.match(/\[[\s\S]*\]/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0])
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* folytatjuk */ }
  }

  throw new Error(`Nem sikerült JSON tömböt kinyerni. Első 300 karakter: ${raw.slice(0, 300)}`)
}

// ── Meta-prompt ───────────────────────────────────────────────────────────────

function buildPrompt(campaign: {
  name: string
  goal: string | null
  systemPrompt: string
  language: string
}): { system: string; user: string } {
  const langLabel =
    campaign.language === 'hu' ? 'Magyar' :
    campaign.language === 'en' ? 'Angol' : 'Német'

  const systemPrompt = `Te egy B2B értékesítési és piackutatási szakértő vagy. Feladatod olyan kutatási definíciók megtervezése, amelyek minden megcélzott ügyfélre lefuttatva a lehető legtöbb releváns, személyre szabható információt adják az ajánlatkészítéshez.

KRITIKUS SZABÁLY: Válaszod KIZÁRÓLAG egy valid JSON tömb legyen. Semmi más szöveg, semmi markdown (ne használj \`\`\`json\`\`\` blokkot). Az első karakter [ legyen, az utolsó ] legyen.

Minden elem struktúrája:
{
  "name": "Kutatás rövid neve (max 60 karakter)",
  "description": "Mit keres ez a kutatás és miért hasznos az ajánlathoz (1-2 mondat)",
  "aiPlatform": "perplexity",
  "prompt": "A Perplexity AI-nak küldött részletes, konkrét kutatási prompt – ld. szabályok lent",
  "resultFormat": "Az eredmény elvárt formátuma (pl. 'Bullet lista, max 400 szó', 'Strukturált szekciók: X, Y, Z')",
  "freshnessDays": 14,
  "priority": 1,
  "isActive": true
}

PROMPT MEZŐ SZABÁLYAI (kritikus!):
- Mindig tartalmazza a {{CLIENT_NAME}} placeholdert az ügyfél neve helyén
- Ha webes kereséshez releváns: tartalmazza a {{CLIENT_WEBSITE}} placeholdert
- Ha iparágspecifikus: tartalmazza a {{CLIENT_INDUSTRY}} placeholdert
- A prompt legyen konkrét, specifikus, keressen tényszerű, friss (max 1-2 éves) adatokat
- Legyen ${langLabel} nyelvű (az AI ezen a nyelven fog keresni és válaszolni)
- Minimum 80 szó – részletes, de fókuszált
- NE tartalmazzon más placeholdert, csak a fenti háromból valót
- A resultFormat mezőben add meg az elvárt struktúrát (pl. "5-7 bullet pont", "3 szekció: X, Y, Z")

PRIORITÁS: 1 = legfontosabb, magasabb szám = kevésbé fontos`

  const userMessage = `Kampány neve: ${campaign.name}
Kampány nyelve: ${langLabel}
Kampánycél: ${campaign.goal ?? '(nem megadott)'}

KAMPÁNY RENDSZERPROMPTJA (ez határozza meg, milyen ajánlatot kell majd adni az ügyfeleknek):
${campaign.systemPrompt}

FELADAT:
Tervezz 5-7 kutatási definíciót, amelyeket a rendszer minden megcélzott ügyfélre lefuttat, és amelyek eredménye alapján az AI személyre szabott, proaktív B2B ajánlatot tud készíteni.

KÖTELEZŐ KUTATÁSOK (mindig szerepeljenek, sorban ez a prioritásuk):

1. CÉGPROFIL (priority: 1, freshnessDays: 30)
   Mit keressen: Az ügyfél cégének háttere, alapítás éve, tulajdonosi struktúra, üzleti tevékenység, termék-/szolgáltatásportfólió, márkaértékek, piaci pozíció, legfontosabb partnerek/ügyfelek, legutóbbi fontosabb hírek, fejlesztések, változások
   Prompt tartalmazza: {{CLIENT_NAME}}, {{CLIENT_WEBSITE}}
   Cél: megérteni, kivel van dolgunk, mi a cég DNS-e

2. VERSENYTÁRSELEMZÉS (priority: 2, freshnessDays: 14)
   Mit keressen: {{CLIENT_NAME}} legfőbb közvetlen versenytársai ugyanazon a piacon – különösen azon a területen, ami a kampányhoz kapcsolódik (${campaign.goal ?? 'az ajánlott területen'}). Versenytársak tevékenysége, kampányai, pozicionálása az elmúlt 1-2 évben. Mit csinálnak jól? Hol vannak réseik?
   Prompt tartalmazza: {{CLIENT_NAME}}, {{CLIENT_INDUSTRY}}
   Cél: azonosítani, hol lehet {{CLIENT_NAME}}-t megkülönböztetni a versenytársaktól

3. CÉLCSOPORT ELEMZÉS (priority: 3, freshnessDays: 30)
   Mit keressen: {{CLIENT_NAME}} végső célcsoportja – kik ők, mi motiválja őket, milyen elvárásaik vannak, hogyan hoznak vásárlási döntést, milyen fájdalompontjaik vannak, milyen tartalom/kommunikáció hat rájuk. Iparági benchmark adatok ha elérhetők.
   Prompt tartalmazza: {{CLIENT_NAME}}, {{CLIENT_INDUSTRY}}
   Cél: megérteni, hogy az ügyfél célcsoportja számára mit kell hangsúlyozni az ajánlatban

4. DÖNTÉSHOZÓ / KAPCSOLATTARTÓ PROFIL (priority: 4, freshnessDays: 14)
   Mit keressen: A megcélzott kontakt személy szakmai háttere, LinkedIn aktivitás, korábbi cégek/pozíciók, publikált cikkek/nyilatkozatok, konferencia-előadások, érdeklődési területek – különösen a kampányhoz kapcsolódó területen
   Prompt tartalmazza: {{CLIENT_NAME}} (megjegyzés a promptban hogy a kapcsolattartó személy neve külön lesz megadva)
   Cél: személyes relevanciát adni az ajánlatnak, hivatkozási pont a megszólításhoz

5. DIGITÁLIS JELENLÉT ÉS TARTALOM STRATÉGIA (priority: 5, freshnessDays: 21)
   Mit keressen: {{CLIENT_NAME}} online jelenléte – weboldal minősége, blog/tartalom aktivitás, közösségi média jelenlét (LinkedIn, Instagram, stb.), hirdetési aktivitás, SEO pozíció a saját szegmensükben, PR megjelenések az elmúlt évben
   Prompt tartalmazza: {{CLIENT_NAME}}, {{CLIENT_WEBSITE}}
   Cél: azonosítani, hol és hogyan kommunikál az ügyfél – és hol van fejlesztési lehetőség

OPCIONÁLIS (ha releváns a kampánycélhoz, add hozzá):
- Iparági trendek és piaci lehetőségek (priority: 6) – ha a kampány új piac/trend alapú
- Szabályozói/megfelelési környezet (priority: 6) – ha a kampány compliance-érzékeny területen van
- Pénzügyi/növekedési jelek (priority: 6) – ha finanszírozás, befektetés, terjeszkedés releváns

FONTOS: Minden kutatás promptja legyen konkrét, tényszerű adatokat kérjen, és egyértelműen jelölje az elvárt kimeneti formátumot (resultFormat mező). A promtok ${langLabel} nyelvűek legyenek.

Válaszodban CSAK a JSON tömb szerepeljen, semmi más!`

  return { system: systemPrompt, user: userMessage }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, replaceExisting = false } = body

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId szükséges' }, { status: 400 })
    }

    // 1. Kampány adatok
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { id: true, name: true, goal: true, systemPrompt: true, language: true, ownCompanyId: true },
    })
    if (!campaign) {
      return NextResponse.json({ error: 'Kampány nem található' }, { status: 404 })
    }
    if (!campaign.systemPrompt?.trim()) {
      return NextResponse.json(
        { error: 'A kiválasztott kampánynak nincs kitöltött rendszerpromptja. Előbb töltsd ki a kampány Alapadatok fülén.' },
        { status: 400 }
      )
    }

    // 2. AI hívás
    const { system, user } = buildPrompt(campaign)

    let rawResponse: string
    try {
      rawResponse = await claudeChat(system, user, 'claude-opus-4-6')
    } catch (aiError) {
      console.error('[generate-research-defs] Claude API error:', aiError)
      return NextResponse.json(
        { error: 'AI generálás sikertelen. Ellenőrizd az Anthropic API kulcsot.' },
        { status: 502 }
      )
    }

    console.log('[generate-research-defs] Raw response (first 400):', rawResponse.slice(0, 400))

    // 3. JSON kinyerése
    let generated: GeneratedResearchDef[]
    try {
      generated = extractJsonArray(rawResponse)
    } catch (parseError) {
      console.error('[generate-research-defs] Parse error:', parseError)
      console.error('[generate-research-defs] Full raw:', rawResponse)
      return NextResponse.json(
        { error: 'Az AI nem megfelelő formátumban válaszolt. Próbáld újra.' },
        { status: 422 }
      )
    }

    // 4. Sanitizálás
    const sanitized = generated
      .filter((d) => d && typeof d.name === 'string' && d.name.trim())
      .map((d, idx) => ({
        name: String(d.name).slice(0, 100),
        description: d.description ? String(d.description).slice(0, 500) : null,
        aiPlatform: d.aiPlatform === 'claude' ? 'claude' : 'perplexity',
        prompt: String(d.prompt ?? ''),
        resultFormat: d.resultFormat ? String(d.resultFormat).slice(0, 200) : null,
        freshnessDays: typeof d.freshnessDays === 'number' && d.freshnessDays > 0
          ? Math.min(d.freshnessDays, 365) : 14,
        priority: typeof d.priority === 'number' ? d.priority : idx + 1,
        isActive: d.isActive !== false,
      }))

    if (sanitized.length === 0) {
      return NextResponse.json(
        { error: 'Az AI nem generált érvényes kutatási definíciókat. Próbáld újra.' },
        { status: 422 }
      )
    }

    // 5. Meglévők törlése ha kérték
    if (replaceExisting) {
      await prisma.researchDefinition.deleteMany({ where: { ownCompanyId: campaign.ownCompanyId } })
    }

    // 6. Mentés
    const created = await Promise.all(
      sanitized.map((d) => prisma.researchDefinition.create({ data: { ...d, ownCompanyId: campaign.ownCompanyId } }))
    )

    return NextResponse.json({
      success: true,
      defs: created,
      count: created.length,
      campaignName: campaign.name,
      message: `✅ ${created.length} kutatási definíció sikeresen létrehozva a(z) „${campaign.name}" kampány alapján`,
    })
  } catch (error) {
    console.error('[generate-research-defs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Generálás sikertelen: ' + (error instanceof Error ? error.message : 'Ismeretlen hiba') },
      { status: 500 }
    )
  }
}
