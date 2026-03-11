'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Download, Mail, FileText, Presentation, BarChart2, ChevronDown, ChevronRight } from 'lucide-react'
import { STATUS_LABELS, STATUS_COLORS, formatDateTime } from '@/lib/utils'

interface ModuleDefinition {
  id: string
  name: string
  type: string
  order: number
}

interface ModuleInstance {
  id: string
  moduleDefinitionId: string
  moduleDefinition: ModuleDefinition
  content: { text?: string; [key: string]: unknown }
  status: string
  version: number
}

interface CoreOffer {
  id: string
  content: string
  version: number
  updatedAt: string
}

interface EmailDraft {
  id: string
  subject: string
  body: string
  gmailDraftId: string | null
  status: string
  createdAt: string
}

interface Export {
  id: string
  type: string
  fileUrl: string | null
  version: number
  createdAt: string
}

interface RunItem {
  id: string
  status: string
  currentStep: string | null
  run: {
    id: string
    campaign: { name: string }
  }
  clientCompany: { name: string; website: string | null; industry: string | null }
  contact: { name: string; email: string; position: string | null } | null
  coreOffer: CoreOffer | null
  moduleInstances: ModuleInstance[]
  emailDrafts: EmailDraft[]
  exports: Export[]
}

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  )
}

function ModuleInstanceEditor({
  instance,
  onSave,
}: {
  instance: ModuleInstance
  onSave: (id: string, content: ModuleInstance['content']) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState(instance.content.text ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(instance.id, { ...instance.content, text })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-medium text-sm">{instance.moduleDefinition.name}</span>
          <Badge variant={instance.moduleDefinition.type === 'fixed' ? 'secondary' : 'default'} className="capitalize text-xs">
            {instance.moduleDefinition.type === 'fixed' ? 'Rögzített' : 'Változó'}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">v{instance.version}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
            placeholder="Modul tartalma..."
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EditorDetailPage() {
  const { runItemId } = useParams<{ runItemId: string }>()
  const router = useRouter()

  const [runItem, setRunItem] = useState<RunItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Core offer state
  const [coreOfferContent, setCoreOfferContent] = useState('')
  const [savingCoreOffer, setSavingCoreOffer] = useState(false)
  const [coreOfferSaved, setCoreOfferSaved] = useState(false)

  // Email state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailSaved, setEmailSaved] = useState(false)

  // Export state
  const [exportLoading, setExportLoading] = useState(false)
  const [exportResult, setExportResult] = useState<{ url?: string; error?: string } | null>(null)
  const [pptLoading, setPptLoading] = useState(false)
  const [pptResult, setPptResult] = useState<{ url?: string; error?: string } | null>(null)
  const [researchPptLoading, setResearchPptLoading] = useState(false)
  const [researchPptResult, setResearchPptResult] = useState<{ url?: string; error?: string } | null>(null)
  const [gmailLoading, setGmailLoading] = useState(false)
  const [gmailResult, setGmailResult] = useState<{ success?: boolean; error?: string } | null>(null)

  async function fetchRunItem() {
    setLoading(true)
    try {
      const res = await fetch(`/api/run-items/${runItemId}`)
      if (!res.ok) throw new Error('Not found')
      const data: RunItem = await res.json()
      setRunItem(data)
      setCoreOfferContent(data.coreOffer?.content ?? '')
      if (data.emailDrafts.length > 0) {
        setEmailSubject(data.emailDrafts[0].subject)
        setEmailBody(data.emailDrafts[0].body)
      }
    } catch {
      setError('Nem sikerült betölteni az ajánlatot.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRunItem()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runItemId])

  async function saveCoreOffer() {
    setSavingCoreOffer(true)
    setCoreOfferSaved(false)
    try {
      await fetch(`/api/run-items/${runItemId}/core-offer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: coreOfferContent }),
      })
      setCoreOfferSaved(true)
      setTimeout(() => setCoreOfferSaved(false), 2000)
    } catch {
      setError('Core offer mentése sikertelen.')
    } finally {
      setSavingCoreOffer(false)
    }
  }

  async function saveEmailDraft() {
    if (!runItem?.emailDrafts[0]) return
    setSavingEmail(true)
    setEmailSaved(false)
    try {
      await fetch(`/api/email-drafts/${runItem.emailDrafts[0].id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      })
      setEmailSaved(true)
      setTimeout(() => setEmailSaved(false), 2000)
    } catch {
      setError('Email mentése sikertelen.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function saveModuleInstance(instanceId: string, content: ModuleInstance['content']) {
    await fetch(`/api/module-instances/${instanceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    fetchRunItem()
  }

  async function generatePdf() {
    setExportLoading(true)
    setExportResult(null)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runItemId, type: 'pdf' }),
      })
      const data = await res.json()
      if (res.ok) {
        setExportResult({ url: data.fileUrl })
        fetchRunItem()
      } else {
        setExportResult({ error: data.error ?? 'Export sikertelen.' })
      }
    } catch {
      setExportResult({ error: 'Export sikertelen.' })
    } finally {
      setExportLoading(false)
    }
  }

  async function generatePpt() {
    setPptLoading(true)
    setPptResult(null)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runItemId, type: 'ppt' }),
      })
      const data = await res.json()
      if (res.ok) {
        setPptResult({ url: data.fileUrl })
        fetchRunItem()
      } else {
        setPptResult({ error: data.error ?? 'PPT generálás sikertelen.' })
      }
    } catch {
      setPptResult({ error: 'PPT generálás sikertelen.' })
    } finally {
      setPptLoading(false)
    }
  }

  async function generateResearchPpt() {
    setResearchPptLoading(true)
    setResearchPptResult(null)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runItemId, type: 'research-ppt' }),
      })
      const data = await res.json()
      if (res.ok) {
        setResearchPptResult({ url: data.fileUrl })
        fetchRunItem()
      } else {
        setResearchPptResult({ error: data.error ?? 'Kutatási jelentés generálás sikertelen.' })
      }
    } catch {
      setResearchPptResult({ error: 'Kutatási jelentés generálás sikertelen.' })
    } finally {
      setResearchPptLoading(false)
    }
  }

  async function createGmailDraft() {
    setGmailLoading(true)
    setGmailResult(null)
    try {
      const res = await fetch('/api/gmail/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runItemId }),
      })
      const data = await res.json()
      if (res.ok) {
        setGmailResult({ success: true })
        fetchRunItem()
      } else {
        setGmailResult({ error: data.error ?? 'Gmail draft létrehozása sikertelen.' })
      }
    } catch {
      setGmailResult({ error: 'Gmail draft létrehozása sikertelen.' })
    } finally {
      setGmailLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
        Betöltés...
      </div>
    )
  }

  if (!runItem) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Vissza
        </Button>
        <p className="text-destructive">{error ?? 'Ajánlat nem található.'}</p>
      </div>
    )
  }

  const sortedModules = [...runItem.moduleInstances].sort(
    (a, b) => a.moduleDefinition.order - b.moduleDefinition.order
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 mt-0.5 shrink-0"
          onClick={() => router.push('/editor')}
          aria-label="Vissza"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{runItem.clientCompany.name}</h1>
            <StatusBadge status={runItem.status} />
          </div>
          <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
            <span>Kampány: <span className="font-medium text-foreground">{runItem.run.campaign.name}</span></span>
            {runItem.contact && (
              <span>Kontakt: <span className="font-medium text-foreground">{runItem.contact.name}</span> · {runItem.contact.email}</span>
            )}
            {runItem.clientCompany.industry && (
              <span>Iparág: {runItem.clientCompany.industry}</span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="core-offer">
        <TabsList className="mb-4">
          <TabsTrigger value="core-offer">Core Offer</TabsTrigger>
          <TabsTrigger value="modules">Modulok</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Core Offer Tab */}
        <TabsContent value="core-offer" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Alap ajánlat szövege</CardTitle>
                {runItem.coreOffer && (
                  <span className="text-xs text-muted-foreground">
                    v{runItem.coreOffer.version} · Frissítve: {formatDateTime(runItem.coreOffer.updatedAt)}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!runItem.coreOffer && (
                <p className="text-sm text-muted-foreground italic">
                  Még nincs core offer generálva ehhez az elemhez.
                </p>
              )}
              <Textarea
                value={coreOfferContent}
                onChange={(e) => setCoreOfferContent(e.target.value)}
                rows={18}
                className="font-mono text-sm resize-y"
                placeholder="Az ajánlat szövege itt jelenik meg..."
              />
              <div className="flex items-center justify-end gap-3">
                {coreOfferSaved && (
                  <span className="text-xs text-green-600">Mentve!</span>
                )}
                <Button onClick={saveCoreOffer} disabled={savingCoreOffer} className="gap-1.5">
                  <Save className="h-4 w-4" />
                  {savingCoreOffer ? 'Mentés...' : 'Mentés'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Modules Tab */}
        <TabsContent value="modules" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Modul példányok</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sortedModules.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Még nincsenek modul példányok.
                </p>
              ) : (
                sortedModules.map((instance) => (
                  <ModuleInstanceEditor
                    key={instance.id}
                    instance={instance}
                    onSave={saveModuleInstance}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Email vázlat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {runItem.emailDrafts.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Még nincs email vázlat generálva.
                </p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-subject">Tárgy</Label>
                    <Input
                      id="email-subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Email tárgy..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-body">Szöveg</Label>
                    <Textarea
                      id="email-body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      rows={16}
                      className="font-mono text-sm resize-y"
                      placeholder="Email szövege..."
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3">
                    {emailSaved && (
                      <span className="text-xs text-green-600">Mentve!</span>
                    )}
                    <Button
                      onClick={saveEmailDraft}
                      disabled={savingEmail}
                      className="gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      {savingEmail ? 'Mentés...' : 'Mentés'}
                    </Button>
                  </div>
                  {runItem.emailDrafts[0].gmailDraftId && (
                    <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
                      <Mail className="h-4 w-4 shrink-0" />
                      Gmail draft ID: <code className="font-mono text-xs">{runItem.emailDrafts[0].gmailDraftId}</code>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export és küldés</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Actions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Műveletek</h3>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={generatePdf}
                    disabled={exportLoading}
                    variant="outline"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {exportLoading ? 'Generálás...' : 'PDF generálása'}
                  </Button>
                  <Button
                    onClick={generatePpt}
                    disabled={pptLoading}
                    variant="outline"
                    className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400"
                  >
                    <Presentation className="h-4 w-4" />
                    {pptLoading ? 'Generálás... (1-2 perc)' : 'PPT generálása'}
                  </Button>
                  <Button
                    onClick={generateResearchPpt}
                    disabled={researchPptLoading}
                    variant="outline"
                    className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                  >
                    <BarChart2 className="h-4 w-4" />
                    {researchPptLoading ? 'Generálás... (1-2 perc)' : 'Kutatási Jelentés PPT'}
                  </Button>
                  <Button
                    onClick={createGmailDraft}
                    disabled={gmailLoading}
                    variant="outline"
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {gmailLoading ? 'Létrehozás...' : 'Gmail Draft létrehozása'}
                  </Button>
                </div>

                {pptLoading && (
                  <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
                    <Presentation className="h-4 w-4 shrink-0 animate-pulse" />
                    PPT generálás folyamatban – diákhoz képek generálása AI-val... Ez 1-2 percet vehet igénybe.
                  </div>
                )}

                {exportResult && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      exportResult.url
                        ? 'bg-green-50 text-green-700'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {exportResult.url ? (
                      <div className="flex items-center gap-2">
                        <span>PDF kész!</span>
                        <a
                          href={exportResult.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline font-medium"
                        >
                          Letöltés
                        </a>
                      </div>
                    ) : (
                      exportResult.error
                    )}
                  </div>
                )}

                {pptResult && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      pptResult.url
                        ? 'bg-green-50 text-green-700'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {pptResult.url ? (
                      <div className="flex items-center gap-2">
                        <Presentation className="h-4 w-4 shrink-0" />
                        <span>PPT kész!</span>
                        <a
                          href={pptResult.url}
                          download
                          className="underline font-medium"
                        >
                          Letöltés (.pptx)
                        </a>
                      </div>
                    ) : (
                      pptResult.error
                    )}
                  </div>
                )}

                {researchPptLoading && (
                  <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 shrink-0 animate-pulse" />
                    Kutatási jelentés generálás folyamatban – minden kutatási témához infografika készül AI-val... Ez 1-2 percet vehet igénybe.
                  </div>
                )}

                {researchPptResult && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      researchPptResult.url
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {researchPptResult.url ? (
                      <div className="flex items-center gap-2">
                        <BarChart2 className="h-4 w-4 shrink-0" />
                        <span>Kutatási Jelentés kész!</span>
                        <a
                          href={researchPptResult.url}
                          download
                          className="underline font-medium"
                        >
                          Letöltés (.pptx)
                        </a>
                      </div>
                    ) : (
                      researchPptResult.error
                    )}
                  </div>
                )}

                {gmailResult && (
                  <div
                    className={`rounded-md px-3 py-2 text-sm ${
                      gmailResult.success
                        ? 'bg-green-50 text-green-700'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {gmailResult.success ? 'Gmail draft sikeresen létrehozva!' : gmailResult.error}
                  </div>
                )}
              </div>

              <Separator />

              {/* Existing Exports */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Meglévő exportok</h3>
                {runItem.exports.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Még nincs export generálva.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {runItem.exports.map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-md border px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          {exp.type === 'ppt' ? (
                            <Presentation className="h-4 w-4 text-blue-500" />
                          ) : exp.type === 'research-ppt' ? (
                            <BarChart2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium uppercase">
                            {exp.type === 'research-ppt' ? 'Kutatási PPT' : exp.type}
                          </span>
                          <span className="text-xs text-muted-foreground">v{exp.version}</span>
                          <span className="text-xs text-muted-foreground">
                            · {formatDateTime(exp.createdAt)}
                          </span>
                        </div>
                        {exp.fileUrl ? (
                          <a
                            href={exp.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Letöltés
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Nincs fájl</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
