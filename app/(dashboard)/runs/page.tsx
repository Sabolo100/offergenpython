'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  Select,
  SelectContent,
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
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

interface Campaign {
  id: string
  name: string
}

interface Run {
  id: string
  status: string
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  campaign: { name: string }
  _count: { runItems: number }
  completedItems?: number
  failedItems?: number
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Várakozik', className: 'bg-gray-100 text-gray-700' },
  running: { label: 'Fut', className: 'bg-blue-100 text-blue-700 animate-pulse' },
  completed: { label: 'Kész', className: 'bg-green-100 text-green-700' },
  partial: { label: 'Részleges', className: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'Meghiúsult', className: 'bg-red-100 text-red-700' },
}

function RunStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

export default function RunsPage() {
  const router = useRouter()
  const { activeCompany } = useOwnCompany()
  const [runs, setRuns] = useState<Run[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchRuns() {
    if (!activeCompany) return
    setLoading(true)
    try {
      const res = await fetch(`/api/runs?companyId=${activeCompany.id}`)
      const data = await res.json()
      setRuns(Array.isArray(data) ? data : [])
    } catch {
      setError('Nem sikerült betölteni a futtatásokat.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCampaigns() {
    if (!activeCompany) return
    try {
      const res = await fetch(`/api/campaigns?companyId=${activeCompany.id}`)
      const data = await res.json()
      setCampaigns(Array.isArray(data) ? data : [])
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    if (!activeCompany) return
    fetchRuns()
    fetchCampaigns()
  }, [activeCompany]) // eslint-disable-line react-hooks/exhaustive-deps

  function openNewRun() {
    setSelectedCampaignId('')
    setDialogOpen(true)
  }

  async function handleCreateRun() {
    if (!selectedCampaignId) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId }),
      })
      const data = await res.json()
      setDialogOpen(false)
      router.push(`/runs/${data.id}`)
    } catch {
      setError('Futtatás létrehozása sikertelen.')
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Futtatások</h1>
          <p className="text-muted-foreground mt-1">Kampány futtatások áttekintése és kezelése</p>
        </div>
        <Button onClick={openNewRun} className="gap-2">
          <Plus className="h-4 w-4" />
          Új futtatás
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-muted-foreground text-sm">Betöltés...</div>
          ) : runs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              Még nincs futtatás. Hozz létre egyet a fenti gombbal.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kampány</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Indítva</TableHead>
                  <TableHead>Befejezve</TableHead>
                  <TableHead>Elemek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/runs/${run.id}`)}
                  >
                    <TableCell className="font-medium">{run.campaign.name}</TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {run.startedAt ? formatDateTime(run.startedAt) : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {run.completedAt ? formatDateTime(run.completedAt) : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{run._count.runItems}</span>
                        <span className="text-muted-foreground">összes</span>
                        {run.completedItems !== undefined && run.completedItems > 0 && (
                          <>
                            <span className="text-green-600 font-medium">
                              · {run.completedItems} kész
                            </span>
                          </>
                        )}
                        {run.failedItems !== undefined && run.failedItems > 0 && (
                          <span className="text-red-600 font-medium">
                            · {run.failedItems} hibás
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Run Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új futtatás indítása</DialogTitle>
            <DialogDescription>
              Válassz kampányt a futtatás létrehozásához. A futtatás a kampányhoz rendelt
              összes kontaktust feldolgozza.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="run-campaign">Kampány *</Label>
              <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                <SelectTrigger id="run-campaign">
                  <SelectValue placeholder="Válassz kampányt..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      Nincs elérhető kampány
                    </SelectItem>
                  ) : (
                    campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Mégse</Button>
            </DialogClose>
            <Button
              onClick={handleCreateRun}
              disabled={creating || !selectedCampaignId}
            >
              {creating ? 'Létrehozás...' : 'Futtatás létrehozása'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
