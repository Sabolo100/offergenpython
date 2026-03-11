import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import fs from 'fs'
import os from 'os'

// mammoth: .docx / .doc kinyerés (sokkal megbízhatóbb Word fájloknál)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth')

// pdf-parse: PDF szöveg kinyerés
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

// officeparser: .pptx / .ppt (PowerPoint) kinyerés
// eslint-disable-next-line @typescript-eslint/no-require-imports
const officeParser = require('officeparser')

const MAX_SIZE_MB = 20

async function extractTextFromFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase()

  // ── TXT ────────────────────────────────────────────────────────────────────
  if (ext === '.txt') {
    return buffer.toString('utf-8').trim()
  }

  // ── DOCX / DOC  →  mammoth (kifejezetten Word dokumentumokra) ─────────────
  if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value?.trim() ?? ''
    if (!text) throw new Error('mammoth: üres eredmény')
    return text
  }

  // ── PDF  →  pdf-parse ──────────────────────────────────────────────────────
  if (ext === '.pdf') {
    const result = await pdfParse(buffer)
    const text = result.text?.trim() ?? ''
    if (!text) throw new Error('pdf-parse: üres eredmény')
    return text
  }

  // ── PPTX / PPT  →  officeparser ────────────────────────────────────────────
  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, `upload_${Date.now()}${ext}`)

  try {
    fs.writeFileSync(tmpFile, buffer)

    const text: string = await new Promise((resolve, reject) => {
      officeParser.parseOffice(tmpFile, (data: string, err: Error) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    return text.trim()
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile)
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const ownCompanyId = formData.get('ownCompanyId') as string | null
    const type = (formData.get('type') as string) || 'other'
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Nincs fájl csatolva' }, { status: 400 })
    }
    if (!ownCompanyId) {
      return NextResponse.json({ error: 'ownCompanyId szükséges' }, { status: 400 })
    }

    // Méret ellenőrzés
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_SIZE_MB) {
      return NextResponse.json(
        { error: `A fájl túl nagy (max ${MAX_SIZE_MB} MB, jelenlegi: ${sizeMB.toFixed(1)} MB)` },
        { status: 413 }
      )
    }

    // Kiterjesztés ellenőrzés
    const ext = path.extname(file.name).toLowerCase()
    const allowedExts = ['.pdf', '.docx', '.pptx', '.doc', '.ppt', '.txt']
    if (!allowedExts.includes(ext)) {
      return NextResponse.json(
        { error: `Nem támogatott fájlformátum: ${ext}. Engedélyezett: PDF, Word, PowerPoint, TXT` },
        { status: 415 }
      )
    }

    // Szöveg kinyerése
    const buffer = Buffer.from(await file.arrayBuffer())
    let extractedText: string

    try {
      extractedText = await extractTextFromFile(buffer, file.name)
    } catch (parseError) {
      console.error('File parse error:', parseError)
      return NextResponse.json(
        {
          error: `Nem sikerült kiolvasni a fájlt: ${file.name}. ${
            ext === '.doc'
              ? 'Próbáld .docx formátumba menteni és úgy feltölteni.'
              : 'Ellenőrizd, hogy nem sérült-e.'
          }`,
        },
        { status: 422 }
      )
    }

    if (!extractedText || extractedText.length < 10) {
      return NextResponse.json(
        { error: 'A fájlból nem sikerült szöveget kinyerni (lehet hogy üres vagy csak képeket tartalmaz).' },
        { status: 422 }
      )
    }

    // Cím: ha nem adott meg, a fájlnévből generáljuk
    const itemTitle = title?.trim() || path.basename(file.name, ext)

    // Mentés a DB-be
    const knowledgeItem = await prisma.knowledgeItem.create({
      data: {
        ownCompanyId,
        type,
        title: itemTitle,
        content: extractedText,
        fileUrl: file.name,
      },
    })

    return NextResponse.json({
      success: true,
      knowledgeItem,
      extractedLength: extractedText.length,
      message: `✅ "${itemTitle}" sikeresen feldolgozva (${extractedText.length.toLocaleString()} karakter kinyerve)`,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Fájl feltöltése sikertelen: ' + (error instanceof Error ? error.message : 'Ismeretlen hiba') },
      { status: 500 }
    )
  }
}

// Max 20MB-os body
export const config = {
  api: { bodyParser: false },
}
