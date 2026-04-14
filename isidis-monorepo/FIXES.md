# Isidis — Plano de Correções Técnicas

Este arquivo contém todas as correções identificadas na análise do codebase. Execute cada tarefa na ordem indicada. Todas as mudanças devem ser testadas localmente antes de fazer commit.

---

## SPRINT 1 — Crítico (execute primeiro)

### Fix 1 — Enviar token FCM para a API após inicialização do Firebase

**Arquivo:** `app/lib/core/services/firebase_service.dart`

No método `initialize()`, logo após `final token = await messaging.getToken();`, substituir o comentário TODO pelo código real:

```dart
// ANTES:
final token = await messaging.getToken();
debugPrint('[Firebase] FCM token: $token');
// TODO: POST token para /me/fcm-token

// DEPOIS:
final token = await messaging.getToken();
debugPrint('[Firebase] FCM token: $token');
if (token != null) {
  try {
    import 'package:isidis_app/core/api/api_client.dart'; // já deve estar importado no topo
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    await api.post('/device-tokens', data: {'token': token, 'platform': platform});
    debugPrint('[Firebase] Token enviado para API');
  } catch (e) {
    debugPrint('[Firebase] Falha ao enviar token: $e');
  }
}
```

Adicionar no topo do arquivo se não estiver:
```dart
import 'package:flutter/foundation.dart';
import '../../core/api/api_client.dart';
```

Também registrar quando o token é renovado (adicionar dentro do `initialize()`):
```dart
messaging.onTokenRefresh.listen((newToken) async {
  try {
    final platform = defaultTargetPlatform == TargetPlatform.iOS ? 'ios' : 'android';
    await api.post('/device-tokens', data: {'token': newToken, 'platform': platform});
  } catch (e) {
    debugPrint('[Firebase] Token refresh send failed: $e');
  }
});
```

---

### Fix 2 — Criar serviço centralizado de notificações na API (notifyUser)

**Criar arquivo novo:** `api/src/services/notify.ts`

```typescript
import { FastifyInstance } from 'fastify'
import { sendPushNotification } from '../lib/firebase.js'

interface NotifyPayload {
  type: string
  title: string
  message: string
  link?: string
  data?: Record<string, string>
}

export async function notifyUser(
  fastify: FastifyInstance,
  userId: string,
  payload: NotifyPayload
): Promise<void> {
  // 1. Inserir notificação in-app
  const { error } = await fastify.supabase.from('notifications').insert({
    user_id: userId,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    link: payload.link ?? null,
  })

  if (error) {
    fastify.log.error({ error, userId }, '[notify] Erro ao inserir notificação')
  }

  // 2. Buscar tokens FCM do usuário
  const { data: tokens } = await fastify.supabase
    .from('device_tokens')
    .select('token')
    .eq('user_id', userId)

  if (!tokens || tokens.length === 0) return

  // 3. Disparar push para cada device do usuário
  const pushData: Record<string, string> = {
    ...(payload.data ?? {}),
    ...(payload.link ? { route: payload.link } : {}),
  }

  await Promise.allSettled(
    tokens.map(({ token }) =>
      sendPushNotification(token, payload.title, payload.message, pushData).catch((err) => {
        fastify.log.warn({ token, err: err?.message }, '[notify] Push falhou para token')
      })
    )
  )
}
```

**Depois, substituir todas as chamadas `fastify.supabase.from('notifications').insert({...})` pela função `notifyUser()` nos seguintes arquivos:**

- `api/src/services/payment-reconciliation.ts` (notificação de novo pedido ao reader)
- `api/src/routes/delivery/index.ts` (notificação de leitura entregue ao cliente)
- `api/src/routes/orders/index.ts` (notificação de pedido cancelado ao cliente, disputa ao admin)
- `api/src/crons/complete-orders.ts` (notificação de pedido completado ao reader e ao cliente)
- `api/src/crons/release-hold.ts` (notificação de saldo liberado ao reader)
- `api/src/crons/late-deliveries.ts` (notificação de atraso ao reader e ao cliente)

Exemplo de substituição em `payment-reconciliation.ts`:
```typescript
// ANTES:
await fastify.supabase.from('notifications').insert({
  user_id: order.reader_id,
  type: 'ORDER_NEW',
  title: 'Novo pedido recebido! 🎉',
  message: `Você recebeu um pedido de ${(order as any).gigs?.title ?? 'um serviço'}.`,
  link: `/orders/${order.id}`,
})

// DEPOIS:
import { notifyUser } from './notify.js'
await notifyUser(fastify, order.reader_id, {
  type: 'ORDER_NEW',
  title: 'Novo pedido recebido! 🎉',
  message: `Você recebeu um pedido de ${(order as any).gigs?.title ?? 'um serviço'}.`,
  link: `/orders/${order.id}`,
})
```

