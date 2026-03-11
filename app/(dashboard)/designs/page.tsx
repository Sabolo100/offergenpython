'use client'

import { useState, useEffect, useMemo } from 'react'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Loader2, Star, AlertCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ── Típusok ───────────────────────────────────────────────────────────────────

interface DesignConfig {
  isDefault?: boolean
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  headerBg?: string
  bodyBg?: string
  sectionAltBg?: string
  textColor?: string
  mutedText?: string
  borderColor?: string
  fontFamily?: string
  fontFamilyHeading?: string
  fontSize?: string
  lineHeight?: string
  pageMarginTop?: string
  pageMarginBottom?: string
  pageMarginLeft?: string
  pageMarginRight?: string
  logoUrl?: string
  footerText?: string
  borderRadius?: string
  boxShadow?: string
  [key: string]: unknown
}

interface Design {
  id: string
  name: string
  config: DesignConfig
  createdAt: string
  updatedAt: string
  _count?: { campaigns: number }
}

// ── Konstansok ────────────────────────────────────────────────────────────────

const DEFAULT_DESIGN_NAME = 'Semleges \u2013 Alap\u00e9rtelmezett'

const BLANK_CONFIG: DesignConfig = {
  primaryColor: '#2563EB',
  secondaryColor: '#475569',
  accentColor: '#0EA5E9',
  headerBg: '#0F172A',
  bodyBg: '#FFFFFF',
  sectionAltBg: '#F8FAFC',
  textColor: '#0F172A',
  mutedText: '#64748B',
  borderColor: '#E2E8F0',
  fontFamily: 'Inter',
  fontFamilyHeading: 'Inter',
  fontSize: '14px',
  lineHeight: '1.6',
  pageMarginTop: '20mm',
  pageMarginBottom: '20mm',
  pageMarginLeft: '18mm',
  pageMarginRight: '18mm',
  logoUrl: '',
  footerText: '',
  borderRadius: '6px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

const defaultForm = {
  name: '',
  configJson: JSON.stringify(BLANK_CONFIG, null, 2),
}

// ── Mini vizualis elonezet ────────────────────────────────────────────────────

function DesignPreview({ config }: { config: DesignConfig }) {
  const primary   = config.primaryColor   ?? '#2563EB'
  const secondary = config.secondaryColor ?? '#475569'
  const accent    = config.accentColor    ?? '#0EA5E9'
  const headerBg  = config.headerBg       ?? '#0F172A'
  const bodyBg    = config.bodyBg         ?? '#FFFFFF'
  const textColor = config.textColor      ?? '#0F172A'
  const font      = config.fontFamily     ?? 'Inter'

  return (
    <div className="rounded-lg overflow-hidden border text-xs" style={{ fontFamily: font }}>
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: headerBg }}>
        {config.logoUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={config.logoUrl} alt="logo" className="h-4 w-auto object-contain" />
          : <div className="h-4 w-16 rounded bg-white/20" />
        }
        <span className="text-white/60 text-xs">fejlec</span>
      </div>
      <div className="p-3 space-y-2" style={{ backgroundColor: bodyBg, color: textColor }}>
        <div className="flex gap-1.5 flex-wrap">
          {([
            { color: primary,   label: 'Elso' },
            { color: secondary, label: 'Masod' },
            { color: accent,    label: 'CTA' },
          ] as { color: string; label: string }[]).map(({ color, label }) => (
            <span key={label} className="px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: color }}>
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5">
          <div className="h-6 rounded flex-1 flex items-center justify-center text-white text-xs"
            style={{ backgroundColor: primary }}>Gomb</div>
          <div className="h-6 rounded flex-1 flex items-center justify-center border text-xs"
            style={{ color: primary, borderColor: primary }}>Outline</div>
        </div>
        <p className="text-xs" style={{ color: config.mutedText ?? '#64748B' }}>
          {font} {config.fontSize ?? '14px'} | margin {config.pageMarginLeft ?? '18mm'}
        </p>
      </div>
    </div>
  )
}

// ── Fokomponens ───────────────────────────────────────────────────────────────

export default function DesignsPage() {
  const { activeCompany } = useOwnCompany()
  const [designs, setDesigns]           = useState<Design[]>([])
  const [loading, setLoading]           = useState(true)
  const [seeding, setSeeding]           = useState(false)
  const [dialogOpen, setDialogOpen]     = useState(false)
  const [deleteOpen, setDeleteOpen]     = useState(false)
  const [editingId, setEditingId]       = useState<string | null>(null)
  const [deletingD, setDeletingD]       = useState<Design | null>(null)
  const [form, setForm]                 = useState(defaultForm)
  const [jsonError, setJsonError]       = useState<string | null>(null)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  // ── Betoltes + auto-seed ──────────────────────────────────────────────────

  async function fetchDesigns(autoSeedIfEmpty = false) {
    if (!activeCompany) return
    setLoading(true)
    try {
      const res  = await fetch(`/api/designs?companyId=${activeCompany.id}`)
      const data = await res.json()
      const list: Design[] = Array.isArray(data) ? data : []
      setDesigns(list)
      if (autoSeedIfEmpty && list.length === 0) {
        await runSeed(false)
      }
    } catch {
      setError('Nem sikerult betolteni a designokat.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!activeCompany) return
    fetchDesigns(true)
  }, [activeCompany]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runSeed(feedback = true) {
    if (feedback) setSeeding(true)
    try {
      const res  = await fetch('/api/designs/seed-default', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownCompanyId: activeCompany!.id }),
      })
      const data = await res.json()
      if (res.ok && data.design) {
        setDesigns((prev) =>
          prev.some((d) => d.id === data.design.id) ? prev : [data.design, ...prev]
        )
      }
    } catch {
      if (feedback) setError('Alapertelmezett design letrehozasa sikertelen.')
    } finally {
      if (feedback) setSeeding(false)
    }
  }

  // ── Live JSON parse ───────────────────────────────────────────────────────

  const parsedConfig = useMemo<DesignConfig | null>(() => {
    try {
      const p = JSON.parse(form.configJson)
      setJsonError(null)
      return p
    } catch {
      setJsonError('Ervénytelen JSON formatum')
      return null
    }
  }, [form.configJson])

  // ── Dialogus megnyitok ────────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null)
    setForm(defaultForm)
    setJsonError(null)
    setDialogOpen(true)
  }

  function openEdit(d: Design) {
    setEditingId(d.id)
    setForm({ name: d.name, configJson: JSON.stringify(d.config, null, 2) })
    setJsonError(null)
    setDialogOpen(true)
  }

  function openDelete(d: Design) {
    setDeletingD(d)
    setDeleteOpen(true)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (jsonError || !parsedConfig) return
    setSaving(true)
    setError(null)
    try {
      const body = { name: form.name.trim(), config: parsedConfig }
      if (editingId) {
        await fetch(`/api/designs/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, ownCompanyId: activeCompany!.id }),
        })
      }
      setDialogOpen(false)
      fetchDesigns()
    } catch {
      setError('Mentes sikertelen.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingD) return
    try {
      await fetch(`/api/designs/${deletingD.id}`, { method: 'DELETE' })
      setDeleteOpen(false)
      setDeletingD(null)
      fetchDesigns()
    } catch {
      setError('Torles sikertelen.')
    }
  }

  function isDefault(d: Design) {
    return (d.config as DesignConfig)?.isDefault === true || d.name === DEFAULT_DESIGN_NAME
  }

  const hasDefault = designs.some(isDefault)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Fejlec */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Designok</h1>
          <p className="text-muted-foreground mt-1">
            Ajanlatok vizualis megjelenitesenek kezelese – szinek, tipografia, margok.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!hasDefault && !loading && (
            <Button variant="outline" onClick={() => runSeed(true)} disabled={seeding}>
              {seeding
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Letrehozas...</>
                : <><Star className="mr-2 h-4 w-4" />Alapertelmezett visszaallitasa</>
              }
            </Button>
          )}
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />Uj design
          </Button>
        </div>
      </div>

      {/* Hibauzenet */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto text-xs underline" onClick={() => setError(null)}>Bezar</button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />Betoltes...
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed rounded-lg">
          <p className="text-muted-foreground text-sm">Meg nincsenek designok.</p>
          <div className="flex gap-2">
            <Button onClick={() => runSeed(true)} disabled={seeding}>
              {seeding
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Letrehozas...</>
                : <><Star className="mr-2 h-4 w-4" />Alapertelmezett letrehozasa</>
              }
            </Button>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Egyedi design
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {[...designs]
            .sort((a, b) => (isDefault(b) ? 1 : 0) - (isDefault(a) ? 1 : 0))
            .map((d) => {
              const cfg = (d.config ?? {}) as DesignConfig
              const def = isDefault(d)

              return (
                <Card key={d.id} className={def ? 'ring-2 ring-primary/20' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <CardTitle className="text-base font-semibold truncate">{d.name}</CardTitle>
                        {def && (
                          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                            <Star className="mr-1 h-3 w-3" />
                            Alapertelmezett
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => openEdit(d)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => openDelete(d)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <span>Letrehozva: {formatDate(d.createdAt)}</span>
                      <span>·</span>
                      <span>{d._count?.campaigns ?? 0} kampanyban hasznalva</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Bal: szinpaletta + adatok */}
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground">Szinpaletta</p>
                        <div className="flex items-center gap-1.5">
                          {(['primaryColor','secondaryColor','accentColor','headerBg'] as (keyof DesignConfig)[]).map((k) =>
                            cfg[k] ? (
                              <span key={String(k)}
                                className="inline-block h-5 w-5 rounded-full border shadow-sm"
                                style={{ backgroundColor: String(cfg[k]) }}
                                title={`${String(k)}: ${String(cfg[k])}`}
                              />
                            ) : null
                          )}
                          {cfg.fontFamily && (
                            <span className="text-xs text-muted-foreground ml-1">{String(cfg.fontFamily)}</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {([
                            ['Elsodleges',    'primaryColor'],
                            ['Masodlagos',    'secondaryColor'],
                            ['Kiemelo (CTA)', 'accentColor'],
                            ['Fejlec hatter', 'headerBg'],
                            ['Betutipus',     'fontFamily'],
                            ['Beturet',       'fontSize'],
                          ] as [string, string][]).map(([label, key]) =>
                            cfg[key] ? (
                              <div key={key} className="flex items-center gap-1 min-w-0">
                                {['primaryColor','secondaryColor','accentColor','headerBg'].includes(key) && (
                                  <span className="inline-block h-3 w-3 rounded-full border shrink-0"
                                    style={{ backgroundColor: String(cfg[key]) }} />
                                )}
                                <span className="text-muted-foreground shrink-0">{label}:</span>
                                <span className="font-mono truncate">{String(cfg[key])}</span>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                      {/* Jobb: vizualis elonezet */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Elonezet</p>
                        <DesignPreview config={cfg} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          }
        </div>
      )}

      {/* ── Letrehozas / Szerkesztes dialog ──────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Design szerkesztese' : 'Uj design'}</DialogTitle>
            <DialogDescription>
              Szerkeszd a design konfiguraciот JSON formatumban. Az elonezet azonnal frissul.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="design-name">Nev *</Label>
              <Input
                id="design-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="pl. ARworks Kek, Minimal Feher"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="design-config">Konfiguracio (JSON) *</Label>
                <Textarea
                  id="design-config"
                  value={form.configJson}
                  onChange={(e) => setForm({ ...form, configJson: e.target.value })}
                  rows={18}
                  className="font-mono text-xs"
                />
                {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
              </div>
              <div className="space-y-2">
                <Label>Elo elonezet</Label>
                {parsedConfig && !jsonError
                  ? <DesignPreview config={parsedConfig} />
                  : (
                    <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                      Ervényes JSON szukseges az elonézethez
                    </div>
                  )
                }
                <div className="rounded-lg bg-muted/40 border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground mb-1">Elerheto mezok:</p>
                  {[
                    'primaryColor, secondaryColor, accentColor',
                    'headerBg, bodyBg, sectionAltBg',
                    'textColor, mutedText, borderColor',
                    'fontFamily, fontFamilyHeading, fontSize',
                    'pageMarginTop/Bottom/Left/Right',
                    'logoUrl, footerText',
                    'borderRadius, boxShadow',
                  ].map((l) => <p key={l} className="font-mono">{l}</p>)}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Megse</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !!jsonError || !parsedConfig}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Torles confirm ───────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Design torlese</DialogTitle>
            <DialogDescription>
              Biztosan torolni szeretned a{' '}
              <span className="font-semibold">&bdquo;{deletingD?.name}&rdquo;</span> designt?
              {(deletingD?._count?.campaigns ?? 0) > 0 && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ {deletingD?._count?.campaigns} kampanyhoz van rendelve – azok elveszitik a design beallitasukat.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Megse</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Torles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
