'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, XCircle, Key, Mail, Database, ExternalLink, RefreshCw } from 'lucide-react'

interface ApiKeyStatus {
  key: string
  label: string
  isSet: boolean
}

interface GmailStatus {
  connected: boolean
  email?: string
  error?: string
}

interface DbStatus {
  connected: boolean
  error?: string
}

interface SettingsData {
  apiKeys: ApiKeyStatus[]
  gmail: GmailStatus
  db: DbStatus
}

function StatusIcon({ isSet }: { isSet: boolean }) {
  return isSet ? (
    <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
  )
}

function StatusBadge({ isSet }: { isSet: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        isSet
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }
    >
      {isSet ? 'Beállítva' : 'Nincs beállítva'}
    </Badge>
  )
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [gmailConnecting, setGmailConnecting] = useState(false)
  const [dbChecking, setDbChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchSettings() {
    setLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data: SettingsData = await res.json()
      setSettings(data)
    } catch {
      // Fallback: show placeholder data if API not yet implemented
      setSettings({
        apiKeys: [
          { key: 'ANTHROPIC_API_KEY', label: 'Anthropic (Claude)', isSet: false },
          { key: 'PERPLEXITY_API_KEY', label: 'Perplexity AI', isSet: false },
          { key: 'OPENAI_API_KEY', label: 'OpenAI', isSet: false },
          { key: 'GMAIL_CLIENT_ID', label: 'Gmail OAuth Client ID', isSet: false },
          { key: 'GMAIL_CLIENT_SECRET', label: 'Gmail OAuth Client Secret', isSet: false },
        ],
        gmail: { connected: false, error: 'Nem sikerült betölteni a Gmail státuszt.' },
        db: { connected: false, error: 'Nem sikerült betölteni a DB státuszt.' },
      })
      setError('Beállítások betöltése részlegesen sikertelen. Ellenőrizd az API-t.')
    } finally {
      setLoading(false)
    }
  }

  async function checkDbStatus() {
    setDbChecking(true)
    try {
      const res = await fetch('/api/settings/db-status')
      const data = await res.json()
      setSettings((prev) =>
        prev ? { ...prev, db: data } : prev
      )
    } catch {
      setSettings((prev) =>
        prev ? { ...prev, db: { connected: false, error: 'Kapcsolat sikertelen.' } } : prev
      )
    } finally {
      setDbChecking(false)
    }
  }

  async function connectGmail() {
    setGmailConnecting(true)
    try {
      const res = await fetch('/api/gmail/auth')
      const data = await res.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      } else {
        setError('Nem sikerült Gmail auth URL-t generálni.')
        setGmailConnecting(false)
      }
    } catch {
      setError('Gmail kapcsolódás sikertelen.')
      setGmailConnecting(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Beállítások</h1>
        <p className="text-muted-foreground mt-1">
          Rendszer konfiguráció és integrációk kezelése
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          {error}
        </div>
      )}

      {/* API Keys Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">API Kulcsok</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Az API kulcsok a szerver környezeti változókból olvasódnak. Az értékek nem jelennek meg
            biztonsági okokból.
          </p>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          {loading ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">Betöltés...</div>
          ) : (
            settings?.apiKeys.map((apiKey, idx) => (
              <div key={apiKey.key}>
                {idx > 0 && <Separator />}
                <div className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <StatusIcon isSet={apiKey.isSet} />
                    <div>
                      <p className="text-sm font-medium">{apiKey.label}</p>
                      <code className="text-xs text-muted-foreground">{apiKey.key}</code>
                    </div>
                  </div>
                  <StatusBadge isSet={apiKey.isSet} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Gmail Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Gmail kapcsolat</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            OAuth 2.0 kapcsolat a Gmail API-hoz email draft létrehozásához.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">Betöltés...</div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <StatusIcon isSet={settings?.gmail.connected ?? false} />
                  <div>
                    <p className="text-sm font-medium">
                      {settings?.gmail.connected ? 'Kapcsolódva' : 'Nincs kapcsolódva'}
                    </p>
                    {settings?.gmail.email && (
                      <p className="text-xs text-muted-foreground">{settings.gmail.email}</p>
                    )}
                    {settings?.gmail.error && !settings.gmail.connected && (
                      <p className="text-xs text-muted-foreground">{settings.gmail.error}</p>
                    )}
                  </div>
                </div>
                <StatusBadge isSet={settings?.gmail.connected ?? false} />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={connectGmail}
                  disabled={gmailConnecting}
                  variant={settings?.gmail.connected ? 'outline' : 'default'}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  {gmailConnecting
                    ? 'Átirányítás...'
                    : settings?.gmail.connected
                    ? 'Gmail újracsatlakoztatása'
                    : 'Kapcsolódás Gmail-hez'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                A Gmail kapcsolat OAuth 2.0-t használ. Az engedélyezési folyamat a Google
                bejelentkezési oldalára irányít.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Database Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Adatbázis</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            PostgreSQL adatbázis kapcsolat státusza.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-4 text-center text-muted-foreground text-sm">Betöltés...</div>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <StatusIcon isSet={settings?.db.connected ?? false} />
                  <div>
                    <p className="text-sm font-medium">
                      {settings?.db.connected ? 'Kapcsolódva' : 'Nincs kapcsolódva'}
                    </p>
                    {settings?.db.error && !settings.db.connected && (
                      <p className="text-xs text-destructive">{settings.db.error}</p>
                    )}
                    {settings?.db.connected && (
                      <p className="text-xs text-muted-foreground">PostgreSQL - Prisma ORM</p>
                    )}
                  </div>
                </div>
                <StatusBadge isSet={settings?.db.connected ?? false} />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={checkDbStatus}
                disabled={dbChecking}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${dbChecking ? 'animate-spin' : ''}`} />
                {dbChecking ? 'Ellenőrzés...' : 'Kapcsolat ellenőrzése'}
              </Button>

              <div className="rounded-md bg-muted/50 px-3 py-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Konfiguráció</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">DATABASE_URL</span>
                  <span className={settings?.db.connected ? 'text-green-600' : 'text-muted-foreground'}>
                    {settings?.db.connected ? 'Beállítva' : 'Ellenőrizze az .env fájlt'}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
