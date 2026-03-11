import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('hu-HU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Várakozik',
  // Orchestrator actual statuses
  researching: 'Kutatás folyamatban',
  generating_offer: 'Ajánlat generálás',
  generating_modules: 'Modulok generálása',
  generating_email: 'Email generálás',
  // Legacy / alternative status names (kept for compatibility)
  research_running: 'Kutatás folyamatban',
  research_done: 'Kutatás kész',
  offer_generating: 'Ajánlat generálás',
  offer_done: 'Ajánlat kész',
  modules_generating: 'Modulok generálása',
  modules_done: 'Modulok készen',
  export_generating: 'Export generálás',
  export_done: 'Export kész',
  email_generating: 'Email generálás',
  email_done: 'Email kész',
  gmail_drafting: 'Gmail draft',
  completed: 'Kész',
  error: 'Hiba',
  running: 'Fut',
  failed: 'Meghiúsult',
  partial: 'Részleges',
  draft: 'Vázlat',
  active: 'Aktív',
  archived: 'Archivált',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  // Orchestrator actual statuses
  researching: 'bg-blue-100 text-blue-700',
  generating_offer: 'bg-yellow-100 text-yellow-700',
  generating_modules: 'bg-orange-100 text-orange-700',
  generating_email: 'bg-indigo-100 text-indigo-700',
  // Legacy / alternative status names
  research_running: 'bg-blue-100 text-blue-700',
  research_done: 'bg-blue-200 text-blue-800',
  offer_generating: 'bg-yellow-100 text-yellow-700',
  offer_done: 'bg-yellow-200 text-yellow-800',
  modules_generating: 'bg-orange-100 text-orange-700',
  modules_done: 'bg-orange-200 text-orange-800',
  export_generating: 'bg-purple-100 text-purple-700',
  export_done: 'bg-purple-200 text-purple-800',
  email_generating: 'bg-indigo-100 text-indigo-700',
  email_done: 'bg-indigo-200 text-indigo-800',
  gmail_drafting: 'bg-pink-100 text-pink-700',
  completed: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  running: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  partial: 'bg-yellow-100 text-yellow-700',
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-200 text-gray-600',
}
