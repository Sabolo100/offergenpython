import { Sidebar } from '@/components/layout/Sidebar'
import { WorkspaceGuard } from '@/components/layout/WorkspaceGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkspaceGuard>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </WorkspaceGuard>
  )
}
