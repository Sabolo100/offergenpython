'use client'

import { useState, useEffect } from 'react'
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
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Globe,
  BookOpen,
  Loader2,
  ExternalLink,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'

// ── Types ────────────────────────────────────────────────────────────────────

interface KnowledgeItem {
  id: string
  ownCompanyId: string
  type: string
  title: string
  content: string
  fileUrl?: string | null
  createdAt: string
  updatedAt: string
}

interface OwnCompany {
  id: string
  name: string
  description?: string | null
  website?: string | null
  createdAt: string
  updatedAt: string
  knowledgeItems: KnowledgeItem[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const KNOWLEDGE_TYPES: { value: string; label: string }[] = [
  { value: 'service', label: 'Szolgáltatás' },
  { value: 'reference', label: 'Referencia' },
  { value: 'case-study', label: 'Esettanulmány' },
  { value: 'team', label: 'Csapat' },
  { value: 'closing', label: 'Záróanyag' },
  { value: 'other', label: 'Egyéb' },
]

function getTypeLabel(type: string): string {
  return KNOWLEDGE_TYPES.find((t) => t.value === type)?.label ?? type
}

function getTypeBadgeVariant(
  type: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    service: 'default',
    reference: 'secondary',
    'case-study': 'outline',
    team: 'secondary',
    closing: 'outline',
    other: 'outline',
  }
  return map[type] ?? 'outline'
}

// ── CompanyForm Dialog ────────────────────────────────────────────────────────

interface CompanyFormProps {
  company: OwnCompany | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (company: OwnCompany) => void
}

function CompanyForm({ company, open, onOpenChange, onSaved }: CompanyFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(company?.name ?? '')
      setDescription(company?.description ?? '')
      setWebsite(company?.website ?? '')
      setError(null)
    }
  }, [open, company])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = { name, description: description || null, website: website || null }
      let res: Response
      if (company) {
        res = await fetch(`/api/own-company/${company.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/own-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved: OwnCompany = await res.json()
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{company ? 'Cég szerkesztése' : 'Új saját cég'}</DialogTitle>
          <DialogDescription>
            A saját vállalkozásod adatait és tudásbázisát itt kezelheted.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Cégnév *</Label>
            <Input
              id="company-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="pl. Acme Kft."
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-desc">Leírás</Label>
            <Textarea
              id="company-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rövid bemutatkozó szöveg..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-web">Weboldal</Label>
            <Input
              id="company-web"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              type="url"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Mégse
              </Button>
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

// ── KnowledgeItemForm Dialog ──────────────────────────────────────────────────

interface KnowledgeItemFormProps {
  companyId: string
  item: KnowledgeItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (item: KnowledgeItem) => void
}

function KnowledgeItemForm({
  companyId,
  item,
  open,
  onOpenChange,
  onSaved,
}: KnowledgeItemFormProps) {
  const [type, setType] = useState('service')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setType(item?.type ?? 'service')
      setTitle(item?.title ?? '')
      setContent(item?.content ?? '')
      setFileUrl(item?.fileUrl ?? '')
      setError(null)
    }
  }, [open, item])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        type,
        title,
        content,
        fileUrl: fileUrl || null,
        ...(item ? {} : { ownCompanyId: companyId }),
      }
      let res: Response
      if (item) {
        res = await fetch(`/api/knowledge/${item.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved: KnowledgeItem = await res.json()
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Tudásbázis elem szerkesztése' : 'Új tudásbázis elem'}
          </DialogTitle>
          <DialogDescription>
            Adj hozzá tartalmat, amelyet az AI felhasznál az ajánlatok generálásakor.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Típus *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="Válassz típust" />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ki-title">Cím *</Label>
            <Input
              id="ki-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="pl. Fő szolgáltatásunk röviden"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ki-content">Tartalom *</Label>
            <Textarea
              id="ki-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Az AI ezt a szöveget használja fel az ajánlatban..."
              rows={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ki-file">Fájl URL (opcionális)</Label>
            <Input
              id="ki-file"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                Mégse
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !title.trim() || !content.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── FileUploadDialog ──────────────────────────────────────────────────────────

interface FileUploadDialogProps {
  companyId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: (item: KnowledgeItem) => void
}

function FileUploadDialog({ companyId, open, onOpenChange, onUploaded }: FileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState('other')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setType('other')
      setTitle('')
      setResult(null)
    }
  }, [open])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !title) {
      // Auto-kitöltés a fájlnévből
      const base = f.name.replace(/\.[^.]+$/, '')
      setTitle(base)
    }
    setResult(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('ownCompanyId', companyId)
      formData.append('type', type)
      formData.append('title', title || file.name.replace(/\.[^.]+$/, ''))

      const res = await fetch('/api/knowledge/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ success: false, message: data.error || 'Feltöltés sikertelen' })
      } else {
        setResult({ success: true, message: data.message })
        onUploaded(data.knowledgeItem)
        setTimeout(() => onOpenChange(false), 1500)
      }
    } catch {
      setResult({ success: false, message: 'Hálózati hiba' })
    } finally {
      setUploading(false)
    }
  }

  const fileSizeMB = file ? (file.size / 1024 / 1024).toFixed(1) : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Fájl feltöltése a tudásbázisba
          </DialogTitle>
          <DialogDescription>
            Támogatott formátumok: <strong>PDF, Word (.docx), PowerPoint (.pptx), TXT</strong>
            <br />Max. 20 MB. A rendszer automatikusan kinyeri a szöveget.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File picker */}
          <div className="space-y-2">
            <Label>Fájl kiválasztása *</Label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex flex-col items-center gap-2">
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{fileSizeMB} MB</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Kattints a fájl kiválasztásához</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, TXT</p>
                  </>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx,.doc,.ppt,.txt"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* Típus */}
          <div className="space-y-2">
            <Label>Típus *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cím */}
          <div className="space-y-2">
            <Label htmlFor="upload-title">Cím</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Automatikus a fájlnévből"
            />
          </div>

          {/* Eredmény */}
          {result && (
            <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
              result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {result.success
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
              {result.message}
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={uploading}>Mégse</Button>
            </DialogClose>
            <Button type="submit" disabled={!file || uploading}>
              {uploading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Feldolgozás...</>
                : <><Upload className="mr-2 h-4 w-4" />Feltöltés és feldolgozás</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const { activeCompany, refetchCompanies, setActiveCompany } = useOwnCompany()
  const [company, setCompany] = useState<OwnCompany | null>(null)
  const [loading, setLoading] = useState(true)
  const [companyFormOpen, setCompanyFormOpen] = useState(false)
  const [kiFormOpen, setKiFormOpen] = useState(false)
  const [editingKi, setEditingKi] = useState<KnowledgeItem | null>(null)
  const [deletingKiId, setDeletingKiId] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    if (!activeCompany) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/own-company/${activeCompany.id}`)
      .then((r) => r.json())
      .then((data) => setCompany(data ?? null))
      .catch(() => setCompany(null))
      .finally(() => setLoading(false))
  }, [activeCompany])

  async function handleCompanySaved(saved: OwnCompany) {
    // If this was a new company creation, update the context
    if (!company) {
      await refetchCompanies()
      setActiveCompany({ id: saved.id, name: saved.name, description: saved.description, website: saved.website })
    }
    setCompany((prev) => ({
      ...saved,
      knowledgeItems: saved.knowledgeItems ?? prev?.knowledgeItems ?? [],
    }))
  }

  function handleKiSaved(saved: KnowledgeItem) {
    setCompany((prev) => {
      if (!prev) return prev
      const exists = prev.knowledgeItems.some((ki) => ki.id === saved.id)
      const knowledgeItems = exists
        ? prev.knowledgeItems.map((ki) => (ki.id === saved.id ? saved : ki))
        : [saved, ...prev.knowledgeItems]
      return { ...prev, knowledgeItems }
    })
  }

  async function handleDeleteKi(id: string) {
    setDeletingKiId(id)
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCompany((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          knowledgeItems: prev.knowledgeItems.filter((ki) => ki.id !== id),
        }
      })
    } finally {
      setDeletingKiId(null)
    }
  }

  function openEditKi(item: KnowledgeItem) {
    setEditingKi(item)
    setKiFormOpen(true)
  }

  function openAddKi() {
    setEditingKi(null)
    setKiFormOpen(true)
  }

  // Group knowledge items by type
  const grouped = KNOWLEDGE_TYPES.map((t) => ({
    ...t,
    items: (company?.knowledgeItems ?? []).filter((ki) => ki.type === t.value),
  })).filter((g) => g.items.length > 0)

  const uncategorised = (company?.knowledgeItems ?? []).filter(
    (ki) => !KNOWLEDGE_TYPES.some((t) => t.value === ki.type)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saját cég</h1>
          <p className="text-muted-foreground mt-1">
            Céginformáció és AI tudásbázis kezelése
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCompanyFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Cég szerkesztése
          </Button>
          {company && (
            <>
              <Button variant="outline" onClick={() => setUploadOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Fájl feltöltése
              </Button>
              <Button onClick={openAddKi}>
                <Plus className="mr-2 h-4 w-4" />
                Szöveges elem
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Company Info Card */}
      {company ? (
        <Card>
          <CardHeader className="flex flex-row items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl">{company.name}</CardTitle>
              {company.description && (
                <CardDescription className="mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                  {company.description}
                </CardDescription>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  {company.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Még nincs céged rögzítve</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add hozzá a céged adatait az ajánlatkészítés megkezdéséhez.
              </p>
            </div>
            <Button onClick={() => setCompanyFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cég létrehozása
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Knowledge Base */}
      {company && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Tudásbázis</h2>
            <Badge variant="secondary" className="ml-1">
              {company.knowledgeItems.length} elem
            </Badge>
          </div>

          {company.knowledgeItems.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="font-medium">Üres a tudásbázis</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Adj hozzá szolgáltatásokat, referenciákat, esetpéldákat és egyéb tartalmakat,
                    amelyeket az AI felhasznál az ajánlatok generálásakor.
                  </p>
                </div>
                <Button variant="outline" onClick={openAddKi}>
                  <Plus className="mr-2 h-4 w-4" />
                  Első elem hozzáadása
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.value} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {group.label}
                    </h3>
                    <Separator className="flex-1" />
                    <span className="text-xs text-muted-foreground">{group.items.length}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.items.map((ki) => (
                      <Card key={ki.id} className="group relative hover:shadow-sm transition-shadow">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant={getTypeBadgeVariant(ki.type)} className="text-xs shrink-0">
                              {getTypeLabel(ki.type)}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditKi(ki)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteKi(ki.id)}
                                disabled={deletingKiId === ki.id}
                              >
                                {deletingKiId === ki.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <CardTitle className="text-sm font-semibold mt-1 leading-snug">
                            {ki.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {ki.content}
                          </p>
                          {ki.fileUrl && (
                            <a
                              href={ki.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Fájl megtekintése
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {uncategorised.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Egyéb
                    </h3>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {uncategorised.map((ki) => (
                      <Card key={ki.id} className="group relative hover:shadow-sm transition-shadow">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="outline" className="text-xs shrink-0">
                              {ki.type}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditKi(ki)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteKi(ki.id)}
                                disabled={deletingKiId === ki.id}
                              >
                                {deletingKiId === ki.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </div>
                          </div>
                          <CardTitle className="text-sm font-semibold mt-1 leading-snug">
                            {ki.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                            {ki.content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <CompanyForm
        company={company}
        open={companyFormOpen}
        onOpenChange={setCompanyFormOpen}
        onSaved={handleCompanySaved}
      />
      {company && (
        <KnowledgeItemForm
          companyId={company.id}
          item={editingKi}
          open={kiFormOpen}
          onOpenChange={setKiFormOpen}
          onSaved={handleKiSaved}
        />
      )}
      {company && (
        <FileUploadDialog
          companyId={company.id}
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={handleKiSaved}
        />
      )}
    </div>
  )
}
