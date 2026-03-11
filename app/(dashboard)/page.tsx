'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Megaphone, Play, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'

interface Stats {
  clientCount: number
  campaignCount: number
  runCount: number
  completedRunItemCount: number
}

interface RecentRun {
  id: string
  status: string
  createdAt: string
  campaign: { name: string }
  _count: { runItems: number }
}

export default function DashboardPage() {
  const { activeCompany } = useOwnCompany()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])

  useEffect(() => {
    if (!activeCompany) return
    const id = activeCompany.id
    Promise.all([
      fetch(`/api/dashboard?companyId=${id}`).then((r) => r.json()),
      fetch(`/api/runs?companyId=${id}`).then((r) => r.json()),
    ]).then(([s, runs]) => {
      setStats(s)
      setRecentRuns(Array.isArray(runs) ? runs.slice(0, 5) : [])
    })
  }, [activeCompany])

  const cards = [
    { title: 'Ügyfélcégek', value: stats?.clientCount ?? '–', icon: Users, href: '/clients', color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Kampányok', value: stats?.campaignCount ?? '–', icon: Megaphone, href: '/campaigns', color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Futtatások', value: stats?.runCount ?? '–', icon: Play, href: '/runs', color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Kész ajánlatok', value: stats?.completedRunItemCount ?? '–', icon: CheckCircle, href: '/editor', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          {activeCompany ? activeCompany.name : 'B2B Ajánlatkészítő Platform'} áttekintése
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`${card.bg} p-3 rounded-lg`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Runs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Legutóbbi futtatások</CardTitle>
            <Link href="/runs">
              <Button variant="ghost" size="sm" className="gap-1">
                Mind <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentRuns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                Még nincs futtatás.{' '}
                <Link href="/campaigns" className="text-primary hover:underline">
                  Hozz létre kampányt
                </Link>
              </p>
            ) : (
              <div className="space-y-3">
                {recentRuns.map((run) => (
                  <Link key={run.id} href={`/runs/${run.id}`}>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{run.campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(new Date(run.createdAt))} · {run._count.runItems} ügyfél
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          run.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : run.status === 'running'
                            ? 'bg-blue-100 text-blue-700'
                            : run.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {run.status === 'completed' ? 'Kész' : run.status === 'running' ? 'Fut' : run.status === 'failed' ? 'Hiba' : 'Várakozik'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/clients">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Users className="h-4 w-4" /> Ügyfél feltöltése
              </Button>
            </Link>
            <Link href="/campaigns/new">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Megaphone className="h-4 w-4" /> Új kampány
              </Button>
            </Link>
            <Link href="/runs">
              <Button className="w-full justify-start gap-2">
                <Play className="h-4 w-4" /> Kampány indítása
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