---

### Fix 3 — Tornar validação do webhook Asaas obrigatória

**Arquivo:** `api/src/routes/webhooks/asaas.ts`

```typescript
// ANTES:
const token = request.headers['asaas-access-token'] as string
if (process.env.ASAAS_WEBHOOK_TOKEN && token !== process.env.ASAAS_WEBHOOK_TOKEN) {
  request.log.warn('[webhook:asaas] Token invalido')
  return reply.status(401).send({ error: 'Unauthorized' })
}

// DEPOIS:
const token = request.headers['asaas-access-token'] as string
const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN
if (!expectedToken || token !== expectedToken) {
  request.log.warn('[webhook:asaas] Token invalido ou ASAAS_WEBHOOK_TOKEN nao configurado')
  return reply.status(401).send({ error: 'Unauthorized' })
}
```

Garantir que `ASAAS_WEBHOOK_TOKEN` está configurado no `.env` de produção com o valor exato definido no painel do Asaas.

---

## SPRINT 2 — Segurança e Cadastro

### Fix 4 — Tratar erro de CPF/telefone no cadastro de cliente

**Arquivo:** `app/lib/features/auth/register_client_screen.dart`

No método `_register()`, substituir o bloco de patch silencioso:

```dart
// ANTES:
try {
  await api.patch('/me', data: {
    'tax_id': _cpfCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''),
    'cellphone': _phoneCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''),
  });
} catch (_) {
  // Non-critical — continua mesmo se patch falhar
}
if (!mounted) return;
context.go('/home');

// DEPOIS:
bool profileSaved = false;
try {
  await api.patch('/me', data: {
    'tax_id': _cpfCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''),
    'cellphone': _phoneCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''),
  });
  profileSaved = true;
} catch (e) {
  debugPrint('[Register] Falha ao salvar CPF/telefone: $e');
  // Salvar dados pendentes para retry
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('pending_tax_id', _cpfCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''));
  await prefs.setString('pending_cellphone', _phoneCtrl.text.trim().replaceAll(RegExp(r'[^0-9]'), ''));
}
if (!mounted) return;
if (!profileSaved) {
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Conta criada! Complete seu perfil antes de comprar.'),
      duration: Duration(seconds: 4),
    ),
  );
}
context.go('/home');
```

Adicionar import no topo se não existir:
```dart
import 'package:shared_preferences/shared_preferences.dart';
```

**Também verificar no início do checkout** (`checkout_screen.dart`) se CPF/telefone estão salvos localmente como pendentes e tentar reenviar antes de prosseguir.

---

### Fix 5 — Salvar dados do cartomante localmente se email confirmation ativo

**Arquivo:** `app/lib/features/auth/register_reader_screen.dart`

No método `_finish()`, no bloco `else` (quando não há sessão imediata):

```dart
// ANTES:
} else {
  // Confirmação de email ativada no Supabase — perfil será preenchido após confirmação.
  if (!mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Conta criada! Confirme seu email para continuar.'),
      duration: Duration(seconds: 5),
    ),
  );
  context.go('/login');
}

// DEPOIS:
} else {
  // Confirmação de email ativada — salvar dados do perfil localmente
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('pending_reader_bio', _bioCtrl.text.trim());
  await prefs.setString('pending_reader_tagline', _taglineCtrl.text.trim());
  await prefs.setInt('pending_reader_experience', int.tryParse(_experienceCtrl.text) ?? 0);
  await prefs.setStringList('pending_reader_specialties', _selectedSpecialties.toList());
  await prefs.setString('pending_reader_pix_key_type', _pixKeyType);
  await prefs.setString('pending_reader_pix_key', _pixKeyCtrl.text.trim());
  await prefs.setString('pending_reader_tax_id', _cpfCtrl.text.replaceAll(RegExp(r'[^0-9]'), ''));
  await prefs.setString('pending_reader_cellphone', _phoneCtrl.text.replaceAll(RegExp(r'[^0-9]'), ''));
  if (!mounted) return;
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(
      content: Text('Conta criada! Confirme seu email e faça login para continuar.'),
      duration: Duration(seconds: 5),
    ),
  );
  context.go('/login');
}
```

