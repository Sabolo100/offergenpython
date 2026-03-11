'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate, formatDateTime } from '@/lib/utils'
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Plus,
  Globe,
  Users,
  Loader2,
  Mail,
  Briefcase,
  Search,
  ExternalLink,
  Building2,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface Contact {
  id: string
  clientCompanyId: string
  name: string
  position?: string | null
  email: string
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface ResearchResult {
  id: string
  clientCompanyId: string
  researchDefinitionId: string
  content: string
  model?: string | null
  status: string
  createdAt: string
  researchDefinition?: { name: string; description?: string | null }
}

interface ClientDetail {
  id: string
  name: string
  brandName?: string | null
  industry?: string | null
  country?: string | null
  website?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  contacts: Contact[]
  _count: { contacts: number }
  researchResults?: ResearchResult[]
}

// ── ClientForm Dialog ─────────────────────────────────────────────────────────

interface ClientFormProps {
  client: ClientDetail
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (client: ClientDetail) => void
}

function ClientEditForm({ client, open, onOpenChange, onSaved }: ClientFormProps) {
  const [name, setName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [industry, setIndustry] = useState('')
  const [country, setCountry] = useState('')
  const [website, setWebsite] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(client.name)
      setBrandName(client.brandName ?? '')
      setIndustry(client.industry ?? '')
      setCountry(client.country ?? '')
      setWebsite(client.website ?? '')
      setNotes(client.notes ?? '')
      setError(null)
    }
  }, [open, client])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          brandName: brandName || null,
          industry: industry || null,
          country: country || null,
          website: website || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved = await res.json()
      onSaved({ ...client, ...saved })
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
          <DialogTitle>Ügyfél szerkesztése</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cl-name">Cégnév *</Label>
              <Input id="cl-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-brand">Márkanév</Label>
              <Input id="cl-brand" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-industry">Iparág</Label>
              <Input id="cl-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-country">Ország</Label>
              <Input id="cl-country" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cl-web">Weboldal</Label>
              <Input id="cl-web" value={website} onChange={(e) => setWebsite(e.target.value)} type="url" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cl-notes">Megjegyzés</Label>
            <Textarea id="cl-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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

// ── ContactForm Dialog ────────────────────────────────────────────────────────

interface ContactFormProps {
  clientCompanyId: string
  contact: Contact | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (contact: Contact) => void
}

