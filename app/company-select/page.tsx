'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOwnCompany, OwnCompanySummary } from '@/contexts/OwnCompanyContext'
import { Building2, Plus, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function CompanySelectPage() {
  const router = useRouter()
  const { allCompanies, activeCompany, setActiveCompany, isLoading } = useOwnCompany()

  // Redirect if already have active company
  useEffect(() => {
    if (!isLoading && activeCompany) {
      router.replace('/')
    }
  }, [isLoading, activeCompany, router])

  function handleSelect(company: OwnCompanySummary) {
    setActiveCompany(company)
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Válassz munkaterületet</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Melyik saját céged nevében dolgozol most?
            </p>
          </div>
        </div>

        {/* Company list */}
        {allCompanies.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-sm">Még nincs munkaterületed</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Hozz létre egy saját céget a kezdéshez.
                </p>
              </div>
              <Button onClick={() => router.push('/company')} className="gap-2">
                <Plus className="h-4 w-4" />
                Új munkaterület létrehozása
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {allCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelect(company)}
                className="w-full text-left rounded-xl border bg-card hover:bg-accent hover:border-primary transition-all p-4 flex items-center gap-4 group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{company.name}</p>
                  {company.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {company.description}
                    </p>
                  )}
                  {company.website && (
                    <p className="text-xs text-muted-foreground/60 truncate">
                      {company.website}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </button>
            ))}

            <Button
              variant="outline"
              className="w-full gap-2 mt-2"
              onClick={() => router.push('/company')}
            >
              <Plus className="h-4 w-4" />
              Új munkaterület létrehozása
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