**Na tela de login** (`login_screen.dart`), após login bem-sucedido e antes de `context.go(...)`, verificar se existem dados pendentes de perfil de reader e enviá-los via PATCH /me.

---

### Fix 6 — Tornar leituras privadas no Supabase Storage

**Arquivo:** `api/src/routes/delivery/index.ts`

Substituir a geração de URL pública por URL assinada com expiração:

```typescript
// ANTES:
const { data: urlData } = fastify.supabase.storage
  .from('readings')
  .getPublicUrl(fileName)

return reply.status(201).send({
  data: { url: urlData.publicUrl, file_name: fileName },
})

// DEPOIS:
const { data: signedData, error: signedError } = await fastify.supabase.storage
  .from('readings')
  .createSignedUrl(fileName, 3600) // válida por 1 hora

if (signedError || !signedData) {
  return reply.status(500).send({ error: 'Erro ao gerar URL do arquivo' })
}

return reply.status(201).send({
  data: { url: signedData.signedUrl, file_name: fileName },
})
```

**No endpoint de detalhe do pedido** (`GET /orders/:id`), quando `delivery_content` tiver URLs, regenerar URLs assinadas antes de retornar ao cliente.

**No Supabase Dashboard:** acessar Storage → Buckets → `readings` → desativar "Public bucket" e configurar as políticas RLS para permitir acesso apenas ao `client_id` e `reader_id` do pedido correspondente.

---

### Fix 7 — Adicionar tela de recuperação de senha

**Criar arquivo:** `app/lib/features/auth/forgot_password_screen.dart`

```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/app_button.dart';
import '../../shared/widgets/app_text_field.dart';
import '../../shared/widgets/gradient_background.dart';

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  bool _loading = false;
  bool _sent = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) return;
    setState(() => _loading = true);
    try {
      await Supabase.instance.client.auth.resetPasswordForEmail(email);
      if (!mounted) return;
      setState(() { _sent = true; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Erro ao enviar email. Tente novamente.'), backgroundColor: AppColors.error),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GradientBackground(
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
                  onPressed: () => context.go('/login'),
                ),
                const SizedBox(height: 24),
                const Text('Recuperar senha', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                const SizedBox(height: 8),
                const Text('Enviaremos um link para redefinir sua senha.', style: TextStyle(color: AppColors.textSecondary)),
                const SizedBox(height: 32),
                if (_sent) ...[
                  const Icon(Icons.check_circle, color: Colors.green, size: 48),
                  const SizedBox(height: 16),
                  const Text('Email enviado! Verifique sua caixa de entrada.', style: TextStyle(color: AppColors.textPrimary, fontSize: 16)),
                  const SizedBox(height: 24),
                  AppButton(label: 'Voltar ao login', onPressed: () => context.go('/login')),
                ] else ...[
                  AppTextField(controller: _emailCtrl, label: 'Email', keyboardType: TextInputType.emailAddress),
                  const SizedBox(height: 24),
                  AppButton(label: _loading ? 'Enviando...' : 'Enviar link', onPressed: _loading ? null : _send),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

**Registrar a rota** em `app/lib/app/router/app_router.dart`:
```dart
GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
```

**Adicionar link** na tela de login (`login_screen.dart`), abaixo do botão de login:
```dart
TextButton(
  onPressed: () => context.go('/forgot-password'),
  child: const Text('Esqueci minha senha', style: TextStyle(color: AppColors.primaryLight)),
),
```

---

### Fix 8 — Corrigir fraud check para pedido ativo (não apenas últimas 24h)

**Arquivo:** `api/src/services/fraud.ts`

Substituir o bloco de verificação de gig duplicado:

```typescript
// ANTES:
const { count: sameGigCount } = await supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', params.clientId)
  .eq('gig_id', params.gigId)
  .gte('created_at', oneDayAgo)
  .neq('status', 'CANCELED')

if ((sameGigCount ?? 0) >= 1) {
  return {
    allowed: false,
    reason: 'Voce ja possui um pedido recente deste servico.',
    flags: ['duplicate_gig'],
  }
}

// DEPOIS:
const { count: activeGigCount } = await supabase
  .from('orders')
  .select('id', { count: 'exact', head: true })
  .eq('client_id', params.clientId)
  .eq('gig_id', params.gigId)
  .in('status', ['PENDING_PAYMENT', 'PAID', 'DELIVERED'])