function ContactForm({ clientCompanyId, contact, open, onOpenChange, onSaved }: ContactFormProps) {
  const [name, setName] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '')
      setPosition(contact?.position ?? '')
      setEmail(contact?.email ?? '')
      setNotes(contact?.notes ?? '')
      setError(null)
    }
  }, [open, contact])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name,
        position: position || null,
        email,
        notes: notes || null,
        ...(contact ? {} : { clientCompanyId }),
      }
      let res: Response
      if (contact) {
        res = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (!res.ok) throw new Error('Mentés sikertelen')
      const saved: Contact = await res.json()
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{contact ? 'Kontakt szerkesztése' : 'Új kontakt'}</DialogTitle>
          <DialogDescription>A kontakt személy adatait add meg.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ct-name">Név *</Label>
            <Input
              id="ct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Teljes név"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-pos">Pozíció</Label>
            <Input
              id="ct-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="pl. Marketing vezető"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-email">E-mail *</Label>
            <Input
              id="ct-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nev@ceg.hu"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ct-notes">Megjegyzés</Label>
            <Textarea
              id="ct-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Belső megjegyzések..."
              rows={3}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Mégse</Button>
            </DialogClose>
            <Button type="submit" disabled={saving || !name.trim() || !email.trim()}>
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

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [clientFormOpen, setClientFormOpen] = useState(false)
  const [contactFormOpen, setContactFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
  const [deleteContactConfirm, setDeleteContactConfirm] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null }
        return r.json()
      })
      .then((data) => { if (data) setClient(data) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  function handleClientSaved(saved: ClientDetail) {
    setClient((prev) => prev ? { ...prev, ...saved } : saved)
  }

  function handleContactSaved(saved: Contact) {
    setClient((prev) => {
      if (!prev) return prev
      const exists = prev.contacts.some((c) => c.id === saved.id)
      const contacts = exists
        ? prev.contacts.map((c) => (c.id === saved.id ? saved : c))
        : [saved, ...prev.contacts]
      return { ...prev, contacts, _count: { contacts: contacts.length } }
    })
  }

  function openEditContact(contact: Contact) {
    setEditingContact(contact)
    setContactFormOpen(true)
  }

  function openAddContact() {
    setEditingContact(null)
    setContactFormOpen(true)
  }

  async function confirmDeleteContact() {
    if (!deleteContactConfirm) return
    setDeletingContactId(deleteContactConfirm)
    setDeleteContactConfirm(null)
    try {
      const res = await fetch(`/api/contacts/${deleteContactConfirm}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setClient((prev) => {
        if (!prev) return prev
        const contacts = prev.contacts.filter((c) => c.id !== deleteContactConfirm)
        return { ...prev, contacts, _count: { contacts: contacts.length } }
      })
    } finally {
      setDeletingContactId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (notFound || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Az ügyfél nem található.</p>
        <Button variant="outline" onClick={() => router.push('/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az ügyfelekhez
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Back + Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground"
          onClick={() => router.push('/clients')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Ügyfélcégek
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {client.brandName && (
                <Badge variant="secondary">{client.brandName}</Badge>
              )}
              {client.industry && (
                <Badge variant="outline">
                  <Briefcase className="mr-1 h-3 w-3" />
                  {client.industry}
                </Badge>
              )}
              {client.country && (
                <span className="text-sm text-muted-foreground">{client.country}</span>
              )}
            </div>
          </div>
          <Button variant="outline" onClick={() => setClientFormOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Szerkesztés
          </Button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{client._count.contacts}</p>
              <p className="text-xs text-muted-foreground">Kontakt</p>
            </div>
          </CardContent>
        </Card>
        {client.website && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 shrink-0">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 truncate"
                >
                  Weboldal
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <p className="text-xs text-muted-foreground truncate">{client.website}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 shrink-0">
              <Building2 className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hozzáadva</p>
              <p className="text-sm font-medium">{formatDate(client.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Megjegyzések</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Contacts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Kontaktok
            {client.contacts.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({client.contacts.length})
              </span>
            )}
          </h2>
          <Button onClick={openAddContact}>
            <Plus className="mr-2 h-4 w-4" />
            Új kontakt
          </Button>
        </div>

        {client.contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 border border-dashed rounded-lg">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-medium">Még nincs kontakt</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adj hozzá kapcsolattartókat ehhez az ügyfélhez.
              </p>
            </div>
            <Button variant="outline" onClick={openAddContact}>
              <Plus className="mr-2 h-4 w-4" />
              Kontakt hozzáadása
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Név</TableHead>
                  <TableHead>Pozíció</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Megjegyzés</TableHead>
                  <TableHead>Hozzáadva</TableHead>
                  <TableHead className="w-24 text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {client.contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      {contact.position ? (
                        <span className="text-sm text-muted-foreground">{contact.position}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {contact.email}
                      </a>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48">
                      <span className="truncate block">{contact.notes ?? '—'}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(contact.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditContact(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteContactConfirm(contact.id)}
                          disabled={deletingContactId === contact.id}
                        >
                          {deletingContactId === contact.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Research Results Section */}
      {client.researchResults && client.researchResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Kutatási eredmények</h2>
            <Badge variant="secondary">{client.researchResults.length}</Badge>
          </div>
          <div className="space-y-3">
            {client.researchResults.map((result) => (
              <Card key={result.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">
                      {result.researchDefinition?.name ?? 'Kutatás'}
                    </CardTitle>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.model && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {result.model}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(result.createdAt)}
                      </span>
                    </div>
                  </div>
                  {result.researchDefinition?.description && (
                    <CardDescription className="text-xs">
                      {result.researchDefinition.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed line-clamp-6">
                    {result.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ClientEditForm
        client={client}
        open={clientFormOpen}
        onOpenChange={setClientFormOpen}
        onSaved={handleClientSaved}
      />
      <ContactForm
        clientCompanyId={client.id}
        contact={editingContact}
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
        onSaved={handleContactSaved}
      />

      {/* Delete Contact Confirmation */}
      <Dialog
        open={deleteContactConfirm !== null}
        onOpenChange={(o) => { if (!o) setDeleteContactConfirm(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kontakt törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretnéd ezt a kontaktszemélyt? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContactConfirm(null)}>Mégse</Button>
            <Button variant="destructive" onClick={confirmDeleteContact}>Törlés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
