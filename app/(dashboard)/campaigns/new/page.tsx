'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2, Megaphone, Info, Sparkles, AlertCircle } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Design {
  id: string
  name: string
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function NewCampaignPage() {
  const router = useRouter()

  // Form fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('hu')
  const [goal, setGoal] = useState('')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [designId, setDesignId] = useState<string>('none')

  // Async state
  const [designs, setDesigns] = useState<Design[]>([])
  const [loadingDesigns, setLoadingDesigns] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptGenError, setPromptGenError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/designs')
      .then((r) => r.json())
      .then((data) => setDesigns(Array.isArray(data) ? data : []))
      .catch(() => setDesigns([]))
      .finally(() => setLoadingDesigns(false))
  }, [])

  async function handleGeneratePrompt() {
    setGeneratingPrompt(true)
    setPromptGenError(null)
    try {
      const res = await fetch('/api/campaigns/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignGoal: goal,
          language,
          campaignName: name,
          campaignDescription: description,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromptGenError(data.error || 'Generálás sikertelen')
      } else {
        setSystemPrompt(data.systemPrompt)
        setPromptGenError(null)
      }
    } catch {
      setPromptGenError('Hálózati hiba a generálás során')
    } finally {
      setGeneratingPrompt(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!systemPrompt.trim()) {
      setError('A rendszerprompt megadása kötelező.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const body = {
        name,
        description: description || null,
        language,
        goal: goal || null,
        systemPrompt,
        designId: designId === 'none' ? null : designId || null,
      }
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Létrehozás sikertelen')
      }
      const created = await res.json()
      router.push(`/campaigns/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ismeretlen hiba')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 text-muted-foreground"
          onClick={() => router.push('/campaigns')}
          disabled={saving}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Kampányok
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Új kampány</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Állítsd be a kampány alapadatait és az AI viselkedését.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alapadatok</CardTitle>
            <CardDescription>A kampány azonosító adatai és célnyelve.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp-name">Kampánynév *</Label>
              <Input
                id="camp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. 2025 Q1 SaaS ajánlat kampány"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="camp-desc">Leírás</Label>
              <Textarea
                id="camp-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rövid leírás a kampányról..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nyelv *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hu">Magyar</SelectItem>
                    <SelectItem value="en">Angol</SelectItem>
                    <SelectItem value="de">Német</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Design sablon</Label>
                <Select
                  value={designId}
                  onValueChange={setDesignId}
                  disabled={loadingDesigns}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDesigns ? 'Betöltés...' : 'Nincs (alapértelmezett)'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nincs (alapértelmezett)</SelectItem>
                    {designs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">AI beállítások</CardTitle>
            <CardDescription>
              Az AI viselkedését meghatározó instrukciók. A rendszerprompt meghatározza, hogyan
              generálja az AI az ajánlatokat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="camp-goal">Kampánycél</Label>
              <Textarea
                id="camp-goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Mi a kampány célja? pl. Bemutatni a SaaS megoldásunkat technológia-érzékeny B2B ügyfeleknek..."
                rows={3}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Label htmlFor="camp-prompt">Rendszerprompt *</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ez határozza meg, hogyan gondolkodik az AI ajánlat generáláskor.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800 disabled:opacity-50"
                  disabled={!goal.trim() || generatingPrompt}
                  onClick={handleGeneratePrompt}
                  title={!goal.trim() ? 'Először töltsd ki a kampánycélt' : 'Rendszerprompt generálása AI-val'}
                >
                  {generatingPrompt
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Generálás...</>
                    : <><Sparkles className="h-3.5 w-3.5" />✨ Generálás AI-val</>}
                </Button>
              </div>

              {/* Prompt gen error */}
              {promptGenError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  {promptGenError}
                </div>
              )}

              {/* Generálás folyamatban – info */}
              {generatingPrompt && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 text-purple-800 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  A Claude elemzi a tudásbázist és generálja a rendszerprompot... Ez 15–30 másodpercet vehet igénybe.
                </div>
              )}

              <Textarea
                id="camp-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={`Töltsd ki a kampánycélt, majd kattints a "✨ Generálás AI-val" gombra – a Claude automatikusan létrehozza a rendszerprompot a saját cég tudásbázisa alapján.\n\nVagy írj sajátot:\nTe egy B2B ajánlatkészítő AI vagy. Feladatod személyre szabott ajánlatokat készíteni...`}
                rows={14}
                className="font-mono text-sm"
                required
                disabled={generatingPrompt}
              />
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                A generált prompt szerkeszthető – finomhangolhatod mielőtt mentesz.
                {!goal.trim() && <span className="text-amber-600 ml-1">← Töltsd ki előbb a kampánycélt!</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/campaigns')}
            disabled={saving}
          >
            Mégse
          </Button>
          <Button
            type="submit"
            disabled={saving || !name.trim() || !systemPrompt.trim()}
            size="lg"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kampány létrehozása
          </Button>
        </div>
      </form>
    </div>
  )
}
