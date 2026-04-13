import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export function AdminLayout() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-8 max-w-[1400px] mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