if ((activeGigCount ?? 0) >= 1) {
  return {
    allowed: false,
    reason: 'Voce ja possui um pedido ativo deste servico. Aguarde a conclusao antes de comprar novamente.',
    flags: ['active_duplicate_gig'],
  }
}
```

---

## SPRINT 3 — UX e Produto

### Fix 9 — Permitir que cliente cancele pedido dentro de janela de 2h

**Arquivo:** `api/src/routes/orders/index.ts`

Modificar a rota `POST /orders/:id/cancel` para permitir cancelamento pelo cliente dentro de 2h do pagamento:

```typescript
// ANTES:
if (order.reader_id !== userId && role !== 'ADMIN') {
  return reply.status(403).send({ error: 'Sem permissao para cancelar este pedido' })
}

if (order.status !== 'PAID') {
  return reply.status(400).send({ error: 'Apenas pedidos pagos podem ser cancelados' })
}

// DEPOIS:
const isReader = order.reader_id === userId
const isClient = order.client_id === userId
const isAdmin = role === 'ADMIN'

if (!isReader && !isClient && !isAdmin) {
  return reply.status(403).send({ error: 'Sem permissao para cancelar este pedido' })
}

if (order.status !== 'PAID') {
  return reply.status(400).send({ error: 'Apenas pedidos pagos podem ser cancelados' })
}

// Cliente só pode cancelar dentro de 2h e se entrega não foi iniciada
if (isClient && !isAdmin) {
  const paidAt = new Date(order.created_at)
  const hoursElapsed = (Date.now() - paidAt.getTime()) / (1000 * 60 * 60)
  if (hoursElapsed > 2) {
    return reply.status(400).send({
      error: 'O prazo de cancelamento (2h após o pagamento) expirou. Use a opção de disputa se necessário.',
    })
  }
}
```

**Também adicionar botão de cancelamento** na tela `app/lib/features/orders/client_order_detail_screen.dart` visível apenas para pedidos PAID dentro das primeiras 2h.

---

### Fix 10 — Corrigir N+1 de autenticação: cache de perfil por request

**Arquivo:** `api/src/plugins/auth.ts`

Adicionar cache simples em memória com TTL de 60s para evitar busca de perfil em toda requisição:

```typescript
// Adicionar antes da declaração do plugin:
const profileCache = new Map<string, { profile: any; expiresAt: number }>()

const CACHE_TTL_MS = 60_000 // 60 segundos

function getCachedProfile(userId: string) {
  const entry = profileCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    profileCache.delete(userId)
    return null
  }
  return entry.profile
}

function setCachedProfile(userId: string, profile: any) {
  profileCache.set(userId, { profile, expiresAt: Date.now() + CACHE_TTL_MS })
}

// No hook authenticate, substituir:
// ANTES:
const { data: profile, error: profileError } = await fastify.supabase
  .from('profiles')
  .select('id, role, verification_status')
  .eq('id', user.id)
  .single()

// DEPOIS:
let profile = getCachedProfile(user.id)
if (!profile) {
  const { data, error: profileError } = await fastify.supabase
    .from('profiles')
    .select('id, role, verification_status')
    .eq('id', user.id)
    .single()
  if (profileError || !data) {
    // ... erro handling igual ao existente
  }
  profile = data
  setCachedProfile(user.id, profile)
}
```

---

### Fix 11 — Corrigir lógica de hold: não liberar saldo de pedido não entregue

**Arquivo:** `api/src/crons/release-hold.ts`

Adicionar filtro para não liberar transactions de pedidos ainda em status PAID (não entregues):

```typescript
// ANTES:
const { data: transactions, error } = await fastify.supabase
  .from('transactions')
  .select('id, wallet_id, amount, order_id, orders!inner(disputed_at, has_dispute)')
  .eq('type', 'SALE_CREDIT')
  .eq('status', 'PENDING')
  .eq('orders.has_dispute', false)
  .lt('created_at', cutoff.toISOString())

// DEPOIS:
const { data: transactions, error } = await fastify.supabase
  .from('transactions')
  .select('id, wallet_id, amount, order_id, orders!inner(disputed_at, has_dispute, status)')
  .eq('type', 'SALE_CREDIT')
  .eq('status', 'PENDING')
  .eq('orders.has_dispute', false)
  .in('orders.status', ['DELIVERED', 'COMPLETED']) // só libera se entregue
  .lt('created_at', cutoff.toISOString())
