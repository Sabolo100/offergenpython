'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react'

export interface OwnCompanySummary {
  id: string
  name: string
  description?: string | null
  website?: string | null
}

interface OwnCompanyContextValue {
  activeCompany: OwnCompanySummary | null
  allCompanies: OwnCompanySummary[]
  setActiveCompany: (company: OwnCompanySummary) => void
  isLoading: boolean
  refetchCompanies: () => Promise<void>
}

const OwnCompanyContext = createContext<OwnCompanyContextValue | null>(null)

const LS_KEY = 'offergen_active_company_id'

export function OwnCompanyProvider({ children }: { children: ReactNode }) {
  const [allCompanies, setAllCompanies] = useState<OwnCompanySummary[]>([])
  const [activeCompany, setActiveCompanyState] = useState<OwnCompanySummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetchCompanies = useCallback(async () => {
    try {
      const res = await fetch('/api/own-company')
      const companies: OwnCompanySummary[] = await res.json()
      const list = Array.isArray(companies) ? companies : []
      setAllCompanies(list)

      const savedId = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null
      const match = savedId ? list.find((c) => c.id === savedId) : null

      if (match) {
        setActiveCompanyState(match)
      } else if (list.length === 1) {
        // Auto-select single workspace (zero friction)
        setActiveCompanyState(list[0])
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_KEY, list[0].id)
        }
      } else {
        setActiveCompanyState(null)
      }
    } catch {
      setAllCompanies([])
      setActiveCompanyState(null)
    }
  }, [])

  useEffect(() => {
    setIsLoading(true)
    refetchCompanies().finally(() => setIsLoading(false))
  }, [refetchCompanies])

  function setActiveCompany(company: OwnCompanySummary) {
    setActiveCompanyState(company)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KEY, company.id)
    }
  }

  return (
    <OwnCompanyContext.Provider
      value={{
        activeCompany,
        allCompanies,
        setActiveCompany,
        isLoading,
        refetchCompanies,
      }}
    >
      {children}
    </OwnCompanyContext.Provider>
  )
}

export function useOwnCompany(): OwnCompanyContextValue {
  const ctx = useContext(OwnCompanyContext)
  if (!ctx) throw new Error('useOwnCompany must be used inside OwnCompanyProvider')
  return ctx
}
