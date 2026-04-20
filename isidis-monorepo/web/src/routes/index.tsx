import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import WebsiteLayout from '@/layouts/WebsiteLayout';
import DashboardLayout from '@/layouts/DashboardLayout';

// Public
const Home = lazy(() => import('@/pages/public/Home'));
const Cartomantes = lazy(() => import('@/pages/public/Cartomantes'));
const CartomanteDetail = lazy(() => import('@/pages/public/CartomanteDetail'));
const ServicoDetail = lazy(() => import('@/pages/public/ServicoDetail'));
const Checkout = lazy(() => import('@/pages/public/Checkout'));
const CheckoutSuccess = lazy(() => import('@/pages/public/CheckoutSuccess'));
const TermosDeUso = lazy(() => import('@/pages/public/TermosDeUso'));
const TermosDaTarologa = lazy(() => import('@/pages/public/TermosDaTarologa'));
const TermosDoConsulente = lazy(() => import('@/pages/public/TermosDoConsulente'));
const ComoFuncionaOSaque = lazy(() => import('@/pages/public/ComoFuncionaOSaque'));

// Auth
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const RegisterConfirm = lazy(() => import('@/pages/auth/RegisterConfirm'));
const Recover = lazy(() => import('@/pages/auth/Recover'));
const UpdatePassword = lazy(() => import('@/pages/auth/UpdatePassword'));
const AuthCodeError = lazy(() => import('@/pages/auth/AuthCodeError'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));
const QuizOnboarding = lazy(() => import('@/pages/onboarding/QuizOnboarding'));

// Client Dashboard
const DashboardHome = lazy(() => import('@/pages/dashboard/client/DashboardHome'));
const DashboardPerfil = lazy(() => import('@/pages/dashboard/client/Perfil'));
const DashboardMensagens = lazy(() => import('@/pages/dashboard/client/Mensagens'));
const DashboardTickets = lazy(() => import('@/pages/dashboard/client/Tickets'));
const DashboardTicketDetail = lazy(() => import('@/pages/dashboard/client/TicketDetail'));
const DashboardLeitura = lazy(() => import('@/pages/dashboard/client/LeituraDetail'));
const DashboardPedido = lazy(() => import('@/pages/dashboard/client/PedidoDetail'));
const DashboardMinhasTiragens = lazy(() => import('@/pages/dashboard/client/MinhasTiragens'));
const DashboardMinhasAssinaturas = lazy(() => import('@/pages/dashboard/client/MinhasAssinaturas'));
const DashboardNotifications = lazy(() => import('@/pages/dashboard/client/Notifications'));

// Reader Dashboard
const ReaderHome = lazy(() => import('@/pages/dashboard/reader/ReaderHome'));
const ReaderGigs = lazy(() => import('@/pages/dashboard/reader/Gigs'));
const ReaderGigNovo = lazy(() => import('@/pages/dashboard/reader/GigNovo'));
const ReaderPedidos = lazy(() => import('@/pages/dashboard/reader/Pedidos'));
const ReaderPedidoDetail = lazy(() => import('@/pages/dashboard/reader/PedidoDetail'));
const ReaderPerfil = lazy(() => import('@/pages/dashboard/reader/Perfil'));
const ReaderMensagens = lazy(() => import('@/pages/dashboard/reader/Mensagens'));
const ReaderCarteira = lazy(() => import('@/pages/dashboard/reader/Carteira'));
const ReaderAnalytics = lazy(() => import('@/pages/dashboard/reader/Analytics'));
const ReaderTickets = lazy(() => import('@/pages/dashboard/reader/Tickets'));
const ReaderTicketDetail = lazy(() => import('@/pages/dashboard/reader/TicketDetail'));
const ReaderOnboarding = lazy(() => import('@/pages/dashboard/reader/Onboarding'));
const ReaderUnderReview = lazy(() => import('@/pages/dashboard/reader/UnderReview'));
const ReaderAssinaturas = lazy(() => import('@/pages/dashboard/reader/Assinaturas'));

const fallback = <div className="p-8 text-center" style={{ minHeight: '100vh' }}>Carregando...</div>;

export function AppRoutes() {
  return (
    <Suspense fallback={fallback}>
      <Routes>
        {/* Website */}
        <Route path="/" element={<WebsiteLayout />}>
          <Route index element={<Home />} />
          <Route path="cartomante/:id" element={<CartomanteDetail />} />
          <Route path="cartomantes" element={<Cartomantes />} />
          <Route path="servico/:id" element={<ServicoDetail />} />
          <Route path="checkout/:id" element={<Checkout />} />
          <Route path="checkout/success" element={<CheckoutSuccess />} />
          <Route path="termos-de-uso" element={<TermosDeUso />} />
          <Route path="termos-da-tarologa" element={<TermosDaTarologa />} />
          <Route path="termos-do-consulente" element={<TermosDoConsulente />} />
          <Route path="como-funciona-o-saque" element={<ComoFuncionaOSaque />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register/confirm" element={<RegisterConfirm />} />
        <Route path="/recover" element={<Recover />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/auth/auth-code-error" element={<AuthCodeError />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/quiz-onboarding" element={<QuizOnboarding />} />

        {/* Client Dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
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

        {/* Reader Dashboard (standalone — each page has own sidebar) */}
        <Route path="/dashboard/cartomante" element={<ReaderHome />} />
        <Route path="/dashboard/cartomante/gigs" element={<ReaderGigs />} />
        <Route path="/dashboard/cartomante/gigs/novo" element={<ReaderGigNovo />} />
        <Route path="/dashboard/cartomante/pedidos" element={<ReaderPedidos />} />
        <Route path="/dashboard/cartomante/pedido/:id" element={<ReaderPedidoDetail />} />
        <Route path="/dashboard/cartomante/perfil" element={<ReaderPerfil />} />
        <Route path="/dashboard/cartomante/mensagens" element={<ReaderMensagens />} />
        <Route path="/dashboard/cartomante/carteira" element={<ReaderCarteira />} />
        <Route path="/dashboard/cartomante/analytics" element={<ReaderAnalytics />} />
        <Route path="/dashboard/cartomante/tickets" element={<ReaderTickets />} />
        <Route path="/dashboard/cartomante/tickets/:id" element={<ReaderTicketDetail />} />
        <Route path="/dashboard/cartomante/onboarding" element={<ReaderOnboarding />} />
        <Route path="/dashboard/cartomante/under-review" element={<ReaderUnderReview />} />
        <Route path="/dashboard/cartomante/assinaturas" element={<ReaderAssinaturas />} />
      </Routes>
    </Suspense>
  );
}