```

E no filtro em memória `releasable`, adicionar:
```typescript
const releasable = transactions.filter((t) => {
  const order = (t as any).orders
  return !order?.disputed_at && !order?.has_dispute && ['DELIVERED', 'COMPLETED'].includes(order?.status)
})
```

---

### Fix 12 — Adicionar tratamento de chargeback perdido no saldo

**Arquivo:** `api/src/routes/webhooks/asaas.ts`

No bloco `CHARGEBACK_DONE` com `chargebackStatus === 'DISPUTE_LOST'`, adicionar registro financeiro:

```typescript
} else if (chargebackStatus === 'DISPUTE_LOST') {
  await fastify.supabase
    .from('transactions')
    .update({ status: 'FAILED' })
    .eq('order_id', order.id)
    .eq('type', 'SALE_CREDIT')
    .eq('status', 'PENDING')

  // Registrar débito de chargeback na carteira da plataforma (auditoria)
  const { data: orderData } = await fastify.supabase
    .from('orders')
    .select('amount_total, reader_id')
    .eq('id', order.id)
    .single()

  if (orderData) {
    // Buscar ou criar wallet da plataforma (user_id = null ou ID fixo de conta admin)
    // Por ora: registrar como log estruturado para controle manual
    request.log.error({
      orderId: order.id,
      paymentId,
      amountLost: orderData.amount_total,
      readerId: orderData.reader_id,
    }, '[chargeback] PREJUIZO: chargeback perdido — requer revisao manual')

    // TODO: implementar conta de reserva da plataforma e debitar automaticamente
    await fastify.supabase.from('notifications').insert({
      user_id: orderData.reader_id, // notificar admin — substituir por ID real do admin
      type: 'SYSTEM',
      title: 'Chargeback perdido',
      message: `Pedido ${order.id} — chargeback de R$${(orderData.amount_total / 100).toFixed(2)} foi perdido.`,
      link: `/admin/orders/${order.id}`,
    })
  }
}
```

---

## SPRINT 4 — Performance e Crescimento

### Fix 13 — Migrar API do Vercel para Railway

O projeto já possui `Dockerfile` correto em `api/Dockerfile`. Passos:

1. Criar conta em [railway.app](https://railway.app)
2. New Project → Deploy from GitHub Repo → selecionar `isidis-monorepo`
3. Configurar Root Directory: `api`
4. Configurar as variáveis de ambiente (copiar do Vercel ou do `.env` local):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ASAAS_API_KEY`
   - `ASAAS_ENV` (sandbox ou production)
   - `ASAAS_WEBHOOK_TOKEN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `JWT_SECRET`
   - `CRON_SECRET`
   - `APP_URL`
5. Deploy → aguardar build
6. Atualizar `app/lib/core/config/app_env.dart` com a URL do Railway
7. Configurar crons no Railway Scheduler ou em [cron-job.org](https://cron-job.org) (gratuito):
   - `/cron/expire-orders` → a cada 15 min
   - `/cron/complete-orders` → a cada hora
   - `/cron/release-hold` → a cada hora
   - `/cron/late-deliveries` → a cada hora
   - `/cron/reader-quality` → diariamente às 03:00
   - `/cron/rank-readers` → a cada 6 horas
   - `/cron/suggest-gigs` → às 09:00 e 19:00 (horário de Brasília)
8. Testar todos os endpoints antes de remover do Vercel

---

### Fix 14 — Configurar monitoramento de uptime

1. Criar conta gratuita em [uptimerobot.com](https://uptimerobot.com)
2. Adicionar monitor HTTP(S) para `GET {API_URL}/health`
3. Intervalo: 1 minuto
4. Alertas: email + Telegram (se aplicável)

Instalar Sentry no backend:
```bash
cd api && npm install @sentry/node
```

Em `api/src/server.ts`, inicializar antes de qualquer coisa:
```typescript
import * as Sentry from '@sentry/node'
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
```

Instalar Sentry no Flutter:
```yaml
# pubspec.yaml
sentry_flutter: ^8.0.0
```

Em `app/lib/main.dart`:
```dart
import 'package:sentry_flutter/sentry_flutter.dart';

await SentryFlutter.init(
  (options) {
    options.dsn = 'YOUR_SENTRY_DSN';
    options.environment = kDebugMode ? 'development' : 'production';
    options.tracesSampleRate = 0.1;
  },
  appRunner: () => bootstrap(),
);
```

---

### Fix 15 — Adicionar busca e filtro no marketplace

**Arquivo:** `api/src/routes/readers/index.ts`

No endpoint `GET /readers`, adicionar suporte a query params de filtro:

```typescript
// Adicionar ao schema de listagem:
const listReadersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  specialty: z.string().optional(),    // filtro por especialidade
  min_rating: z.coerce.number().optional(), // avaliação mínima
  max_price: z.coerce.number().optional(),  // preço máximo do gig em centavos
  search: z.string().optional(),           // busca por nome ou tagline
})

