'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, FileText, Mail } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

interface RunItem {
  id: string
  status: string
  run: {
    id: string
    campaign: { id: string; name: string }
  }
  clientCompany: { name: string }
  contact: { name: string; email: string } | null
  coreOffer: { id: string } | null
  exports: { id: string; type: string }[]
  emailDrafts: { id: string; status: string }[]
}

const EDITABLE_STATUSES = ['modules_done', 'export_done', 'email_done', 'completed']

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

export default function EditorListPage() {
  const router = useRouter()
  const [items, setItems] = useState<RunItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [campaignFilter, setCampaignFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchItems() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          status: EDITABLE_STATUSES.join(','),
        })
        const res = await fetch(`/api/run-items?${params}`)
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setError('Nem sikerült betölteni az elemeket.')
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [])

  // Derive unique campaigns from items
  const campaigns = Array.from(
    new Map(items.map((i) => [i.run.campaign.id, i.run.campaign])).values()
  )

  const filtered = items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (campaignFilter !== 'all' && item.run.campaign.id !== campaignFilter) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Editor</h1>
        <p className="text-muted-foreground mt-1">
          Kész ajánlatok szerkesztése, exportálása és email küldése
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Státusz szűrő" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Összes státusz</SelectItem>
              {EDITABLE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={campaignFilter} onValueChange={setCampaignFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Kampány szűrő" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="all">Összes kampány</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <p className="text-sm text-muted-foreground ml-auto">
          {filtered.length} elem
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Betöltés...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Nincsenek szerkeszthető ajánlatok.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cég</TableHead>
                  <TableHead>Kontakt</TableHead>
                  <TableHead>Kampány</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Export</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/editor/${item.id}`)}
                  >
                    <TableCell className="font-medium">{item.clientCompany.name}</TableCell>
                    <TableCell className="text-sm">
                      {item.contact ? (
                        <div>
                          <p className="font-medium">{item.contact.name}</p>
                          <p className="text-muted-foreground text-xs">{item.contact.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.run.campaign.name}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      {item.exports.length > 0 ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <FileText className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            {item.exports.length} fájl
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.emailDrafts.length > 0 ? (
                        <div className="flex items-center gap-1 text-blue-600">
                          <Mail className="h-4 w-4" />
                          <span className="text-xs font-medium">
                            {item.emailDrafts[0].status === 'created' ? 'Gmail kész' : 'Vázlat'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
