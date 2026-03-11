'use client'

import { useState, useEffect, useRef } from 'react'
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
import {
  Plus,
  Pencil,
  Trash2,
  Users,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
  Building2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientCompany {
  id: string
  name: string
  brandName?: string | null
  industry?: string | null
  country?: string | null
  website?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  _count: { contacts: number }
}

interface ClientFormData {
  name: string
  brandName: string
  industry: string
  country: string
  website: string
  notes: string
}

const EMPTY_FORM: ClientFormData = {
  name: '',
  brandName: '',
  industry: '',
  country: '',
  website: '',
  notes: '',
}

// ── ClientForm Dialog ─────────────────────────────────────────────────────────

interface ClientFormProps {
  client: ClientCompany | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (client: ClientCompany) => void
}

function ClientForm({ client, open, onOpenChange, onSaved }: ClientFormProps) {
  const [form, setForm] = useState<ClientFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setForm({
        name: client?.name ?? '',
        brandName: client?.brandName ?? '',
        industry: client?.industry ?? '',
        country: client?.country ?? '',
        website: client?.website ?? '',
        notes: client?.notes ?? '',
      })
      setError(null)
    }
  }, [open, client])

  function set(field: keyof ClientFormData, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: form.name,
        brandName: form.brandName || null,
        industry: form.industry || null,
        country: form.country || null,
        website: form.website || null,
        notes: form.notes || null,
      }
      let res: Response
      if (client) {
        res = await fetch(`/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved = await res.json()
      // Preserve _count for existing clients
      onSaved({ ...saved, _count: saved._count ?? client?._count ?? { contacts: 0 } })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{client ? 'Ügyfél szerkesztése' : 'Új ügyfél'}</DialogTitle>
          <DialogDescription>
            Töltsd ki az ügyfélcég adatait. A csillaggal jelölt mezők kötelezők.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cl-name">Cégnév *</Label>
              <Input
                id="cl-name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="pl. Globex Corporation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-brand">Márkanév</Label>
              <Input
                id="cl-brand"
                value={form.brandName}
                onChange={(e) => set('brandName', e.target.value)}
                placeholder="pl. Globex"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-industry">Iparág</Label>
              <Input
                id="cl-industry"
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="pl. Technológia"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-country">Ország</Label>
              <Input
                id="cl-country"
                value={form.country}
                onChange={(e) => set('country', e.target.value)}
                placeholder="pl. Magyarország"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-web">Weboldal</Label>
              <Input
                id="cl-web"
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://"
                type="url"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-notes">Megjegyzés</Label>
            <Textarea
              id="cl-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Belső megjegyzések az ügyfélről..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Mégse
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false))
  }, [])

  function openAdd() {
    setEditingClient(null)
    setFormOpen(true)
  }

  function openEdit(client: ClientCompany, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingClient(client)
    setFormOpen(true)
  }

  function handleSaved(saved: ClientCompany) {
    setClients((prev) => {
      const exists = prev.some((c) => c.id === saved.id)
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
    })
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setDeleteConfirmId(id)
  }

  async function confirmDelete() {
    if (!deleteConfirmId) return
    setDeletingId(deleteConfirmId)
    setDeleteConfirmId(null)
    try {
      const res = await fetch(`/api/clients/${deleteConfirmId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClients((prev) => prev.filter((c) => c.id !== deleteConfirmId))
    } finally {
      setDeletingId(null)
    }
  }

  function handleExcelImport() {
    fileInputRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Placeholder: actual xlsx parsing would use a library like xlsx/sheetjs
    alert(`Excel import: "${file.name}" - Ez a funkció fejlesztés alatt áll.`)
    e.target.value = ''
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
          <h1 className="text-3xl font-bold tracking-tight">Ügyfélcégek</h1>
          <p className="text-muted-foreground mt-1">
            {clients.length > 0
              ? `${clients.length} ügyfél a rendszerben`
              : 'Ügyfélcégek kezelése'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExcelImport}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel import
          </Button>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Új ügyfél
          </Button>
        </div>
      </div>

      {/* Hidden file input for xlsx */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Table */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed rounded-lg">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="text-center">
            <p className="font-medium">Még nincs ügyfél</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adj hozzá ügyfélcégeket manuálisan vagy Excel import segítségével.
            </p>
          </div>
          <Button onClick={openAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Első ügyfél hozzáadása
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cégnév</TableHead>
                <TableHead>Márkanév</TableHead>
                <TableHead>Iparág</TableHead>
                <TableHead>Ország</TableHead>
                <TableHead className="text-center">Kontaktok</TableHead>
                <TableHead>Hozzáadva</TableHead>
                <TableHead className="w-28 text-right">Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/clients/${client.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {client.name}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.brandName ?? '—'}
                  </TableCell>
                  <TableCell>
                    {client.industry ? (
                      <Badge variant="secondary" className="font-normal">
                        {client.industry}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {client.country ?? '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{client._count.contacts}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(client.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => openEdit(client, e)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(client.id, e)}
                        disabled={deletingId === client.id}
                      >
                        {deletingId === client.id ? (
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

      {/* Client Form Dialog */}
      <ClientForm
        client={editingClient}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmId !== null}
        onOpenChange={(o) => { if (!o) setDeleteConfirmId(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ügyfél törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt az ügyfelet? Az összes kontakt és kapcsolódó adat
              elvész. Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Mégse
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
