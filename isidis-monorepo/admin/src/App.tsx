import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { UsersPage } from '@/pages/UsersPage'
import { UserDetailPage } from '@/pages/UserDetailPage'
import { ApprovalsPage } from '@/pages/ApprovalsPage'
import { ApprovalDetailPage } from '@/pages/ApprovalDetailPage'
import { GigsPage } from '@/pages/GigsPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { OrderDetailPage } from '@/pages/OrderDetailPage'
import { FinancialsPage } from '@/pages/FinancialsPage'
import { TicketsPage } from '@/pages/TicketsPage'
import { TicketDetailPage } from '@/pages/TicketDetailPage'

function AuthGuard() {
  const { user, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Verificando acesso…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-destructive">Acesso negado</h1>
          <p className="text-muted-foreground">Sua conta não tem permissão de administrador.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="text-sm text-primary underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <AdminLayout />
    </>
  )
}

// AdminLayout wraps Outlet, so AuthGuard renders AdminLayout which renders Outlet
function ProtectedLayout() {
  return <AuthGuard />
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/:id', element: <UserDetailPage /> },
      { path: 'approvals', element: <ApprovalsPage /> },
      { path: 'approvals/:id', element: <ApprovalDetailPage /> },
      { path: 'gigs', element: <GigsPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:id', element: <OrderDetailPage /> },
      { path: 'financials', element: <FinancialsPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'tickets/:id', element: <TicketDetailPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])

export default function App() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <RouterProvider router={router} />
    </>
  )
}
