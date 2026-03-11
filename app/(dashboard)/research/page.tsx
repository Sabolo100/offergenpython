'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
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
import { Plus, Pencil, Trash2, Sparkles, AlertCircle, Check, Loader2 } from 'lucide-react'

// ── Típusok ───────────────────────────────────────────────────────────────────

interface ResearchDefinition {
  id: string
  name: string
  description: string | null
  aiPlatform: string
  prompt: string
  resultFormat: string | null
  freshnessDays: number
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Campaign {
  id: string
  name: string
  goal: string | null
  systemPrompt: string
}

// ── Alapértelmezett form state ─────────────────────────────────────────────────

const defaultForm = {
  name: '',
  description: '',
  aiPlatform: 'perplexity',
  prompt: '',
  resultFormat: '',
  freshnessDays: 7,
  priority: 0,
  isActive: true,
}

type FormState = typeof defaultForm

// ── Komponens ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  // Alap lista
  const [defs, setDefs] = useState<ResearchDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // CRUD dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(defaultForm)
  const [saving, setSaving] = useState(false)

  // Törlés dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // AI generálás – kampányválasztó lépés
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [campaignPickerOpen, setCampaignPickerOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  // AI generálás – megerősítés + futás
  const [genConfirmOpen, setGenConfirmOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genSuccess, setGenSuccess] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  // ── Adatok betöltése ────────────────────────────────────────────────────────

  async function fetchDefs() {
    setLoading(true)
    try {
      const res = await fetch('/api/research-defs')
      const data = await res.json()
      setDefs(data)
    } catch {
      setError('Nem sikerült betölteni a research definíciókat.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchCampaigns() {
    setLoadingCampaigns(true)
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(Array.isArray(data) ? data : (data.campaigns ?? []))
    } catch {
      /* nem kritikus */
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    fetchDefs()
    fetchCampaigns()
  }, [])

  // ── CRUD ────────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  function openEdit(def: ResearchDefinition) {
    setEditingId(def.id)
    setForm({
      name: def.name,
      description: def.description ?? '',
      aiPlatform: def.aiPlatform,
      prompt: def.prompt,
      resultFormat: def.resultFormat ?? '',
      freshnessDays: def.freshnessDays,
      priority: def.priority,
      isActive: def.isActive,
    })
    setDialogOpen(true)
  }

  function openDelete(id: string) {
    setDeletingId(id)
    setDeleteDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const body = {
        ...form,
        freshnessDays: Number(form.freshnessDays),
        priority: Number(form.priority),
      }
      if (editingId) {
        await fetch(`/api/research-defs/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/research-defs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setDialogOpen(false)
      fetchDefs()
    } catch {
      setError('Mentés sikertelen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      await fetch(`/api/research-defs/${deletingId}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setDeletingId(null)
      fetchDefs()
    } catch {
      setError('Törlés sikertelen.')
    }
  }

  async function toggleActive(def: ResearchDefinition) {
    try {
      await fetch(`/api/research-defs/${def.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !def.isActive }),
      })
      fetchDefs()
    } catch {
      setError('Frissítés sikertelen.')
    }
  }

  // ── AI generálás ────────────────────────────────────────────────────────────

  function openCampaignPicker() {
    setSelectedCampaignId('')
    setGenError(null)
    setCampaignPickerOpen(true)
  }

  function proceedToConfirm() {
    if (!selectedCampaignId) return
    setCampaignPickerOpen(false)
    if (defs.length > 0) {
      setGenConfirmOpen(true)
    } else {
      runGenerate(false)
    }
  }

  async function runGenerate(replaceExisting: boolean) {
    setGenConfirmOpen(false)
    setGenerating(true)
    setGenError(null)
    setGenSuccess(null)
    try {
      const res = await fetch('/api/research-defs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: selectedCampaignId, replaceExisting }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(data.error || 'Generálás sikertelen')
      } else {
        setGenSuccess(data.message)
        fetchDefs()
        setTimeout(() => setGenSuccess(null), 7000)
      }
    } catch {
      setGenError('Hálózati hiba a generálás során')
    } finally {
      setGenerating(false)
    }
  }

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Fejléc */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Research Definíciók</h1>
          <p className="text-muted-foreground mt-1">
            Globális AI kutatási sablonok – minden kampányfutásnál lefutnak az összes megcélzott ügyfélre.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={openCampaignPicker}
            disabled={generating || campaigns.length === 0}
            title={campaigns.length === 0 ? 'Először hozz létre egy kampányt' : ''}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generálás... (~30s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                AI kutatások generálása
              </>
            )}
          </button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Új research
          </Button>
        </div>
      </div>

      {/* Visszajelzések */}
      {genError && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {genError}
        </div>
      )}
      {genSuccess && (
        <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <Check className="h-4 w-4 shrink-0" />
          {genSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Placeholder szintaxis info */}
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-medium">Elérhető placeholder-ek a prompt szövegben: </span>
        <code className="bg-background border rounded px-1 py-0.5 mx-1">{'{{CLIENT_NAME}}'}</code> – ügyfél cég neve,{' '}
        <code className="bg-background border rounded px-1 py-0.5 mx-1">{'{{CLIENT_WEBSITE}}'}</code> – weboldal,{' '}
        <code className="bg-background border rounded px-1 py-0.5 mx-1">{'{{CLIENT_INDUSTRY}}'}</code> – iparág
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Betöltés...
            </div>
          ) : defs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-muted-foreground text-sm">Még nincs research definíció.</p>
              <div className="flex justify-center gap-2">
                <button
                  onClick={openCampaignPicker}
                  disabled={campaigns.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  AI kutatások generálása
                </button>
                <Button variant="outline" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manuális hozzáadás
                </Button>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név / Leírás</TableHead>
                  <TableHead>AI Platform</TableHead>
                  <TableHead>Frissesség</TableHead>
                  <TableHead>Prioritás</TableHead>
                  <TableHead>Aktív</TableHead>
                  <TableHead className="w-[100px]">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...defs].sort((a, b) => a.priority - b.priority).map((def) => (
                  <TableRow key={def.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{def.name}</p>
                        {def.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 max-w-md">
                            {def.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={def.aiPlatform === 'perplexity' ? 'default' : 'secondary'}
                        className="capitalize text-xs"
                      >
                        {def.aiPlatform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {def.freshnessDays} nap
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {def.priority}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => toggleActive(def)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                          def.isActive ? 'bg-primary' : 'bg-input'
                        }`}
                        aria-label={def.isActive ? 'Inaktiválás' : 'Aktiválás'}
                      >
                        <span
                          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                            def.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => openEdit(def)}
                          className="h-8 w-8"
                          aria-label="Szerkesztés"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => openDelete(def.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Törlés"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── 1. DIALOG: Kampányválasztó ─────────────────────────────────────── */}
      <Dialog open={campaignPickerOpen} onOpenChange={setCampaignPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>AI kutatások generálása</DialogTitle>
            <DialogDescription>
              Válaszd ki, melyik kampány célját és rendszerprompját használja az AI a kutatási definíciók megtervezéséhez.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loadingCampaigns ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Kampányok betöltése...
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Kampány kiválasztása</Label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz kampányt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedCampaign && (
              <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5 text-xs">
                {selectedCampaign.goal && (
                  <div>
                    <span className="font-medium text-foreground">Kampánycél: </span>
                    <span className="text-muted-foreground line-clamp-2">{selectedCampaign.goal}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-foreground">Rendszerprompt: </span>
                  {selectedCampaign.systemPrompt?.trim()
                    ? <span className="text-green-600">✓ Kitöltve</span>
                    : <span className="text-destructive">✗ Hiányzik – előbb töltsd ki!</span>
                  }
                </div>
              </div>
            )}

            <div className="rounded-lg border bg-blue-50 px-3 py-2 text-xs text-blue-700">
              <p className="font-medium mb-1">Mit fog az AI generálni?</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-600">
                <li>Cégprofil elemzés (háttér, értékek, tevékenység)</li>
                <li>Versenytárselemzés (releváns területen)</li>
                <li>Célcsoport motivációk és vásárlási szokások</li>
                <li>Döntéshozó / kapcsolattartó profil</li>
                <li>Digitális jelenlét és tartalomstratégia</li>
                <li>+ opcionális kutatások kampánycél alapján</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Mégse</Button>
            </DialogClose>
            <Button
              onClick={proceedToConfirm}
              disabled={!selectedCampaignId || !selectedCampaign?.systemPrompt?.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generálás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 2. DIALOG: Replace / Append megerősítés ───────────────────────── */}
      <Dialog open={genConfirmOpen} onOpenChange={setGenConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Meglévő kutatások kezelése</DialogTitle>
            <DialogDescription>
              Már van {defs.length} meglévő kutatási definíció. Mit szeretnél tenni?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <button
              onClick={() => runGenerate(true)}
              className="flex flex-col items-start gap-1 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 text-left hover:bg-destructive/10 transition-colors"
            >
              <span className="font-medium text-sm">🔄 Felülírás – töröld a meglévőket</span>
              <span className="text-xs text-muted-foreground">Az összes jelenlegi kutatás törlődik, és az AI teljesen új szettet hoz létre a kiválasztott kampány alapján.</span>
            </button>
            <button
              onClick={() => runGenerate(false)}
              className="flex flex-col items-start gap-1 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium text-sm">➕ Hozzáfűzés – tartsd meg a meglévőket</span>
              <span className="text-xs text-muted-foreground">A jelenlegi kutatások megmaradnak, az AI újakat ad hozzájuk.</span>
            </button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Mégse</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 3. DIALOG: Létrehozás / Szerkesztés ───────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Research szerkesztése' : 'Új research definíció'}
            </DialogTitle>
            <DialogDescription>
              Add meg a research definíció adatait. A prompt mezőben használhatod a{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{CLIENT_NAME}}'}</code>,{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{CLIENT_WEBSITE}}'}</code>{' '}
              és{' '}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{CLIENT_INDUSTRY}}'}</code>{' '}
              placeholder-eket.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rd-name">Név *</Label>
              <Input
                id="rd-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="pl. Cégprofil elemzés"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rd-description">Leírás</Label>
              <Input
                id="rd-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Rövid leírás a research céljáról"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rd-platform">AI Platform</Label>
              <Select
                value={form.aiPlatform}
                onValueChange={(v) => setForm({ ...form, aiPlatform: v })}
              >
                <SelectTrigger id="rd-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perplexity">Perplexity (webes keresés)</SelectItem>
                  <SelectItem value="claude">Claude (elemzés, szintézis)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rd-prompt">Prompt *</Label>
              <Textarea
                id="rd-prompt"
                value={form.prompt}
                onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                rows={7}
                placeholder={`Írd le a kutatási feladatot. Placeholder-ek:\n{{CLIENT_NAME}} – ügyfél cég neve\n{{CLIENT_WEBSITE}} – ügyfél weboldala\n{{CLIENT_INDUSTRY}} – iparág`}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rd-format">Eredmény formátum</Label>
              <Input
                id="rd-format"
                value={form.resultFormat}
                onChange={(e) => setForm({ ...form, resultFormat: e.target.value })}
                placeholder="pl. 5-7 bullet pont, Strukturált szekciók: X, Y, Z"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="rd-freshness">Frissesség (nap)</Label>
                <Input
                  id="rd-freshness"
                  type="number"
                  min={1}
                  value={form.freshnessDays}
                  onChange={(e) =>
                    setForm({ ...form, freshnessDays: parseInt(e.target.value) || 7 })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rd-priority">Prioritás (1 = legfőbb)</Label>
                <Input
                  id="rd-priority"
                  type="number"
                  value={form.priority}
                  onChange={(e) =>
                    setForm({ ...form, priority: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  form.isActive ? 'bg-primary' : 'bg-input'
                }`}
                aria-label="Aktív"
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                    form.isActive ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
              <Label
                className="cursor-pointer"
                onClick={() => setForm({ ...form, isActive: !form.isActive })}
              >
                Aktív
              </Label>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Mégse</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.prompt}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 4. DIALOG: Törlés megerősítés ─────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Research törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt a research definíciót? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Mégse</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
