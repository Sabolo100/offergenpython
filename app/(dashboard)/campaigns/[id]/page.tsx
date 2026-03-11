'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { STATUS_LABELS, STATUS_COLORS, formatDate, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Play,
  Users,
  Layers,
  Settings,
  ChevronUp,
  ChevronDown,
  X,
  Check,
  Megaphone,
  GripVertical,
  Save,
  Sparkles,
  AlertCircle,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Design {
  id: string
  name: string
}

interface Campaign {
  id: string
  name: string
  description?: string | null
  language: string
  goal?: string | null
  systemPrompt: string
  status: string
  designId?: string | null
  design?: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  _count: { runs: number }
  moduleDefinitions: ModuleDefinition[]
  campaignContacts: CampaignContact[]
}

interface CampaignContact {
  id: string
  campaignId: string
  contactId: string
  status: string
  createdAt: string
  contact: Contact
}

interface Contact {
  id: string
  name: string
  position?: string | null
  email: string
  clientCompany: {
    id: string
    name: string
    brandName?: string | null
  }
}

interface ModuleDefinition {
  id: string
  campaignId: string
  name: string
  type: string
  goal?: string | null
  order: number
  isRequired: boolean
  prompt?: string | null
  designNotes?: string | null
  fixedContent?: string | null
  createdAt: string
  updatedAt: string
}

interface Run {
  id: string
  campaignId: string
  status: string
  startedAt?: string | null
  completedAt?: string | null
  createdAt: string
  _count: { runItems: number }
}

const LANGUAGE_LABELS: Record<string, string> = { hu: 'Magyar', en: 'Angol', de: 'Német' }

// ── Module Form ───────────────────────────────────────────────────────────────

interface ModuleFormProps {
  campaignId: string
  module: ModuleDefinition | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (module: ModuleDefinition) => void
  nextOrder: number
}

