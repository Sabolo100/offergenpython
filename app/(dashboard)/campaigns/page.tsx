'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Loader2,
  ExternalLink,
  Users,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
  description?: string | null
  language: string
  status: string
  createdAt: string
  updatedAt: string
  _count: {
    campaignContacts: number
    moduleDefinitions: number
    runs: number
  }
  design?: { id: string; name: string } | null
}

const LANGUAGE_LABELS: Record<string, string> = {
  hu: 'Magyar',
  en: 'Angol',
  de: 'Német',
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/campaigns')
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteConfirmId(id)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeletingId(id)
    setDeleteConfirmId(null)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kampányok</h1>
          <p className="text-muted-foreground mt-1">
            {campaigns.length > 0
              ? `${campaigns.length} kampány a rendszerben`
              : 'Ajánlatkészítő kampányok kezelése'}
          </p>
        </div>
        <Button onClick={() => router.push('/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Új kampány
        </Button>
      </div>

      {/* Table / Empty State */}
      {campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed rounded-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Megaphone className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Még nincs kampány</p>
            <p className="text-sm text-muted-foreground mt-1">
              Hozz létre egy kampányt az ajánlatkészítés megkezdéséhez.
            </p>
          </div>
          <Button onClick={() => router.push('/campaigns/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Első kampány létrehozása
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kampánynév</TableHead>
                <TableHead>Nyelv</TableHead>
                <TableHead>Állapot</TableHead>
                <TableHead className="text-center">Kontaktok</TableHead>
                <TableHead className="text-center">Modulok</TableHead>
                <TableHead className="text-center">Futtatások</TableHead>
                <TableHead>Létrehozva</TableHead>
                <TableHead className="w-36 text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow
                  key={campaign.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/campaigns/${campaign.id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      {campaign.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-xs">
                      {LANGUAGE_LABELS[campaign.language] ?? campaign.language}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {campaign._count.campaignContacts}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {campaign._count.moduleDefinitions}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {campaign._count.runs}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(campaign.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/campaigns/${campaign.id}`)
                        }}
                      >
                        <ExternalLink className="mr-1 h-3.5 w-3.5" />
                        Megnyit
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/campaigns/${campaign.id}`)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(campaign.id, e)}
                        disabled={deletingId === campaign.id}
                      >
                        {deletingId === campaign.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirmId(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kampány törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt a kampányt? Az összes hozzá tartozó modul, kontakt és
              futtatás elvész. Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Mégse</Button>
            <Button variant="destructive" onClick={confirmDelete}>Törlés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
