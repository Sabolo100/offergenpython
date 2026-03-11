import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, string>[]

    let created = 0
    let errors: string[] = []

    for (const row of rows) {
      try {
        // Expected columns: name, brandName, industry, country, website, notes,
        //                   contactName, contactPosition, contactEmail, contactNotes
        if (!row.name) continue

        const company = await prisma.clientCompany.create({
          data: {
            name: String(row.name || ''),
            brandName: row.brandName ? String(row.brandName) : null,
            industry: row.industry ? String(row.industry) : null,
            country: row.country ? String(row.country) : null,
            website: row.website ? String(row.website) : null,
            notes: row.notes ? String(row.notes) : null,
          },
        })

        if (row.contactEmail || row.contactName) {
          await prisma.contact.create({
            data: {
              clientCompanyId: company.id,
              name: String(row.contactName || row.name),
              position: row.contactPosition ? String(row.contactPosition) : null,
              email: String(row.contactEmail || ''),
              notes: row.contactNotes ? String(row.contactNotes) : null,
            },
          })
        }

        created++
      } catch (e) {
        errors.push(`Row ${JSON.stringify(row)}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({ created, errors, total: rows.length }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to import file' }, { status: 500 })
  }
}
