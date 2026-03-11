import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeChat } from '@/lib/ai/claude'

const LANGUAGE_NAMES: Record<string, string> = {
  hu: 'magyar',
  en: 'angol',
  de: 'német',
}

export async function POST(request: NextRequest) {
  try {
    const { campaignGoal, language = 'hu', campaignName, campaignDescription, ownCompanyId } = await request.json()

    if (!campaignGoal?.trim()) {
      return NextResponse.json({ error: 'A kampánycél megadása kötelező' }, { status: 400 })
    }
    if (!ownCompanyId) {
      return NextResponse.json({ error: 'ownCompanyId megadása kötelező' }, { status: 400 })
    }

    // Saját cég tudásbázisának összegyűjtése
    const ownCompany = await prisma.ownCompany.findUnique({
      where: { id: ownCompanyId },
      include: { knowledgeItems: { orderBy: { type: 'asc' } } },
    })

    if (!ownCompany) {
      return NextResponse.json(
        { error: 'Nincs saját cég rögzítve. Először add meg a céged adatait a "Saját cég" menüpontban.' },
        { status: 422 }
      )
    }

    const langName = LANGUAGE_NAMES[language] || language

    // Tudásbázis összeállítása típusonként
    const kbByType: Record<string, string[]> = {}
    for (const item of ownCompany.knowledgeItems) {
      if (!kbByType[item.type]) kbByType[item.type] = []
      kbByType[item.type].push(`### ${item.title}\n${item.content}`)
    }

    const typeLabels: Record<string, string> = {
      service: 'SZOLGÁLTATÁSOK',
      reference: 'REFERENCIÁK',
      'case-study': 'ESETTANULMÁNYOK',
      team: 'CSAPAT',
      closing: 'ZÁRÓANYAGOK',
      other: 'EGYÉB INFORMÁCIÓK',
    }

    const knowledgeBaseText = Object.entries(kbByType)
      .map(([type, items]) => `## ${typeLabels[type] || type.toUpperCase()}\n\n${items.join('\n\n')}`)
      .join('\n\n---\n\n')

    if (!knowledgeBaseText.trim()) {
      return NextResponse.json(
        { error: 'A tudásbázis üres. Adj hozzá szolgáltatás-leírásokat, referenciákat és egyéb tartalmakat a "Saját cég" menüpontban.' },
        { status: 422 }
      )
    }

    // ─────────────────────────────────────────────────────────────────────────
    // META-PROMPT: ez generálja a rendszerprompot
    // ─────────────────────────────────────────────────────────────────────────
    const metaSystemPrompt = `Te egy tapasztalt B2B értékesítési stratéga és AI-rendszertervező vagy, aki kiváló rendszerpromptokat készít AI alapú ajánlatgeneráló rendszerekhez.

A feladatod: egy olyan RENDSZERPROMPOT írni, amelyet egy AI fog kapni minden egyes ügyfélajánlat generálásakor. Ez a rendszerprompt határozza meg, hogyan viselkedjen az AI, milyen minőségű és hangnemű ajánlatokat hozzon létre.

FONTOS KONTEXTUS:
Az AI, amelynek ezt a rendszerprompot adod, a következő inputokat kapja majd ajánlatgeneráláskor:
1. A te rendszerpromptodat (amit most írsz)
2. A kutatási eredményeket a célügyfélről (cég neve, iparág, weboldal, versenytársak, trendek, kommunikációs stílus)
3. A saját cég tudásbázisát (szolgáltatások, referenciák, esettanulmányok)
4. A generálandó ajánlat moduljainak nevét és célját

A RENDSZERPROMPT MINŐSÉGI KÖVETELMÉNYEI:
- Legyen RENDKÍVÜL RÉSZLETES és KONKRÉT – nem általános instrukciókat, hanem pontos viselkedési szabályokat adjon
- Határozza meg az AI szerepét (milyen senior szakértőként viselkedjen)
- Írja le PONTOSAN, hogyan kell személyre szabni az ajánlatot a kutatási eredmények alapján
- Adjon utasítást arra, hogyan kapcsolja össze a saját cég erősségeit az ügyfél specifikus kihívásaival
- Határozza meg a hangnemet, stílust, mélységet és meggyőzési elveket
- Tartalmazzon konkrét elveket arra, mitől lesz egy ajánlat igazán meggyőző és egyedi
- Legyen legalább 600-1000 szó hosszú – minél részletesebb, annál jobb

A generált rendszerprompt NYELVE: ${langName}
`

    const metaUserMessage = `Kérlek, írj egy professzionális, részletes rendszerprompot az alábbi paraméterek alapján.

═══════════════════════════════════════════════════════
SAJÁT CÉG: ${ownCompany.name}
${ownCompany.description ? `Leírás: ${ownCompany.description}` : ''}
${ownCompany.website ? `Weboldal: ${ownCompany.website}` : ''}
═══════════════════════════════════════════════════════

SAJÁT CÉG TUDÁSBÁZISA:
${knowledgeBaseText}

═══════════════════════════════════════════════════════
KAMPÁNY NEVE: ${campaignName || '(nem megadott)'}
KAMPÁNY LEÍRÁSA: ${campaignDescription || '(nem megadott)'}
KAMPÁNYCÉL: ${campaignGoal}
KAMPÁNY NYELVE: ${langName}
═══════════════════════════════════════════════════════

A RENDSZERPROMPTNAK tartalmaznia kell legalább az alábbi elemeket:

1. **AZ AI SZEREPE ÉS IDENTITÁSA**
   - Milyen senior szakértőként viselkedjen (pl. "Te a ${ownCompany.name} vezető stratégiai tanácsadója vagy...")
   - Milyen mélységű szakmai tudást képviseljen

2. **SZEMÉLYRE SZABÁS LOGIKÁJA**
   - Hogyan dolgozza fel és használja fel a kutatási eredményeket
   - Hogyan emelje ki az ügyfél-specifikus fájdalompontokat és lehetőségeket
   - Hogyan tükrözze az ügyfél iparági kontextusát és helyzetét

3. **TARTALOM ÉS ÉRVELÉS**
   - Hogyan kapcsolja össze a ${ownCompany.name} konkrét szolgáltatásait az ügyfél igényeivel
   - Milyen bizonyítékokat, referenciákat és számokat használjon
   - Hogyan építse fel a meggyőző érvelést

4. **STÍLUS ÉS HANGNEM**
   - Pontosan milyen kommunikációs stílust alkalmazzon (formális/informális, provokatív/konzervatív, stb.)
   - Milyen hosszú legyen az egyes részek
   - Milyen szavakat és fordulatokat kerüljön

5. **MINŐSÉGI STANDARDOK**
   - Mik a kötelező elemek minden modulban
   - Mitől lesz az ajánlat igazán meggyőző és egyedi
   - Hogyan kerülje a sablonosságot

6. **MODULKEZELÉS**
   - Hogyan viszonyuljon a különböző modultípusokhoz (bemutatás, megoldás, referencia, ár, CTA)
   - Hogyan teremtsen egységes narratívát az egyes modulok között

Írj egy rendkívül részletes, legalább 700 szavas rendszerprompot ${langName} nyelven, amely alapján az AI valóban kiváló, személyre szabott B2B ajánlatokat képes generálni!`

    const generatedPrompt = await claudeChat(metaSystemPrompt, metaUserMessage)

    return NextResponse.json({ systemPrompt: generatedPrompt })
  } catch (error) {
    console.error('Prompt generation error:', error)
    const message = error instanceof Error ? error.message : 'Generálás sikertelen'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
