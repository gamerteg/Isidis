import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { PageSpinner } from '@/components/ui/spinner'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { ReaderLayout } from '@/components/layout/ReaderLayout'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterClientPage } from '@/pages/auth/RegisterClientPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'

// Client pages
import { HomePage } from '@/pages/client/HomePage'
import { ReadersListPage } from '@/pages/client/ReadersListPage'
import { ReaderProfilePage } from '@/pages/client/ReaderProfilePage'
import { GigDetailPage } from '@/pages/client/GigDetailPage'
import { CheckoutPage } from '@/pages/client/CheckoutPage'
import { PixPaymentPage } from '@/pages/client/PixPaymentPage'
import { ClientOrdersPage } from '@/pages/client/ClientOrdersPage'
import { ClientOrderDetailPage } from '@/pages/client/ClientOrderDetailPage'
import { ClientProfilePage } from '@/pages/client/ClientProfilePage'

// Reader pages
import { ReaderDashboardPage } from '@/pages/reader/ReaderDashboardPage'
import { MyGigsPage } from '@/pages/reader/MyGigsPage'
import { GigEditorPage } from '@/pages/reader/GigEditorPage'
import { ReaderOrdersPage } from '@/pages/reader/ReaderOrdersPage'
import { ReaderOrderDetailPage } from '@/pages/reader/ReaderOrderDetailPage'
import { DeliveryEditorPage } from '@/pages/reader/DeliveryEditorPage'
import { WalletPage } from '@/pages/reader/WalletPage'
import { WithdrawPage } from '@/pages/reader/WithdrawPage'
import { ReaderProfileEditPage } from '@/pages/reader/ReaderProfileEditPage'

// ─── Guards ───────────────────────────────────────────────────────────────────

function AuthGuard() {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />

  // Redirect to the right area based on role
  if (profile?.role === 'READER') return <Navigate to="/leitora/dashboard" replace />

  return <Outlet />
}

function ReaderGuard() {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile?.role !== 'READER') return <Navigate to="/home" replace />

  return <Outlet />
}

function GuestGuard() {
  const { user, profile, loading } = useAuth()

  if (loading) return <PageSpinner />

  if (user) {
    if (profile?.role === 'READER') return <Navigate to="/leitora/dashboard" replace />
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = createBrowserRouter([
  // Guest-only routes
  {
    element: <GuestGuard />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/cadastro', element: <RegisterClientPage /> },
      { path: '/esqueci-senha', element: <ForgotPasswordPage /> },
    ],
  },

  // Client routes
  {
    element: <AuthGuard />,
    children: [
      {
        element: <ClientLayout />,
        children: [
          { path: '/home', element: <HomePage /> },
          { path: '/explorar', element: <ReadersListPage /> },
          { path: '/leitora/:readerId', element: <ReaderProfilePage /> },
          { path: '/gig/:gigId', element: <GigDetailPage /> },
          { path: '/checkout/:gigId', element: <CheckoutPage /> },
          { path: '/checkout/:gigId/pix', element: <PixPaymentPage /> },
          { path: '/pedidos', element: <ClientOrdersPage /> },
          { path: '/pedidos/:orderId', element: <ClientOrderDetailPage /> },
          { path: '/perfil', element: <ClientProfilePage /> },
        ],
      },
    ],
  },

  // Reader routes
  {
    element: <ReaderGuard />,
    children: [
      {
        element: <ReaderLayout />,
        children: [
          { path: '/leitora/dashboard', element: <ReaderDashboardPage /> },
          { path: '/leitora/gigs', element: <MyGigsPage /> },
          { path: '/leitora/gigs/novo', element: <GigEditorPage /> },
          { path: '/leitora/gigs/:gigId/editar', element: <GigEditorPage /> },
          { path: '/leitora/pedidos', element: <ReaderOrdersPage /> },
          { path: '/leitora/pedidos/:orderId', element: <ReaderOrderDetailPage /> },
          { path: '/leitora/pedidos/:orderId/entregar', element: <DeliveryEditorPage /> },
          { path: '/leitora/wallet', element: <WalletPage /> },
          { path: '/leitora/wallet/sacar', element: <WithdrawPage /> },
          { path: '/leitora/perfil', element: <ReaderProfileEditPage /> },
        ],
      },
    ],
  },

  // Default redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
])

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            background: 'hsl(285, 28%, 11%)',
            border: '1px solid hsl(285, 18%, 18%)',
            color: 'hsl(280, 20%, 92%)',
          },
        }}
      />
      <RouterProvider router={router} />
    </>
  )
}
