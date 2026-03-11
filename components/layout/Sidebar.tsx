'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Users,
  Megaphone,
  Search,
  Layers,
  Palette,
  Play,
  FileEdit,
  Settings,
  ChevronRight,
  ChevronsUpDown,
  Plus,
} from 'lucide-react'
import { useOwnCompany } from '@/contexts/OwnCompanyContext'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Saját cég', href: '/company', icon: Building2 },
  { name: 'Ügyfélcégek', href: '/clients', icon: Users },
  { name: 'Kampányok', href: '/campaigns', icon: Megaphone },
  { name: 'Research admin', href: '/research', icon: Search },
  { name: 'Modul admin', href: '/modules', icon: Layers },
  { name: 'Design admin', href: '/designs', icon: Palette },
  { name: 'Futtatások', href: '/runs', icon: Play },
  { name: 'Editor / Export', href: '/editor', icon: FileEdit },
  { name: 'Beállítások', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeCompany, allCompanies, setActiveCompany } = useOwnCompany()
  const [open, setOpen] = useState(false)

  function handleSelect(companyId: string) {
    if (companyId === '__new__') {
      setOpen(false)
      router.push('/company-select')
      return
    }
    const c = allCompanies.find((x) => x.id === companyId)
    if (c) {
      setActiveCompany(c)
      setOpen(false)
    }
  }

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Company switcher */}
      <div className="relative border-b border-sidebar-border">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-16 w-full items-center gap-3 px-4 hover:bg-sidebar-accent/40 transition-colors"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Megaphone className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {activeCompany?.name ?? 'OfferGen'}
            </p>
            <p className="text-xs text-sidebar-foreground/60">B2B Ajánlat Platform</p>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 w-full bg-sidebar border border-sidebar-border rounded-b-lg shadow-lg">
            {allCompanies.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-sidebar-accent/50 transition-colors',
                  activeCompany?.id === c.id ? 'font-semibold text-sidebar-foreground' : 'text-sidebar-foreground/70'
                )}
              >
                {c.name}
              </button>
            ))}
            <button
              onClick={() => handleSelect('__new__')}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors border-t border-sidebar-border"
            >
              <Plus className="h-3 w-3" />
              Új munkaterület
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.name}</span>
                  {isActive && <ChevronRight className="h-3 w-3" />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4">
        <p className="text-xs text-sidebar-foreground/40 text-center">
          OfferGen v0.1.0
        </p>
      </div>
    </div>
  )
}