// Na query, adicionar condicionalmente:
if (filters.specialty) {
  query = query.contains('specialties', [filters.specialty])
}
if (filters.min_rating) {
  query = query.gte('rating_average', filters.min_rating)
}
if (filters.search) {
  query = query.or(`full_name.ilike.%${filters.search}%,tagline.ilike.%${filters.search}%`)
}
```

**No app Flutter**, adicionar barra de busca e chips de filtro na tela `readers_list_screen.dart`.

---

### Fix 16 — Exportação de extrato financeiro para cartomantes

**Criar arquivo:** `api/src/routes/wallet/statement.ts` (ou adicionar ao wallet/index.ts)

```typescript
// GET /wallet/statement?month=2026-04 — extrato em CSV
fastify.get(
  '/wallet/statement',
  { preHandler: [(fastify as any).requireReader] },
  async (request, reply) => {
    const q = request.query as { month?: string }
    const month = q.month ?? new Date().toISOString().slice(0, 7) // YYYY-MM

    const startDate = `${month}-01T00:00:00.000Z`
    const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString()

    const { data: wallet } = await fastify.supabase
      .from('wallets').select('id').eq('user_id', request.user.id).single()

    if (!wallet) return reply.status(404).send({ error: 'Carteira não encontrada' })

    const { data: transactions } = await fastify.supabase
      .from('transactions')
      .select('id, amount, type, status, created_at, orders(id, gigs(title))')
      .eq('wallet_id', wallet.id)
      .gte('created_at', startDate)
      .lt('created_at', endDate)
      .order('created_at', { ascending: true })

    const rows = [
      'Data,Tipo,Serviço,Valor (R$),Status',
      ...(transactions ?? []).map((tx: any) => {
        const date = new Date(tx.created_at).toLocaleDateString('pt-BR')
        const type = tx.type === 'SALE_CREDIT' ? 'Venda' : tx.type === 'WITHDRAWAL' ? 'Saque' : tx.type
        const title = tx.orders?.gigs?.title ?? '-'
        const amount = (tx.amount / 100).toFixed(2).replace('.', ',')
        const status = tx.status === 'COMPLETED' ? 'Concluído' : tx.status === 'PENDING' ? 'Pendente' : tx.status
        return `${date},${type},"${title}",${amount},${status}`
      }),
    ].join('\n')

    reply.header('Content-Type', 'text/csv; charset=utf-8')
    reply.header('Content-Disposition', `attachment; filename="extrato-isidis-${month}.csv"`)
    return reply.send('\uFEFF' + rows) // BOM para Excel abrir corretamente
  }
)
```

---

## Variáveis de Ambiente — Checklist

Garantir que **todas** as variáveis abaixo estão configuradas em produção:

```env
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Asaas
ASAAS_API_KEY=
ASAAS_ENV=production
ASAAS_WEBHOOK_TOKEN=          # OBRIGATÓRIO — configurar no painel Asaas e aqui
ASAAS_CARD_FEE_PERCENT=0.0349
ASAAS_CARD_FEE_FIXED=39

# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=         # manter \n literal — o código já substitui por quebra de linha

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@isidis.com.br

# App
JWT_SECRET=
CRON_SECRET=                  # secret para proteger os endpoints /cron/*
APP_URL=https://isidis.com.br

# Monitoramento (opcional mas recomendado)
SENTRY_DSN=
NODE_ENV=production
```

---

## Ordem de Execução Recomendada

```
Sprint 1 (1-2 dias):   Fix 1, Fix 2, Fix 3 + ativar ASAAS_WEBHOOK_TOKEN em prod
Sprint 2 (3-4 dias):   Fix 4, Fix 5, Fix 6, Fix 7, Fix 8
Sprint 3 (3-5 dias):   Fix 9, Fix 10, Fix 11, Fix 12 + Fix 13 (migração Railway)
Sprint 4 (5-7 dias):   Fix 14, Fix 15, Fix 16
```

Após cada sprint, fazer build do app Flutter para web e mobile e testar os fluxos principais: cadastro → checkout PIX → recebimento do push → entrega → avaliação.