function ModuleForm({ campaignId, module, open, onOpenChange, onSaved, nextOrder }: ModuleFormProps) {
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
      setName(module?.name ?? '')
      setType(module?.type ?? 'variable')
      setGoal(module?.goal ?? '')
      setPrompt(module?.prompt ?? '')
      setFixedContent(module?.fixedContent ?? '')
      setDesignNotes(module?.designNotes ?? '')
      setIsRequired(module?.isRequired ?? true)
      setError(null)
    }
  }, [open, module])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name,
        type,
        goal: goal || null,
        prompt: prompt || null,
        fixedContent: fixedContent || null,
        designNotes: designNotes || null,
        isRequired,
        ...(module ? {} : { campaignId, order: nextOrder }),
      }
      let res: Response
      if (module) {
        res = await fetch(`/api/module-defs/${module.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/module-defs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="mod-name">Modul neve *</Label>
              <Input
                id="mod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="pl. Bevezető, Referenciák, Árazás"
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
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
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
                rows={5}
                className="font-mono text-sm"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="mod-fixed">Fix tartalom</Label>
              <Textarea
                id="mod-fixed"
                value={fixedContent}
                onChange={(e) => setFixedContent(e.target.value)}
                placeholder="A modul rögzített szövege..."
                rows={5}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="mod-design">Design megjegyzések</Label>
            <Textarea
              id="mod-design"
              value={designNotes}
              onChange={(e) => setDesignNotes(e.target.value)}
              placeholder="Vizuális megjelenéssel kapcsolatos instrukciók..."
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Mégse</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !name.trim()}>
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

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { activeCompany } = useOwnCompany()
  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Alapadatok editing
  const [editingBasic, setEditingBasic] = useState(false)
  const [basicForm, setBasicForm] = useState({
    name: '',
    description: '',
    language: 'hu',
    goal: '',
    systemPrompt: '',
    designId: '',
    status: 'draft',
  })
  const [designs, setDesigns] = useState<Design[]>([])
  const [savingBasic, setSavingBasic] = useState(false)
  const [basicError, setBasicError] = useState<string | null>(null)
  const [generatingPrompt, setGeneratingPrompt] = useState(false)
  const [promptGenError, setPromptGenError] = useState<string | null>(null)

  // Contacts tab
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [addingContactId, setAddingContactId] = useState<string | null>(null)
  const [removingContactId, setRemovingContactId] = useState<string | null>(null)

  // Modules tab
  const [moduleFormOpen, setModuleFormOpen] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleDefinition | null>(null)
  const [deletingModuleId, setDeletingModuleId] = useState<string | null>(null)
  const [deleteModuleConfirmId, setDeleteModuleConfirmId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [generatingModules, setGeneratingModules] = useState(false)
  const [moduleGenError, setModuleGenError] = useState<string | null>(null)
  const [moduleGenSuccess, setModuleGenSuccess] = useState<string | null>(null)
  const [moduleGenConfirmOpen, setModuleGenConfirmOpen] = useState(false)

  // Runs tab
  const [runs, setRuns] = useState<Run[]>([])
  const [loadingRuns, setLoadingRuns] = useState(false)
  const [startingRun, setStartingRun] = useState(false)
  const [runStartError, setRunStartError] = useState<string | null>(null)

  // Load campaign
  useEffect(() => {
    if (!activeCompany) return
    fetch(`/api/campaigns/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data: Campaign | null) => {
        if (data) {
          setCampaign(data)
          setBasicForm({
            name: data.name,
            description: data.description ?? '',
            language: data.language,
            goal: data.goal ?? '',
            systemPrompt: data.systemPrompt,
            designId: data.designId ?? 'none',
            status: data.status,
          })
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))

    // Load designs for select
    fetch(`/api/designs?companyId=${activeCompany.id}`)
      .then((r) => r.json())
      .then((d) => setDesigns(Array.isArray(d) ? d : []))
      .catch(() => setDesigns([]))
  }, [id, activeCompany])

  // Load runs for Futtatások tab (on demand would be ideal; here we load once)
  const loadRuns = useCallback(async () => {
    if (!activeCompany) return
    setLoadingRuns(true)
    try {
      const res = await fetch(`/api/runs?companyId=${activeCompany.id}`)
      const data = await res.json()
      const campaignRuns = (Array.isArray(data) ? data : []).filter(
        (r: Run & { campaignId: string }) => r.campaignId === id
      )
      setRuns(campaignRuns)
    } catch {
      setRuns([])
    } finally {
      setLoadingRuns(false)
    }
  }, [id, activeCompany])

  // Load all contacts for the contacts tab
  const loadAllContacts = useCallback(async () => {
    setLoadingContacts(true)
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      setAllContacts(Array.isArray(data) ? data : [])
    } catch {
      setAllContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }, [])

  // ── Rendszerprompt generálás ────────────────────────────────────────────────

  async function generateSystemPrompt() {
    if (!basicForm.goal?.trim()) return
    setGeneratingPrompt(true)
    setPromptGenError(null)
    try {
      const res = await fetch('/api/campaigns/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignGoal: basicForm.goal,
          language: basicForm.language,
          campaignName: basicForm.name,
          campaignDescription: basicForm.description,
          ownCompanyId: activeCompany!.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPromptGenError(data.error || 'Generálás sikertelen')
      } else {
        setBasicForm((f) => ({ ...f, systemPrompt: data.systemPrompt }))
      }
    } catch {
      setPromptGenError('Hálózati hiba a generálás során')
    } finally {
      setGeneratingPrompt(false)
    }
  }

  // ── Modulok generálása AI-val ────────────────────────────────────────────────

  async function generateModules(replaceExisting: boolean) {
    if (!campaign) return
    setGeneratingModules(true)
    setModuleGenError(null)
    setModuleGenSuccess(null)
    setModuleGenConfirmOpen(false)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/generate-modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting }),
      })
      const data = await res.json()
      if (!res.ok) {
        setModuleGenError(data.error || 'Modulok generálása sikertelen')
      } else {
        // Frissítjük a kampány moduleDefinitions listáját
        setCampaign((prev) => {
          if (!prev) return prev
          const newModules = replaceExisting
            ? data.modules
            : [...prev.moduleDefinitions, ...data.modules].sort((a: ModuleDefinition, b: ModuleDefinition) => a.order - b.order)
          return { ...prev, moduleDefinitions: newModules }
        })
        setModuleGenSuccess(data.message)
        setTimeout(() => setModuleGenSuccess(null), 5000)
      }
    } catch {
      setModuleGenError('Hálózati hiba a generálás során')
    } finally {
      setGeneratingModules(false)
    }
  }

  function handleGenerateModulesClick() {
    if (!campaign) return
    if (campaign.moduleDefinitions.length > 0) {
      // Van már modul → megerősítő dialog
      setModuleGenConfirmOpen(true)
    } else {
      // Nincs modul → azonnal generál (replace=false, mindegy)
      generateModules(false)
    }
  }

  // ── Alapadatok ─────────────────────────────────────────────────────────────

  async function saveBasic(e: React.FormEvent) {
    e.preventDefault()
    setSavingBasic(true)
    setBasicError(null)
    try {
      const body = {
        name: basicForm.name,
        description: basicForm.description || null,
        language: basicForm.language,
        goal: basicForm.goal || null,
        systemPrompt: basicForm.systemPrompt,
        designId: basicForm.designId === 'none' ? null : basicForm.designId || null,
        status: basicForm.status,
      }
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved = await res.json()
      setCampaign((prev) => prev ? { ...prev, ...saved } : saved)
      setEditingBasic(false)
    } catch (err) {
      setBasicError(err instanceof Error ? err.message : 'Ismeretlen hiba')
    } finally {
      setSavingBasic(false)
    }
  }

  // ── Contacts ───────────────────────────────────────────────────────────────

  const campaignContactIds = new Set(campaign?.campaignContacts.map((cc) => cc.contactId) ?? [])

  async function addContact(contactId: string) {
    setAddingContactId(contactId)
    try {
      const res = await fetch(`/api/campaigns/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      })
      if (!res.ok) throw new Error()
      const newCc: CampaignContact = await res.json()
      setCampaign((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          campaignContacts: [...prev.campaignContacts, newCc],
        }
      })
    } finally {
      setAddingContactId(null)
    }
  }

  async function removeContact(campaignContactId: string, contactId: string) {
    setRemovingContactId(contactId)
    // Use the contacts DELETE endpoint which replaces the full list
    // Better: we'll just filter locally and call the replace endpoint
    const remaining = (campaign?.campaignContacts ?? [])
      .filter((cc) => cc.contactId !== contactId)
      .map((cc) => cc.contactId)

    try {
      const res = await fetch(`/api/campaigns/${id}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: remaining }),
      })
      if (!res.ok) throw new Error()
      const updated: CampaignContact[] = await res.json()
      setCampaign((prev) => {
        if (!prev) return prev
        return { ...prev, campaignContacts: updated }
      })
    } finally {
      setRemovingContactId(null)
    }
  }

  // ── Modules ────────────────────────────────────────────────────────────────

  function handleModuleSaved(saved: ModuleDefinition) {
    setCampaign((prev) => {
      if (!prev) return prev
      const exists = prev.moduleDefinitions.some((m) => m.id === saved.id)
      const moduleDefinitions = exists
        ? prev.moduleDefinitions.map((m) => (m.id === saved.id ? saved : m))
        : [...prev.moduleDefinitions, saved].sort((a, b) => a.order - b.order)
      return { ...prev, moduleDefinitions }
    })
  }

  async function deleteModule(moduleId: string) {
    setDeletingModuleId(moduleId)
    setDeleteModuleConfirmId(null)
    try {
      const res = await fetch(`/api/module-defs/${moduleId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCampaign((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          moduleDefinitions: prev.moduleDefinitions.filter((m) => m.id !== moduleId),
        }
      })
    } finally {
      setDeletingModuleId(null)
    }
  }

  async function moveModule(moduleId: string, direction: 'up' | 'down') {
    if (!campaign) return
    const sorted = [...campaign.moduleDefinitions].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((m) => m.id === moduleId)
    if (direction === 'up' && idx <= 0) return
    if (direction === 'down' && idx >= sorted.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const newOrder = sorted.map((m, i) => ({ id: m.id, order: i }))
    // Swap orders
    const tmp = newOrder[idx].order
    newOrder[idx].order = newOrder[swapIdx].order
    newOrder[swapIdx].order = tmp

    setReordering(true)
    try {
      await fetch('/api/module-defs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: newOrder }),
      })
      setCampaign((prev) => {
        if (!prev) return prev
        const updated = prev.moduleDefinitions.map((m) => {
          const entry = newOrder.find((e) => e.id === m.id)
          return entry ? { ...m, order: entry.order } : m
        })
        return { ...prev, moduleDefinitions: updated.sort((a, b) => a.order - b.order) }
      })
    } finally {
      setReordering(false)
    }
  }

  // ── Runs ───────────────────────────────────────────────────────────────────

  async function startRun() {
    setStartingRun(true)
    setRunStartError(null)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Futtatás indítása sikertelen')
      }
      const run = await res.json()
      router.push(`/runs/${run.id}`)
    } catch (err) {
      setRunStartError(err instanceof Error ? err.message : 'Ismeretlen hiba')
      setStartingRun(false)
    }
  }

  // ── Filtered contacts for selector ─────────────────────────────────────────

  const filteredAvailableContacts = allContacts.filter((c) => {
    if (campaignContactIds.has(c.id)) return false
    if (!contactSearch.trim()) return true
    const q = contactSearch.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.clientCompany.name.toLowerCase().includes(q)
    )
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">A kampány nem található.</p>
        <Button variant="outline" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>
      </div>
    )
  }

  const sortedModules = [...campaign.moduleDefinitions].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-4 text-muted-foreground"
          onClick={() => router.push('/campaigns')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Kampányok
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-700'
                }`}
              >
                {STATUS_LABELS[campaign.status] ?? campaign.status}
              </span>
            </div>
            {campaign.description && (
              <p className="text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="alapadatok">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="alapadatok">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Alapadatok
          </TabsTrigger>
          <TabsTrigger
            value="kontaktok"
            onClick={() => { if (allContacts.length === 0) loadAllContacts() }}
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Kontaktok
            {campaign.campaignContacts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {campaign.campaignContacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="modulok">
            <Layers className="mr-1.5 h-3.5 w-3.5" />
            Modulok
            {campaign.moduleDefinitions.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {campaign.moduleDefinitions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="futatasok"
            onClick={() => { if (runs.length === 0) loadRuns() }}
          >
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Futtatások
            {campaign._count.runs > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {campaign._count.runs}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── ALAPADATOK TAB ─────────────────────────────────────────────── */}
        <TabsContent value="alapadatok" className="mt-6 space-y-6">
          {!editingBasic ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Kampány adatai</CardTitle>
                  <CardDescription>Az ajánlatkészítési kampány fő beállításai.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setEditingBasic(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Szerkesztés
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground font-medium">Név</p>
                    <p className="mt-0.5">{campaign.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">Állapot</p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-0.5 ${
                        STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {STATUS_LABELS[campaign.status] ?? campaign.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">Nyelv</p>
                    <p className="mt-0.5">{LANGUAGE_LABELS[campaign.language] ?? campaign.language}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground font-medium">Design</p>
                    <p className="mt-0.5">{campaign.design?.name ?? 'Alapértelmezett'}</p>
                  </div>
                  {campaign.description && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground font-medium">Leírás</p>
                      <p className="mt-0.5">{campaign.description}</p>
                    </div>
                  )}
                  {campaign.goal && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground font-medium">Kampánycél</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{campaign.goal}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground font-medium mb-2">Rendszerprompt</p>
                  <pre className="text-sm bg-muted rounded-lg p-4 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                    {campaign.systemPrompt}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Kampány szerkesztése</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={saveBasic} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="b-name">Kampánynév *</Label>
                      <Input
                        id="b-name"
                        value={basicForm.name}
                        onChange={(e) => setBasicForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="b-desc">Leírás</Label>
                      <Textarea
                        id="b-desc"
                        value={basicForm.description}
                        onChange={(e) => setBasicForm((f) => ({ ...f, description: e.target.value }))}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Állapot</Label>
                      <Select
                        value={basicForm.status}
                        onValueChange={(v) => setBasicForm((f) => ({ ...f, status: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Vázlat</SelectItem>
                          <SelectItem value="active">Aktív</SelectItem>
                          <SelectItem value="archived">Archivált</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nyelv</Label>
                      <Select
                        value={basicForm.language}
                        onValueChange={(v) => setBasicForm((f) => ({ ...f, language: v }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hu">Magyar</SelectItem>
                          <SelectItem value="en">Angol</SelectItem>
                          <SelectItem value="de">Német</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Design sablon</Label>
                      <Select
                        value={basicForm.designId}
                        onValueChange={(v) => setBasicForm((f) => ({ ...f, designId: v }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Alapértelmezett" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Alapértelmezett</SelectItem>
                          {designs.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="b-goal">Kampánycél</Label>
                      <Textarea
                        id="b-goal"
                        value={basicForm.goal}
                        onChange={(e) => setBasicForm((f) => ({ ...f, goal: e.target.value }))}
                        rows={3}
                        placeholder="Mi a kampány célja?"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="b-prompt">Rendszerprompt *</Label>
                        <button
                          type="button"
                          onClick={generateSystemPrompt}
                          disabled={generatingPrompt || !basicForm.goal.trim()}
                          className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {generatingPrompt ? (
                            <>
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Generálás...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3" />
                              Generálás AI-val
                            </>
                          )}
                        </button>
                      </div>
                      {promptGenError && (
                        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {promptGenError}
                        </div>
                      )}
                      <Textarea
                        id="b-prompt"
                        value={basicForm.systemPrompt}
                        onChange={(e) => setBasicForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                        rows={10}
                        className="font-mono text-sm"
                        required
                      />
                    </div>
                  </div>
                  {basicError && <p className="text-sm text-destructive">{basicError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setEditingBasic(false); setBasicError(null) }}
                      disabled={savingBasic}
                    >
                      Mégse
                    </Button>
                    <Button type="submit" disabled={savingBasic || !basicForm.name.trim()}>
                      {savingBasic && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Mentés
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── KONTAKTOK TAB ──────────────────────────────────────────────── */}
        <TabsContent value="kontaktok" className="mt-6 space-y-6">
          {/* Current contacts */}
          <div className="space-y-3">
            <h3 className="font-medium">
              Hozzárendelt kontaktok
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({campaign.campaignContacts.length})
              </span>
            </h3>
            {campaign.campaignContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 border border-dashed rounded-lg">
                <Users className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground text-center">
                  Még nincsenek hozzárendelt kontaktok. Adj hozzá alább.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kontakt neve</TableHead>
                      <TableHead>Pozíció</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cég</TableHead>
                      <TableHead className="w-16 text-right">Eltávolít</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.campaignContacts.map((cc) => (
                      <TableRow key={cc.id}>
                        <TableCell className="font-medium">{cc.contact.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {cc.contact.position ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{cc.contact.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {cc.contact.clientCompany.brandName ?? cc.contact.clientCompany.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeContact(cc.id, cc.contactId)}
                            disabled={removingContactId === cc.contactId}
                          >
                            {removingContactId === cc.contactId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Separator />

          {/* Available contacts to add */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-medium">Kontakt hozzáadása</h3>
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder="Keresés név, email, cég alapján..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            {loadingContacts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allContacts.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <p className="text-sm text-muted-foreground">
                  Nincsenek elérhető kontaktok. Először add hozzá az ügyfeleket.
                </p>
                <Button variant="outline" size="sm" onClick={() => router.push('/clients')}>
                  Ügyfélcégekhez
                </Button>
              </div>
            ) : filteredAvailableContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {contactSearch
                  ? 'Nincs találat a keresésre.'
                  : 'Minden kontakt már hozzá van rendelve.'}
              </p>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kontakt neve</TableHead>
                      <TableHead>Pozíció</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Cég</TableHead>
                      <TableHead className="w-20 text-right">Hozzáad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAvailableContacts.slice(0, 50).map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {contact.position ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm">{contact.email}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.clientCompany.brandName ?? contact.clientCompany.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary"
                            onClick={() => addContact(contact.id)}
                            disabled={addingContactId === contact.id}
                          >
                            {addingContactId === contact.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredAvailableContacts.length > 50 && (
                  <div className="py-2 text-center text-xs text-muted-foreground border-t bg-muted/30">
                    + {filteredAvailableContacts.length - 50} további kontakt — szűkítsd a keresést
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── MODULOK TAB ────────────────────────────────────────────────── */}
        <TabsContent value="modulok" className="mt-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium">
                Modul definíciók
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({campaign.moduleDefinitions.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                A modulok határozzák meg az ajánlat szerkezetét és az AI által generált tartalmakat.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGenerateModulesClick}
                disabled={generatingModules || !campaign.systemPrompt?.trim()}
                title={!campaign.systemPrompt?.trim() ? 'Először mentsd el a rendszerprompot' : ''}
                className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingModules ? (
                  <>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generálás... (~30s)
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3" />
                    AI modulok generálása
                  </>
                )}
              </button>
              <Button onClick={() => { setEditingModule(null); setModuleFormOpen(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Új modul
              </Button>
            </div>
          </div>

          {/* Generálás visszajelzések */}
          {moduleGenError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {moduleGenError}
            </div>
          )}
          {moduleGenSuccess && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
              <Check className="h-4 w-4 shrink-0" />
              {moduleGenSuccess}
            </div>
          )}

          {/* Megerősítő dialog (ha már vannak modulok) */}
          <Dialog open={moduleGenConfirmOpen} onOpenChange={setModuleGenConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Modulok generálása</DialogTitle>
                <DialogDescription>
                  Már van {campaign.moduleDefinitions.length} meglévő modul. Mit szeretnél tenni?
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-2">
                <button
                  onClick={() => generateModules(true)}
                  className="flex flex-col items-start gap-1 rounded-lg border-2 border-destructive/40 bg-destructive/5 p-4 text-left hover:bg-destructive/10 transition-colors"
                >
                  <span className="font-medium text-sm">🔄 Felülírás – töröld a meglévőket</span>
                  <span className="text-xs text-muted-foreground">Az összes jelenlegi modul törlődik, és az AI teljesen új struktúrát hoz létre.</span>
                </button>
                <button
                  onClick={() => generateModules(false)}
                  className="flex flex-col items-start gap-1 rounded-lg border-2 border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
                >
                  <span className="font-medium text-sm">➕ Hozzáfűzés – tartsd meg a meglévőket</span>
                  <span className="text-xs text-muted-foreground">A meglévő modulok megmaradnak, az AI új modulokat ad hozzájuk a lista végére.</span>
                </button>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" size="sm">Mégse</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {sortedModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed rounded-lg">
              <Layers className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Még nincsenek modulok</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generálj modulokat AI-val, vagy adj hozzá egyet manuálisan.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateModulesClick}
                  disabled={generatingModules || !campaign.systemPrompt?.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  AI modulok generálása
                </button>
                <Button variant="outline" onClick={() => { setEditingModule(null); setModuleFormOpen(true) }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Manuális modul
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedModules.map((mod, idx) => (
                <Card key={mod.id} className="group">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                        <button
                          onClick={() => moveModule(mod.id, 'up')}
                          disabled={idx === 0 || reordering}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <span className="text-xs text-muted-foreground font-mono w-5 text-center">
                          {idx + 1}
                        </span>
                        <button
                          onClick={() => moveModule(mod.id, 'down')}
                          disabled={idx === sortedModules.length - 1 || reordering}
                          className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{mod.name}</span>
                            <Badge variant={mod.type === 'fixed' ? 'secondary' : 'outline'} className="text-xs font-normal">
                              {mod.type === 'fixed' ? 'Fix' : 'AI generált'}
                            </Badge>
                            {!mod.isRequired && (
                              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                                Opcionális
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setEditingModule(mod); setModuleFormOpen(true) }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteModuleConfirmId(mod.id)}
                              disabled={deletingModuleId === mod.id}
                            >
                              {deletingModuleId === mod.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {mod.goal && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{mod.goal}</p>
                        )}
                        {mod.prompt && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-mono bg-muted rounded px-2 py-0.5">
                            {mod.prompt.substring(0, 120)}{mod.prompt.length > 120 ? '...' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── FUTTATÁSOK TAB ─────────────────────────────────────────────── */}
        <TabsContent value="futatasok" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Futtatások</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Minden futtatás az összes hozzárendelt kontaktnak generál ajánlatot.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {runStartError && (
                <p className="text-sm text-destructive">{runStartError}</p>
              )}
              <Button
                onClick={startRun}
                disabled={startingRun || campaign.campaignContacts.length === 0}
              >
                {startingRun ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Új futtatás indítása
              </Button>
            </div>
          </div>

          {campaign.campaignContacts.length === 0 && (
            <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
              Futtatás indításához legalább egy kontaktet hozzá kell rendelni a kampányhoz.
            </div>
          )}

          {loadingRuns ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed rounded-lg">
              <Play className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Még nincs futtatás</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Indíts új futtatást az ajánlatok generálásához.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Futtatás ID</TableHead>
                    <TableHead>Állapot</TableHead>
                    <TableHead className="text-center">Ügyfél/Kontakt</TableHead>
                    <TableHead>Elindítva</TableHead>
                    <TableHead>Befejezve</TableHead>
                    <TableHead className="w-24 text-right">Megnyit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow
                      key={run.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/runs/${run.id}`)}
                    >
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {run.id.substring(0, 8)}…
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[run.status] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {STATUS_LABELS[run.status] ?? run.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {run._count.runItems}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {run.startedAt ? formatDateTime(run.startedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {run.completedAt ? formatDateTime(run.completedAt) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/runs/${run.id}`)
                          }}
                        >
                          Megnyit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Module Form Dialog */}
      <ModuleForm
        campaignId={campaign.id}
        module={editingModule}
        open={moduleFormOpen}
        onOpenChange={setModuleFormOpen}
        onSaved={handleModuleSaved}
        nextOrder={sortedModules.length}
      />

      {/* Delete Module Confirmation */}
      <Dialog
        open={deleteModuleConfirmId !== null}
        onOpenChange={(o) => { if (!o) setDeleteModuleConfirmId(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modul törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt a modult? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModuleConfirmId(null)}>Mégse</Button>
            <Button
              variant="destructive"
              onClick={() => deleteModuleConfirmId && deleteModule(deleteModuleConfirmId)}
            >
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
