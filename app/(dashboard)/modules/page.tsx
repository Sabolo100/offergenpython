'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'

// ── Típusok ───────────────────────────────────────────────────────────────────

interface Campaign {
  id: string
  name: string
}

interface ModuleDefinition {
  id: string
  campaignId: string
  name: string
  type: string
  goal: string | null
  prompt: string | null
  fixedContent: string | null
  designNotes: string | null
  order: number
  isRequired: boolean
  campaign: Campaign
  createdAt: string
  updatedAt: string
}

// ── Modul szerkesztő / létrehozó dialog ──────────────────────────────────────

interface ModuleDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  module: ModuleDefinition | null       // null = új létrehozás
  campaigns: Campaign[]
  defaultCampaignId?: string
  nextOrder: number
  onSaved: (mod: ModuleDefinition) => void
}

function ModuleDialog({
  open,
  onOpenChange,
  module,
  campaigns,
  defaultCampaignId,
  nextOrder,
  onSaved,
}: ModuleDialogProps) {
  const [campaignId, setCampaignId] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState('variable')
  const [goal, setGoal] = useState('')
  const [prompt, setPrompt] = useState('')
  const [fixedContent, setFixedContent] = useState('')
  const [designNotes, setDesignNotes] = useState('')
  const [isRequired, setIsRequired] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCampaignId(module?.campaignId ?? defaultCampaignId ?? '')
      setName(module?.name ?? '')
      setType(module?.type ?? 'variable')
      setGoal(module?.goal ?? '')
      setPrompt(module?.prompt ?? '')
      setFixedContent(module?.fixedContent ?? '')
      setDesignNotes(module?.designNotes ?? '')
      setIsRequired(module?.isRequired ?? true)
      setError(null)
    }
  }, [open, module, defaultCampaignId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!campaignId) { setError('Válassz kampányt!'); return }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name,
        type,
        goal: goal || null,
        prompt: type === 'variable' ? (prompt || null) : null,
        fixedContent: type === 'fixed' ? (fixedContent || null) : null,
        designNotes: designNotes || null,
        isRequired,
        ...(module ? {} : { campaignId, order: nextOrder }),
      }
      const res = module
        ? await fetch(`/api/module-defs/${module.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/module-defs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })

      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved: ModuleDefinition = await res.json()
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{module ? 'Modul szerkesztése' : 'Új modul'}</DialogTitle>
          <DialogDescription>
            Határozd meg a modul viselkedését és tartalmát az ajánlat generálásához.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">

          {/* Kampány (csak új modul esetén választható) */}
          {!module && (
            <div className="space-y-2">
              <Label>Kampány *</Label>
              <Select value={campaignId} onValueChange={setCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz kampányt..." />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {module && (
            <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
              Kampány: <span className="font-medium text-foreground">{module.campaign?.name}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="mod-name">Modul neve *</Label>
              <Input
                id="mod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. Bevezető megszólítás, Referenciák, Árazás"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Típus</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="variable">Változó (AI generált)</SelectItem>
                  <SelectItem value="fixed">Fix (rögzített tartalom)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex flex-col justify-end">
              <Label className="text-sm">Kötelező modul</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isRequired}
                  onClick={() => setIsRequired((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    isRequired ? 'bg-primary' : 'bg-input'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isRequired ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm text-muted-foreground">
                  {isRequired ? 'Kötelező' : 'Opcionális'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mod-goal">Cél / Leírás</Label>
            <Textarea
              id="mod-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Mit kell elérnie ennek a modulnak?"
              rows={2}
            />
          </div>

          {type === 'variable' ? (
            <div className="space-y-2">
              <Label htmlFor="mod-prompt">AI Prompt</Label>
              <Textarea
                id="mod-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Instrukciók az AI számára ehhez a modulhoz..."
                rows={7}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Az AI ezt a promptot kapja meg minden ügyfélre – a kutatási eredmények és a tudásbázis kontextusával kiegészítve.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="mod-fixed">Fix tartalom</Label>
              <Textarea
                id="mod-fixed"
                value={fixedContent}
                onChange={(e) => setFixedContent(e.target.value)}
                placeholder="A modul rögzített szövege (Markdown formázás engedélyezett)..."
                rows={7}
              />
              <p className="text-xs text-muted-foreground">
                Ez a szöveg minden ügyfélnél változatlanul jelenik meg az ajánlatban.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mod-design">Design megjegyzések</Label>
            <Textarea
              id="mod-design"
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder="Vizuális megjelenéssel kapcsolatos instrukciók (pl. kiemelő doboz, 2 oszlopos layout)..."
              rows={2}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Mégse</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !name.trim() || !campaignId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Főkomponens ───────────────────────────────────────────────────────────────

export default function ModulesPage() {
  const { activeCompany } = useOwnCompany()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [modules, setModules] = useState<ModuleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Szűrés
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')

  // Modul dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleDefinition | null>(null)
  const [defaultCampaignId, setDefaultCampaignId] = useState<string>('')

  // Törlés confirm
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingModule, setDeletingModule] = useState<ModuleDefinition | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Átrendezés
  const [reordering, setReordering] = useState(false)

  // ── Adatok betöltése ────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!activeCompany) return
    setLoading(true)
    setError(null)
    try {
      const [campaignsRes, modulesRes] = await Promise.all([
        fetch(`/api/campaigns?companyId=${activeCompany.id}`),
        fetch(`/api/module-defs?companyId=${activeCompany.id}`),
      ])
      const campaignsData = await campaignsRes.json()
      const modulesData = await modulesRes.json()
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
      setModules(Array.isArray(modulesData) ? modulesData : [])
    } catch {
      setError('Nem sikerült betölteni az adatokat.')
    } finally {
      setLoading(false)
    }
  }, [activeCompany])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Szűrt + csoportosított modulok ─────────────────────────────────────────

  const filteredModules =
    selectedCampaign === 'all'
      ? modules
      : modules.filter((m) => m.campaignId === selectedCampaign)

  const groupedByCampaign = filteredModules.reduce<Record<string, ModuleDefinition[]>>(
    (acc, mod) => {
      if (!acc[mod.campaignId]) acc[mod.campaignId] = []
      acc[mod.campaignId].push(mod)
      return acc
    },
    {}
  )

  // Max order egy kampányon belül (új modul számára)
  function nextOrderForCampaign(cId: string) {
    const mods = modules.filter((m) => m.campaignId === cId)
    return mods.length > 0 ? Math.max(...mods.map((m) => m.order)) + 1 : 0
  }

  // ── Dialog megnyitók ────────────────────────────────────────────────────────

  function openCreate(campaignId?: string) {
    setEditingModule(null)
    setDefaultCampaignId(campaignId ?? (selectedCampaign !== 'all' ? selectedCampaign : ''))
    setDialogOpen(true)
  }

  function openEdit(mod: ModuleDefinition) {
    setEditingModule(mod)
    setDefaultCampaignId(mod.campaignId)
    setDialogOpen(true)
  }

  function openDelete(mod: ModuleDefinition) {
    setDeletingModule(mod)
    setDeleteDialogOpen(true)
  }

  // ── CRUD műveletek ──────────────────────────────────────────────────────────

  function handleSaved(saved: ModuleDefinition) {
    setModules((prev) => {
      const exists = prev.some((m) => m.id === saved.id)
      if (exists) return prev.map((m) => (m.id === saved.id ? saved : m))
      return [...prev, saved]
    })
  }

  async function handleDelete() {
    if (!deletingModule) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/module-defs/${deletingModule.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Törlés sikertelen')
      setModules((prev) => prev.filter((m) => m.id !== deletingModule.id))
      setDeleteDialogOpen(false)
      setDeletingModule(null)
    } catch {
      setError('Törlés sikertelen.')
    } finally {
      setDeleting(false)
    }
  }

  async function moveModule(mod: ModuleDefinition, direction: 'up' | 'down') {
    const campaignMods = [...modules.filter((m) => m.campaignId === mod.campaignId)]
      .sort((a, b) => a.order - b.order)
    const idx = campaignMods.findIndex((m) => m.id === mod.id)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= campaignMods.length - 1) return

    const swapWith = campaignMods[direction === 'up' ? idx - 1 : idx + 1]
    const newOrder = [
      { id: mod.id, order: swapWith.order },
      { id: swapWith.id, order: mod.order },
    ]

    setReordering(true)
    try {
      await fetch('/api/module-defs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: newOrder }),
      })
      setModules((prev) =>
        prev.map((m) => {
          const entry = newOrder.find((e) => e.id === m.id)
          return entry ? { ...m, order: entry.order } : m
        })
      )
    } catch {
      setError('Átrendezés sikertelen.')
    } finally {
      setReordering(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modulok</h1>
          <p className="text-muted-foreground mt-1">
            Kampány modul definíciók kezelése – létrehozás, szerkesztés, átrendezés.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Új modul
        </Button>
      </div>

      {/* Hibaüzenet */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Bezár</button>
        </div>
      )}

      {/* Szűrő sáv */}
      <div className="flex items-center gap-4">
        <div className="w-72">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger>
              <SelectValue placeholder="Szűrés kampányra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Összes kampány</SelectItem>
              {campaigns.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredModules.length} modul
        </p>
      </div>

      {/* Tartalom */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Betöltés...
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">
            {selectedCampaign === 'all'
              ? 'Még nincsenek modulok. Hozz létre egyet, vagy generálj AI-val a kampány oldalán.'
              : 'Ehhez a kampányhoz még nincsenek modulok.'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" />
              Új modul
            </Button>
            {selectedCampaign !== 'all' && (
              <Link href={`/campaigns/${selectedCampaign}`}>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Kampány oldal
                </Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByCampaign).map(([campaignId, mods]) => {
            const campaign = campaigns.find((c) => c.id === campaignId)
              ?? mods[0]?.campaign
            const sorted = [...mods].sort((a, b) => a.order - b.order)

            return (
              <Card key={campaignId}>
                <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
                  <CardTitle className="text-base font-semibold">
                    {campaign?.name ?? 'Ismeretlen kampány'}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({sorted.length} modul)
                    </span>
                  </CardTitle>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => openCreate(campaignId)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Hozzáad
                    </Button>
                    <Link href={`/campaigns/${campaignId}`}>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Kampány
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-center">Sorrend</TableHead>
                        <TableHead>Név</TableHead>
                        <TableHead>Típus</TableHead>
                        <TableHead>Cél</TableHead>
                        <TableHead>Kötelező</TableHead>
                        <TableHead className="w-28 text-right">Műveletek</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sorted.map((mod, idx) => (
                        <TableRow key={mod.id} className="group">
                          {/* Sorrend + nyilak */}
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => moveModule(mod, 'up')}
                                disabled={idx === 0 || reordering}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Feljebb"
                              >
                                <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                                {idx + 1}
                              </span>
                              <button
                                onClick={() => moveModule(mod, 'down')}
                                disabled={idx === sorted.length - 1 || reordering}
                                className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Lejjebb"
                              >
                                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </TableCell>

                          {/* Név + tartalom preview */}
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{mod.name}</p>
                              {mod.type === 'variable' && mod.prompt && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs font-mono">
                                  {mod.prompt.slice(0, 80)}…
                                </p>
                              )}
                              {mod.type === 'fixed' && mod.fixedContent && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 max-w-xs">
                                  {mod.fixedContent.slice(0, 80)}…
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Típus */}
                          <TableCell>
                            <Badge
                              variant={mod.type === 'fixed' ? 'secondary' : 'outline'}
                              className="text-xs whitespace-nowrap"
                            >
                              {mod.type === 'fixed' ? 'Fix' : 'AI generált'}
                            </Badge>
                          </TableCell>

                          {/* Cél */}
                          <TableCell className="max-w-xs">
                            {mod.goal ? (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {mod.goal}
                              </p>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">—</span>
                            )}
                          </TableCell>

                          {/* Kötelező */}
                          <TableCell>
                            {mod.isRequired ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-transparent text-xs">
                                Kötelező
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Opcionális</Badge>
                            )}
                          </TableCell>

                          {/* Műveletek */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8"
                                onClick={() => openEdit(mod)}
                                title="Szerkesztés"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDelete(mod)}
                                title="Törlés"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Modul létrehozás / szerkesztés dialog ──────────────────────────── */}
      <ModuleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        module={editingModule}
        campaigns={campaigns}
        defaultCampaignId={defaultCampaignId}
        nextOrder={nextOrderForCampaign(editingModule?.campaignId ?? defaultCampaignId)}
        onSaved={handleSaved}
      />

      {/* ── Törlés megerősítő dialog ───────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modul törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd a{' '}
              <span className="font-semibold">„{deletingModule?.name}"</span> modult?
              Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>Mégse</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
