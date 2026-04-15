import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Layouts
import WebsiteLayout from './app/(website)/layout';
import DashboardClientLayout from './app/dashboard/layout';

// Website pages
import Home from './app/(website)/page';
import CartomantePerfil from './app/(website)/cartomante/[id]/page';
import Cartomantes from './app/(website)/cartomantes/page';
import ServicoDetail from './app/(website)/servico/[id]/page';
import Checkout from './app/(website)/checkout/[id]/page';
import CheckoutSuccess from './app/(website)/checkout/success/page';
import TermosDeUso from './app/(website)/termos-de-uso/page';
import TermosDaTarologa from './app/(website)/termos-da-tarologa/page';
import TermosDoConsulente from './app/(website)/termos-do-consulente/page';
import ComoFuncionaOSaque from './app/(website)/como-funciona-o-saque/page';

// Auth pages
import Login from './app/(auth)/login/page';
import Register from './app/(auth)/register/page';
import RegisterConfirm from './app/(auth)/register/confirm/page';
import Recover from './app/(auth)/recover/page';
import UpdatePassword from './app/(auth)/update-password/page';
import AuthCodeError from './app/auth/auth-code-error/page';
import ReaderOnboardingEntry from './app/onboarding/page';
import QuizOnboardingPage from './app/quiz-onboarding/page';

// Client Dashboard pages
import DashboardClientHome from './app/dashboard/page';
import DashboardPerfil from './app/dashboard/perfil/page';
import DashboardMensagens from './app/dashboard/mensagens/page';
import DashboardTickets from './app/dashboard/tickets/page';
import DashboardTicketDetail from './app/dashboard/tickets/[id]/page';
import DashboardLeitura from './app/dashboard/leitura/[id]/page';
import DashboardPedido from './app/dashboard/pedido/[id]/page';
import DashboardMinhasTiragens from './app/dashboard/minhas-tiragens/page';
import DashboardMinhasAssinaturas from './app/dashboard/minhas-assinaturas/page';
import DashboardNotifications from './app/dashboard/notifications/page';

// Cartomante Dashboard pages (each page includes its own CartomanteSidebar)
import CartomanteDashboard from './app/dashboard/cartomante/page';
import DashboardCartomanteGigs from './app/dashboard/cartomante/gigs/page';
import NovoGig from './app/dashboard/cartomante/gigs/novo/page';
import DashboardCartomantePedidos from './app/dashboard/cartomante/pedidos/page';
import CartomantePedidoDetail from './app/dashboard/cartomante/pedido/[id]/page';
import CartomantePerfilPage from './app/dashboard/cartomante/perfil/page';
import CartomanteMensagens from './app/dashboard/cartomante/mensagens/page';
import CartomanteCarteira from './app/dashboard/cartomante/carteira/page';
import CartomanteAnalytics from './app/dashboard/cartomante/analytics/page';
import CartomanteTickets from './app/dashboard/cartomante/tickets/page';
import CartomanteTicketDetail from './app/dashboard/cartomante/tickets/[id]/page';
import CartomanteOnboarding from './app/dashboard/cartomante/onboarding/page';
import CartomanteUnderReview from './app/dashboard/cartomante/under-review/page';
import CartomanteAssinaturas from './app/dashboard/cartomante/assinaturas/page';

import { Toaster } from "@/components/ui/sonner";
import { PresenceProvider } from "@/components/providers/presence-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export default function App() {
  return (
    <PresenceProvider>
      <BrowserRouter>
        <Suspense fallback={<div className="p-8 text-center" style={{ minHeight: '100vh' }}>Carregando interface...</div>}>
          <div className="min-h-screen bg-background font-sans antialiased flex flex-col dark">
            <Routes>
              {/* Website Routes */}
              <Route path="/" element={<WebsiteLayout />}>
                <Route index element={<Home />} />
                <Route path="cartomante/:id" element={<CartomantePerfil />} />
                <Route path="cartomantes" element={<Cartomantes />} />
                <Route path="servico/:id" element={<ServicoDetail />} />
                <Route path="checkout/:id" element={<Checkout />} />
                <Route path="checkout/success" element={<CheckoutSuccess />} />
                <Route path="termos-de-uso" element={<TermosDeUso />} />
                <Route path="termos-da-tarologa" element={<TermosDaTarologa />} />
                <Route path="termos-do-consulente" element={<TermosDoConsulente />} />
                <Route path="como-funciona-o-saque" element={<ComoFuncionaOSaque />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/confirm" element={<RegisterConfirm />} />
              <Route path="/recover" element={<Recover />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/auth/auth-code-error" element={<AuthCodeError />} />
              <Route path="/onboarding" element={<ReaderOnboardingEntry />} />
              <Route path="/quiz-onboarding" element={<QuizOnboardingPage />} />

              {/* Client Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardClientLayout />}>
                <Route index element={<DashboardClientHome />} />
                <Route path="perfil" element={<DashboardPerfil />} />
                <Route path="mensagens" element={<DashboardMensagens />} />
                <Route path="tickets" element={<DashboardTickets />} />
                <Route path="tickets/:id" element={<DashboardTicketDetail />} />
                <Route path="pedido/:id" element={<DashboardPedido />} />
                <Route path="leitura/:id" element={<DashboardLeitura />} />
                <Route path="minhas-tiragens" element={<DashboardMinhasTiragens />} />
                <Route path="minhas-assinaturas" element={<DashboardMinhasAssinaturas />} />
                <Route path="notifications" element={<DashboardNotifications />} />
              </Route>

              {/* Cartomante Dashboard Routes (standalone — each page has its own sidebar) */}
              <Route path="/dashboard/cartomante" element={<CartomanteDashboard />} />
              <Route path="/dashboard/cartomante/gigs" element={<DashboardCartomanteGigs />} />
              <Route path="/dashboard/cartomante/gigs/novo" element={<NovoGig />} />
              <Route path="/dashboard/cartomante/pedidos" element={<DashboardCartomantePedidos />} />
              <Route path="/dashboard/cartomante/pedido/:id" element={<CartomantePedidoDetail />} />
              <Route path="/dashboard/cartomante/perfil" element={<CartomantePerfilPage />} />
              <Route path="/dashboard/cartomante/mensagens" element={<CartomanteMensagens />} />
              <Route path="/dashboard/cartomante/carteira" element={<CartomanteCarteira />} />
              <Route path="/dashboard/cartomante/analytics" element={<CartomanteAnalytics />} />
              <Route path="/dashboard/cartomante/tickets" element={<CartomanteTickets />} />
              <Route path="/dashboard/cartomante/tickets/:id" element={<CartomanteTicketDetail />} />
              <Route path="/dashboard/cartomante/onboarding" element={<CartomanteOnboarding />} />
              <Route path="/dashboard/cartomante/under-review" element={<CartomanteUnderReview />} />
              <Route path="/dashboard/cartomante/assinaturas" element={<CartomanteAssinaturas />} />
            </Routes>
          </div>
          <Toaster />
          <ServiceWorkerRegister />
        </Suspense>
      </BrowserRouter>
    </PresenceProvider>
  );
}
