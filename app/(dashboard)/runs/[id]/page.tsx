'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  ArrowLeft,
  Play,
  ExternalLink,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Circle,
} from 'lucide-react'
import { formatDateTime, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

/* ═══════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════ */

type SubItemStatus = 'done' | 'running' | 'pending'

interface SubProgressItem {
  id: string
  name: string
  status: SubItemStatus
}

interface PhaseProgress {
  total: number
  completed: number
  items: SubProgressItem[]
}

interface PhaseStatus {
  done: boolean
  running: boolean
}

interface RunItem {
  id: string
  status: string
  currentStep: string | null
  errorMessage: string | null
  clientCompany: { name: string; brandName?: string | null }
  contact: { name: string; email: string } | null
  // Sub-progress (populated after first pollStatus)
  researchProgress?: PhaseProgress
  coreOffer?: PhaseStatus
  moduleProgress?: PhaseProgress
  email?: PhaseStatus
}

interface Run {
  id: string
  status: string
  startedAt: string | null
  completedAt: string | null
  campaign: { name: string; id: string }
  runItems: RunItem[]
}

interface RunStatusResponse {
  id: string
  status: string
  startedAt: string | null
  completedAt: string | null
  runItems: RunItem[]
}

/* ═══════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════ */

/** The 4 actual pipeline steps matching the orchestrator */
const PIPELINE_STEPS = [
  { key: 'research', label: 'Kutatás', statusMatch: 'researching' },
  { key: 'core_offer', label: 'Ajánlat', statusMatch: 'generating_offer' },
  { key: 'modules', label: 'Modulok', statusMatch: 'generating_modules' },
  { key: 'email', label: 'Email', statusMatch: 'generating_email' },
]

const POLL_INTERVAL = 4000

/* ═══════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════ */

function getStepIndex(status: string, currentStep: string | null): number {
  if (status === 'completed') return PIPELINE_STEPS.length + 1
  const directIdx = PIPELINE_STEPS.findIndex((s) => s.statusMatch === status)
  if (directIdx >= 0) return directIdx + 1
  if (status === 'error' && currentStep) {
    const idx = PIPELINE_STEPS.findIndex((s) => s.key === currentStep)
    return idx >= 0 ? idx + 1 : 0
  }
  return 0
}

function getStepState(
  stepIndex: number,
  activeStep: number,
  isError: boolean
): 'done' | 'active' | 'error' | 'pending' {
  if (activeStep > stepIndex) return 'done'
  if (activeStep === stepIndex && isError) return 'error'
  if (activeStep === stepIndex) return 'active'
  return 'pending'
}

/* ═══════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════ */

/** Single sub-item row: research def or module def */
function SubItem({ item }: { item: SubProgressItem }) {
  if (item.status === 'done') {
    return (
      <div className="flex items-center gap-2 py-0.5 text-sm text-green-700">
        <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" />
        <span>{item.name}</span>
      </div>
    )
  }
  if (item.status === 'running') {
    return (
      <div className="flex items-center gap-2 py-0.5 text-sm text-blue-700 font-medium">
        <Loader2 className="h-3.5 w-3.5 shrink-0 text-blue-500 animate-spin" />
        <span>{item.name}</span>
        <span className="text-xs font-normal text-blue-500">folyamatban…</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm text-gray-400">
      <Circle className="h-3.5 w-3.5 shrink-0" />
      <span>{item.name}</span>
    </div>
  )
}

/** Phase section header with optional count badge */
function PhaseHeader({
  label,
  total,
  completed,
  isActive,
  isDone,
  isPending,
}: {
  label: string
  total?: number
  completed?: number
  isActive: boolean
  isDone: boolean
  isPending: boolean
}) {
  const iconEl = isDone ? (
    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
  ) : isActive ? (
    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
  ) : (
    <Circle className="h-3.5 w-3.5 text-gray-300" />
  )

  const labelColor = isDone
    ? 'text-green-700'
    : isActive
    ? 'text-blue-700'
    : 'text-gray-400'

  return (
    <div className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${labelColor}`}>
      {iconEl}
      <span>{label}</span>
      {total !== undefined && completed !== undefined && total > 0 && (
        <span className={`ml-auto font-normal normal-case tracking-normal ${isDone ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
          {completed} / {total}
        </span>
      )}
    </div>
  )
}

/** The mini pipeline progress bar (4 segments) for the card header */
function MiniStepProgress({
  status,
  currentStep,
}: {
  status: string
  currentStep: string | null
}) {
  const activeStep = getStepIndex(status, currentStep)
  const isError = status === 'error'

  return (
    <div className="flex items-center gap-0.5">
      {PIPELINE_STEPS.map((step, idx) => {
        const stepNum = idx + 1
        const state = getStepState(stepNum, activeStep, isError)
        const bg =
          state === 'done'
            ? 'bg-green-500'
            : state === 'active'
            ? 'bg-blue-500 animate-pulse'
            : state === 'error'
            ? 'bg-red-400 animate-pulse'
            : 'bg-gray-200'
        return (
          <div
            key={step.key}
            title={`${step.label}: ${state === 'done' ? 'kész' : state === 'active' ? 'folyamatban' : state === 'error' ? 'hiba' : 'várakozik'}`}
            className={`h-1.5 w-8 rounded-sm transition-all duration-500 ${bg}`}
          />
        )
      })}
      {/* completion segment */}
      <div
        title={`Befejezés: ${status === 'completed' ? 'kész' : 'várakozik'}`}
        className={`h-1.5 w-5 rounded-sm transition-all duration-500 ${
          status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
        }`}
      />
    </div>
  )
}

function RunStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  const color = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'
  const pulse = status === 'running' ? 'animate-pulse' : ''
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color} ${pulse}`}
    >
      {label}
    </span>
  )
}

function ItemStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
        <CheckCircle className="h-3 w-3" />
        {label}
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500">
        <Clock className="h-3 w-3" />
        {label}
      </span>
    )
  }
  // Active/running state
  const activeLabel = PIPELINE_STEPS.find((s) => s.statusMatch === status)?.label
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
      <Loader2 className="h-3 w-3 animate-spin" />
      {activeLabel ? `${activeLabel}…` : label}
    </span>
  )
}

/** Full card for a single RunItem showing sub-progress detail */
function RunItemCard({ item }: { item: RunItem }) {
  const isCompleted = item.status === 'completed'
  const isError = item.status === 'error'
  const isPending = item.status === 'pending'

  const hasSubProgress =
    item.researchProgress !== undefined ||
    item.coreOffer !== undefined ||
    item.moduleProgress !== undefined

  // Phase visibility helpers
  const research = item.researchProgress
  const co = item.coreOffer
  const modules = item.moduleProgress
  const emailPh = item.email

  const researchActive = item.status === 'researching'
  const researchDone =
    isCompleted ||
    !!['generating_offer', 'offer_done', 'generating_modules', 'modules_done', 'generating_email', 'email_done', 'gmail_drafting'].includes(item.status)

  const offerActive = item.status === 'generating_offer'
  const offerDone = co?.done ?? false

  const modulesActive = item.status === 'generating_modules'
  const modulesDone =
    isCompleted ||
    !!['generating_email', 'email_done', 'gmail_drafting'].includes(item.status)

  const emailActive = item.email?.running ?? false
  const emailDone = item.email?.done ?? false

  const cardBg = isCompleted
    ? 'border-green-200 bg-green-50/30'
    : isError
    ? 'border-red-200 bg-red-50/20'
    : isPending
    ? ''
    : 'border-blue-200'

  return (
    <Card className={`overflow-hidden transition-colors duration-300 ${cardBg}`}>
      {/* ── Card Header ─────────────────────────────────────────────── */}
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {item.clientCompany.brandName ?? item.clientCompany.name}
              </span>
              {item.clientCompany.brandName && (
                <span className="text-xs text-muted-foreground">
                  ({item.clientCompany.name})
                </span>
              )}
            </div>
            {item.contact && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {item.contact.name}
                <span className="mx-1">·</span>
                {item.contact.email}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ItemStatusBadge status={item.status} />
            {isCompleted && (
              <Link href={`/editor/${item.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <ExternalLink className="h-3 w-3" />
                  Editor
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="mt-2">
          <MiniStepProgress status={item.status} currentStep={item.currentStep} />
        </div>

        {/* Error message */}
        {isError && item.errorMessage && (
          <p className="mt-1.5 text-xs text-red-600 line-clamp-2">
            {item.errorMessage}
          </p>
        )}
      </CardHeader>

      {/* ── Card Body: Sub-progress ──────────────────────────────────── */}
      {hasSubProgress && !isPending && (
        <CardContent className="px-4 pb-4 pt-0 space-y-3">
          <div className="border-t pt-3 space-y-3">

            {/* Phase 1: Research */}
            {research && (
              <div className="space-y-1">
                <PhaseHeader
                  label="Kutatások"
                  total={research.total}
                  completed={research.completed}
                  isActive={researchActive}
                  isDone={researchDone}
                  isPending={!researchActive && !researchDone}
                />
                {research.items.length > 0 && (
                  <div className="pl-5 space-y-0.5">
                    {research.items.map((si) => (
                      <SubItem key={si.id} item={si} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phase 2: Core Offer */}
            {co !== undefined && (
              <div>
                <PhaseHeader
                  label="Core ajánlat"
                  isActive={offerActive}
                  isDone={offerDone}
                  isPending={!offerActive && !offerDone}
                />
              </div>
            )}

            {/* Phase 3: Modules */}
            {modules && (
              <div className="space-y-1">
                <PhaseHeader
                  label="Modulok"
                  total={modules.total}
                  completed={modules.completed}
                  isActive={modulesActive}
                  isDone={modulesDone}
                  isPending={!modulesActive && !modulesDone}
                />
                {modules.items.length > 0 && (
                  <div className="pl-5 space-y-0.5">
                    {modules.items.map((si) => (
                      <SubItem key={si.id} item={si} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Phase 4: Email */}
            {emailPh !== undefined && (
              <div>
                <PhaseHeader
                  label="Email generálás"
                  isActive={emailActive}
                  isDone={emailDone}
                  isPending={!emailActive && !emailDone}
                />
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   Main Page
   ═══════════════════════════════════════════════════════════════════ */

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [run, setRun] = useState<Run | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ─── Data Fetching ──────────────────────────────────────────── */

  const fetchRun = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}`)
      if (!res.ok) throw new Error('Failed to load run')
      const data: Run = await res.json()
      setRun(data)
      return data
    } catch {
      setError('Nem sikerült betölteni a futtatást.')
      return null
    }
  }, [id])

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/runs/${id}/status`)
      if (!res.ok) return
      const data: RunStatusResponse = await res.json()

      setRun((prev) => {
        if (!prev) return prev

        // Merge status API data into existing run state
        const updatedItems = prev.runItems.map((item) => {
          const updated = data.runItems.find((ri) => ri.id === item.id)
          return updated ? { ...item, ...updated } : item
        })

        return {
          ...prev,
          status: data.status,
          startedAt: data.startedAt ?? prev.startedAt,
          completedAt: data.completedAt ?? prev.completedAt,
          runItems: updatedItems,
        }
      })

      // Stop polling when run finishes
      if (data.status !== 'running') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        // Final full fetch for completeness
        fetchRun()
      }
    } catch {
      // ignore transient polling errors
    }
  }, [id, fetchRun])

  /* ─── Lifecycle ──────────────────────────────────────────────── */

  useEffect(() => {
    let cancelled = false
    async function init() {
      setLoading(true)
      const data = await fetchRun()
      if (!cancelled) {
        setLoading(false)
        if (data) {
          // Always do one status poll to populate sub-progress
          await pollStatus()
          if (data.status === 'running') {
            intervalRef.current = setInterval(pollStatus, POLL_INTERVAL)
          }
        }
      }
    }
    init()
    return () => {
      cancelled = true
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [fetchRun, pollStatus])

  // Auto-start/stop polling when status changes to/from running
  useEffect(() => {
    if (run?.status === 'running' && !intervalRef.current) {
      intervalRef.current = setInterval(pollStatus, POLL_INTERVAL)
    }
    if (run?.status !== 'running' && intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [run?.status, pollStatus])

  /* ─── Handlers ───────────────────────────────────────────────── */

  async function handleStart() {
    setStarting(true)
    setError(null)
    try {
      const res = await fetch(`/api/runs/${id}/start`, { method: 'POST' })
      if (!res.ok) throw new Error('Start failed')

      // Optimistic update
      setRun((prev) =>
        prev
          ? { ...prev, status: 'running', startedAt: new Date().toISOString() }
          : prev
      )

      // Start polling
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(pollStatus, POLL_INTERVAL)
      setTimeout(pollStatus, 1500)
    } catch {
      setError('Indítás sikertelen.')
    } finally {
      setStarting(false)
    }
  }

  /* ─── Render ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Betöltés…
      </div>
    )
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Vissza
        </Button>
        <p className="text-destructive">{error ?? 'Futtatás nem található.'}</p>
      </div>
    )
  }

  // ── Derived counts ──────────────────────────────────────────────
  const total = run.runItems.length
  const completedCount = run.runItems.filter((i) => i.status === 'completed').length
  const errorCount = run.runItems.filter((i) => i.status === 'error').length
  const activeCount = run.runItems.filter(
    (i) => !['pending', 'completed', 'error'].includes(i.status)
  ).length

  const isRunning = run.status === 'running'
  const isDone = ['completed', 'partial', 'failed'].includes(run.status)

  return (
    <div className="space-y-6">
      {/* ═══ Header ══════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push('/runs')}
              aria-label="Vissza"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">
              {run.campaign.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 pl-10 flex-wrap">
            <RunStatusBadge status={run.status} />
            {run.startedAt && (
              <span className="text-sm text-muted-foreground">
                Indítva: {formatDateTime(run.startedAt)}
              </span>
            )}
            {run.completedAt && (
              <span className="text-sm text-muted-foreground">
                Befejezve: {formatDateTime(run.completedAt)}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {run.status === 'pending' && (
            <Button onClick={handleStart} disabled={starting} className="gap-2">
              <Play className="h-4 w-4" />
              {starting ? 'Indítás…' : 'Start'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ═══ Running Banner ══════════════════════════════════════ */}
      {isRunning && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm text-blue-700 font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            Folyamat aktív – automatikus frissítés {POLL_INTERVAL / 1000} másodpercenként
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
            onClick={pollStatus}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Frissítés most
          </Button>
        </div>
      )}

      {/* ═══ Done/Partial/Failed Banners ═════════════════════════ */}
      {isDone && run.status === 'completed' && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-2.5 text-sm text-green-700 font-medium">
          <CheckCircle className="h-4 w-4" />
          Futtatás sikeresen befejezve – minden elem kész!
        </div>
      )}
      {isDone && run.status === 'partial' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 flex items-center gap-2.5 text-sm text-yellow-700 font-medium">
          <XCircle className="h-4 w-4" />
          Futtatás részlegesen befejezve – néhány elem hibás.
        </div>
      )}
      {isDone && run.status === 'failed' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2.5 text-sm text-red-700 font-medium">
          <XCircle className="h-4 w-4" />
          Futtatás meghiúsult – minden elem hibás.
        </div>
      )}

      {/* ═══ Stats Cards ═════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Összes</p>
          </CardContent>
        </Card>
        <Card className={activeCount > 0 ? 'ring-2 ring-blue-300' : ''}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${activeCount > 0 ? 'text-blue-600' : ''}`}>
              {activeCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Folyamatban</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kész</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${errorCount > 0 ? 'text-red-600' : ''}`}>
              {errorCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Hibás</p>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Overall Progress Bar ════════════════════════════════ */}
      {total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Összesített haladás</span>
            <span>
              {completedCount} kész
              {activeCount > 0 && ` · ${activeCount} folyamatban`}
              {errorCount > 0 && ` · ${errorCount} hibás`}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden flex">
            {completedCount > 0 && (
              <div
                className="h-full bg-green-500 transition-all duration-700 ease-out"
                style={{ width: `${(completedCount / total) * 100}%` }}
              />
            )}
            {activeCount > 0 && (
              <div
                className="h-full bg-blue-400 animate-pulse transition-all duration-700 ease-out"
                style={{ width: `${(activeCount / total) * 100}%` }}
              />
            )}
            {errorCount > 0 && (
              <div
                className="h-full bg-red-400 transition-all duration-700 ease-out"
                style={{ width: `${(errorCount / total) * 100}%` }}
              />
            )}
          </div>
        </div>
      )}

      {/* ═══ Run Items as Cards ═══════════════════════════════════ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Futtatás elemei</h2>
          <span className="text-xs text-muted-foreground">
            {PIPELINE_STEPS.map((s, i) => `${i + 1}. ${s.label}`).join(' → ')}
          </span>
        </div>

        {run.runItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              Nincsenek elemek ebben a futtatásban.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {run.runItems.map((item) => (
              <RunItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
