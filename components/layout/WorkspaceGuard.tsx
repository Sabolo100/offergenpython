'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'
import { Loader2 } from 'lucide-react'

export function WorkspaceGuard({ children }: { children: React.ReactNode }) {
  const { activeCompany, isLoading } = useOwnCompany()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !activeCompany) {
      router.replace('/company-select')
    }
  }, [isLoading, activeCompany, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!activeCompany) {
    return null
  }

  return <>{children}</>
}
