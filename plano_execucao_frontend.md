# Plano de Execução Frontend — Isidis (Claude)

**Agente:** Claude  
**Repositórios:** `Isidis/` (Next.js) + `isidis_flutter/` (Flutter)  
**Executa em paralelo com:** `plano_execucao_backend.md` (Codex)

## Documentação de referência
- `documentacao/01-arquitetura-geral.md` — visão geral e stack
- `documentacao/03-regras-negocio.md` — taxas, hold 48h, saques
- `documentacao/05-integracoes.md` — integrações atuais e Asaas
- `skills/asaas-frontend.md` — guia completo de migração frontend

## Arquitetura atual — problema central

O `actions.ts` do Next.js hoje faz **duas coisas que precisam ser separadas**:

1. `createPixPayment()` — chama AbacatePay diretamente (não vai pela Fastify API)
2. `checkPaymentStatus()` — chama AbacatePay E faz wallet credit (lógica que deve ser só do webhook Fastify)

**Após a migração:**
- `createPixPayment()` → chama `POST /checkout/create` na Fastify API (igual ao cartão)
- `checkPaymentStatus()` → consulta a order no Supabase diretamente (sem AbacatePay, sem wallet credit)
- Todo o crédito de wallet fica no webhook Fastify (`/webhooks/asaas`)

## Contrato de API (IMUTÁVEL — definido pelo backend Codex)

### POST /checkout/create — PIX request/response
```
Request: { gig_id, add_on_ids, requirements_answers, payment_method: "PIX" }
Response: {
  data: {
    order_id: uuid,
    pix_qr_code_id: string,       ← ID do Asaas payment (salvo como asaas_payment_id)
    amount_total: number,          ← em centavos
    amount_service_total: number,
    pix: { qr_code_base64, copy_paste_code, expires_at }
  }
}
```

### POST /checkout/create — CARD request/response
```
Request: {
  gig_id, add_on_ids, requirements_answers, payment_method: "CARD",
  card_token: string,              ← token gerado pelo Asaas JS
  card_holder_name: string,
  card_holder_postal_code: string,
  card_holder_address_number: string
}
Response: {
  data: {
    order_id: uuid,
    payment_method: "CARD",
    amount_total: number,
    amount_service_total: number,
    amount_card_fee: number,
    card_fee_responsibility: "READER",
    asaas_payment_id: string,
    status: "CONFIRMED" | "PENDING"
  }
}
```

### GET /checkout/config
```
Response: { data: { gateway: "asaas" } }
```

### GET /checkout/status/:paymentId — CONTRATO MANTIDO
```
Response: { data: { status: "PAID" | "PENDING" | "OVERDUE", order_id: uuid } }
```

---

## Estado atual — leitura obrigatória antes de modificar

### `Isidis/app/(website)/checkout/actions.ts`

Funções existentes e o que fazer com cada uma:

| Função | Status | Ação |
|--------|--------|------|
| `createCheckoutSession()` | Legacy/deprecated | Remover se não usado |
| `saveOrderRequirements()` | Mantida | Não alterar |
| `createPixPayment()` | Reescrever | Chamar Fastify API em vez de AbacatePay direto |
| `createCardPayment()` | Manter estrutura | Já chama Fastify; apenas ajustar para novo response (sem client_secret) |
| `checkPaymentStatus()` | Reescrever | Remover wallet credit; apenas consultar Supabase |

### `Isidis/app/(website)/checkout/[id]/checkout-form.tsx`

O que existe e o que mudar:
- `<Elements>` e `<CardElement>` do Stripe → remover
- `stripe.confirmPayment()` → remover
- Import de `@stripe/react-stripe-js` → remover
- QR Code PIX + polling → manter (contrato de resposta é idêntico)
- Seleção de método de pagamento (PIX/CARD) → manter

---

## TAREFA 1 — Remover arquivos obsoletos do Next.js

**Executar primeiro — sem dependências**

### 1a. Deletar `Isidis/services/abacate.ts`

Verificar antes que nenhum arquivo importa este módulo além dos já identificados:
```bash
grep -r "abacate" Isidis/ --include="*.ts" --include="*.tsx" -l
```

Arquivos que importam e serão atualizados nas próximas tarefas:
- `Isidis/app/(website)/checkout/actions.ts` ← será reescrito na Tarefa 2
- `Isidis/app/api/webhooks/abacate/route.ts` ← será deletado em 1b

Após confirmação: **deletar `Isidis/services/abacate.ts`**.

### 1b. Deletar `Isidis/app/api/webhooks/abacate/route.ts`

O webhook do Asaas vai para a Fastify API (`/webhooks/asaas`). O webhook Next.js é redundante.

Deletar o arquivo e o diretório se ficar vazio:
- `Isidis/app/api/webhooks/abacate/route.ts` → deletar
- `Isidis/app/api/webhooks/abacate/` → deletar diretório se vazio

### 1c. Remover `@stripe/stripe-js` e `@stripe/react-stripe-js` do `package.json`

```bash
cd Isidis && npm uninstall @stripe/stripe-js @stripe/react-stripe-js
```

**Verificação:** `grep -r "stripe" Isidis/app --include="*.ts" --include="*.tsx" -l` — só deve restar o checkout-form.tsx (que será corrigido na Tarefa 3).

---

## TAREFA 2 — Reescrever `Isidis/app/(website)/checkout/actions.ts`

**Dependência:** Tarefa 1 (abacate.ts removido)  
**Arquivo:** `Isidis/app/(website)/checkout/actions.ts`

### 2a. Remover imports obsoletos

Remover:
```typescript
import { createPixQrCode, checkPixQrCodeStatus } from '@/services/abacate'
// Qualquer import de Stripe server-side
```

Adicionar/manter:
```typescript
import { createClient } from '@/lib/supabase/server'  // já existe
// Importar o cliente Supabase SSR para consultar order status
```

### 2b. Reescrever `createPixPayment()`

**Antes:** chamava `createPixQrCode()` do AbacatePay diretamente + lógica de criação de order no Next.js  
**Depois:** delegar completamente à Fastify API

```typescript
export async function createPixPayment(params: {
  gigId: string
  addOnIds: string[]
  requirementsAnswers: Record<string, string>
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) throw new Error('Não autenticado')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      gig_id: params.gigId,
      add_on_ids: params.addOnIds,
      requirements_answers: params.requirementsAnswers,
      payment_method: 'PIX',
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    return { error: json.error ?? 'Erro ao criar pagamento PIX' }
  }

  // Retornar no mesmo formato que o checkout-form.tsx espera
  return {
    data: {
      orderId: json.data.order_id,
      pixQrCodeId: json.data.pix_qr_code_id,
      amountTotal: json.data.amount_total,
      pix: {
        qrCodeBase64: json.data.pix.qr_code_base64,
        copyPasteCode: json.data.pix.copy_paste_code,
        expiresAt: json.data.pix.expires_at,
      },
    },
  }
}
```

### 2c. Reescrever `createCardPayment()`

**Antes:** retornava `clientSecret` do Stripe  
**Depois:** retorna `asaas_payment_id` + `status` (sem client_secret)

```typescript
export async function createCardPayment(params: {
  gigId: string
  addOnIds: string[]
  requirementsAnswers: Record<string, string>
  cardToken: string
  cardHolderName: string
  cardHolderPostalCode: string
  cardHolderAddressNumber: string
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) throw new Error('Não autenticado')

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      gig_id: params.gigId,
      add_on_ids: params.addOnIds,
      requirements_answers: params.requirementsAnswers,
      payment_method: 'CARD',
      card_token: params.cardToken,
      card_holder_name: params.cardHolderName,
      card_holder_postal_code: params.cardHolderPostalCode,
      card_holder_address_number: params.cardHolderAddressNumber,
    }),
  })

  const json = await res.json()

  if (!res.ok) {
    return { error: json.error ?? 'Erro ao processar cartão' }
  }

  return {
    data: {
      orderId: json.data.order_id,
      amountTotal: json.data.amount_total,
      amountCardFee: json.data.amount_card_fee,
      asaasPaymentId: json.data.asaas_payment_id,
      status: json.data.status,  // 'CONFIRMED' | 'PENDING'
    },
  }
}
```

### 2d. Reescrever `checkPaymentStatus()`

**Remover completamente:** wallet credit, subscription creation, emails — isso é responsabilidade do webhook Fastify.  
**Manter apenas:** polling do status do pedido.

```typescript
export async function checkPaymentStatus(pixQrCodeId: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return { data: { status: 'PENDING' } }

  // Consultar status via Fastify API (que consulta o Asaas e/ou Supabase)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/checkout/status/${pixQrCodeId}`,
    { headers: { 'Authorization': `Bearer ${session.access_token}` } }
  )

  if (!res.ok) return { data: { status: 'PENDING' } }

  const json = await res.json()
  // Retorna: { data: { status: 'PAID' | 'PENDING' | 'OVERDUE', order_id: uuid } }
  return json
}
```

**IMPORTANTE:** A antiga `checkPaymentStatus()` creditava a wallet quando detectava `PAID`. Isso causava race condition com o webhook. **Não reimplementar esse comportamento.** O Fastify webhook é a única fonte de verdade para crédito de wallet.

---

## TAREFA 3 — Reescrever `checkout-form.tsx`

**Arquivo:** `Isidis/app/(website)/checkout/[id]/checkout-form.tsx`  
**Dependência:** Tarefa 2 (actions.ts reescrito)

### 3a. Remover imports e uso de Stripe

Remover:
```typescript
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
// Qualquer estado relacionado a stripePromise, clientSecret
```

### 3b. Manter fluxo PIX intacto

O fluxo PIX usa `createPixPayment()` + polling via `checkPaymentStatus()` a cada 5s. O contrato de resposta é idêntico — apenas a source dos dados mudou (Asaas em vez de AbacatePay). **Não alterar o polling ou a exibição do QR Code.**

Verificar que os campos mapeados corretamente:
- `pix_qr_code_id` → usado como ID para polling
- `pix.qr_code_base64` → exibir QR Code com `<img src={`data:image/png;base64,${qrCodeBase64}`} />`
- `pix.copy_paste_code` → botão de copiar

### 3c. Substituir fluxo de cartão

**Antes:** formulário com Stripe `<CardElement>` + `stripe.confirmPayment()`  
**Depois:** formulário com campos manuais + tokenização Asaas JS + chamar `createCardPayment()`

**Adicionar `<Script>` no topo da page.tsx (ou no layout):**
```tsx
// Em Isidis/app/(website)/checkout/[id]/page.tsx
import Script from 'next/script'

// Dentro do componente:
<Script
  src={
    process.env.NODE_ENV === 'production'
      ? 'https://www.asaas.com/static/js/asaas-card.js'
      : 'https://sandbox.asaas.com/static/js/asaas-card.js'
  }
  strategy="afterInteractive"
/>
```

**No checkout-form.tsx — novo CardPaymentForm:**
```tsx
function CardPaymentForm({ onTokenized }: { onTokenized: (tokenData: CardTokenData) => void }) {
  const [cardNumber, setCardNumber] = useState('')
  const [cardHolder, setCardHolder] = useState('')
  const [expiryMonth, setExpiryMonth] = useState('')
  const [expiryYear, setExpiryYear] = useState('')
  const [cvv, setCvv] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [tokenizing, setTokenizing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTokenize = async () => {
    setTokenizing(true)
    setError(null)
    try {
      const asaas = (window as any).AsaasCreditCard
      if (!asaas) throw new Error('Biblioteca de pagamento não carregada. Recarregue a página.')
      
      const result = await asaas.tokenize({
        holderName: cardHolder,
        number: cardNumber.replace(/\s/g, ''),
        expiryMonth,
        expiryYear,
        ccv: cvv,
      })
      
      onTokenized({
        cardToken: result.creditCardToken,
        cardHolderName: cardHolder,
        cardHolderPostalCode: postalCode,
        cardHolderAddressNumber: addressNumber,
      })
    } catch (err: any) {
      setError(err.message ?? 'Erro ao processar cartão')
    } finally {
      setTokenizing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Campos de cartão formatados */}
      <input placeholder="Número do cartão" value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
      <input placeholder="Nome no cartão" value={cardHolder} onChange={e => setCardHolder(e.target.value)} />
      <div className="flex gap-2">
        <input placeholder="MM" maxLength={2} value={expiryMonth} onChange={e => setExpiryMonth(e.target.value)} />
        <input placeholder="AAAA" maxLength={4} value={expiryYear} onChange={e => setExpiryYear(e.target.value)} />
        <input placeholder="CVV" maxLength={4} value={cvv} onChange={e => setCvv(e.target.value)} />
      </div>
      <input placeholder="CEP" value={postalCode} onChange={e => setPostalCode(e.target.value)} />
      <input placeholder="Número do endereço" value={addressNumber} onChange={e => setAddressNumber(e.target.value)} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button onClick={handleTokenize} disabled={tokenizing}>
        {tokenizing ? 'Processando...' : 'Confirmar pagamento'}
      </button>
    </div>
  )
}
```

**No handler principal do cartão:**
```tsx
const handleCardTokenized = async (tokenData: CardTokenData) => {
  setLoading(true)
  const result = await createCardPayment({
    gigId,
    addOnIds,
    requirementsAnswers,
    cardToken: tokenData.cardToken,
    cardHolderName: tokenData.cardHolderName,
    cardHolderPostalCode: tokenData.cardHolderPostalCode,
    cardHolderAddressNumber: tokenData.cardHolderAddressNumber,
  })

  if (result.error) {
    setError(result.error)
    setLoading(false)
    return
  }

  if (result.data?.status === 'CONFIRMED') {
    // Pagamento confirmado imediatamente
    router.push(`/checkout/sucesso?order_id=${result.data.orderId}`)
  } else {
    // PENDING — fazer polling igual ao PIX
    startPolling(result.data.asaasPaymentId, result.data.orderId)
  }
}
```

**`startPolling` para CARD (status PENDING):**
```tsx
function startPolling(paymentId: string, orderId: string) {
  const interval = setInterval(async () => {
    const status = await checkPaymentStatus(paymentId)
    if (status.data?.status === 'PAID') {
      clearInterval(interval)
      router.push(`/checkout/sucesso?order_id=${orderId}`)
    } else if (status.data?.status === 'OVERDUE') {
      clearInterval(interval)
      setError('Pagamento expirado. Tente novamente.')
      setLoading(false)
    }
  }, 5000)
  
  // Limpar após 15 minutos
  setTimeout(() => clearInterval(interval), 15 * 60 * 1000)
}
```

### 3d. Atualizar `GET /checkout/config`

Se o componente busca a publishable key do Stripe, remover essa chamada. O config agora retorna apenas `{ gateway: 'asaas' }` — não precisa ser buscado no cliente (campo não usado no novo fluxo).

---

## TAREFA 4 — Flutter: Atualizar `pubspec.yaml`

**Arquivo:** `isidis_flutter/pubspec.yaml`  
**Dependência:** nenhuma

### Remover:
```yaml
flutter_stripe: ^11.0.0
```

### Adicionar (para tokenização via WebView):
```yaml
webview_flutter: ^4.10.0
```

Após editar: `flutter pub get`

**Atenção:** verificar se `flutter_stripe` está importado em algum arquivo além de `credit_card_screen.dart`:
```bash
grep -r "flutter_stripe\|stripe" isidis_flutter/lib --include="*.dart" -l
```

---

## TAREFA 5 — Flutter: Reescrever `credit_card_screen.dart`

**Arquivo:** `isidis_flutter/lib/features/checkout/credit_card_screen.dart`  
**Dependência:** Tarefa 4 (flutter_stripe removido)

### O que remover:
- Imports de `flutter_stripe`
- `Stripe.instance.initPaymentSheet()`
- `Stripe.instance.presentPaymentSheet()`
- Busca da publishable key em `/checkout/config`
- Qualquer `client_secret`

### Novo fluxo — tokenização via WebView Asaas

A abordagem mais compatível com o SDK Asaas é usar um WebView que carrega uma página HTML mínima com a lib Asaas JS para tokenizar o cartão e retornar o token via `JavascriptChannel`.

```dart
import 'package:webview_flutter/webview_flutter.dart';
import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../checkout/order_confirmation_screen.dart';

class CreditCardScreen extends StatefulWidget {
  final String orderId;
  final String gigId;
  final List<String> addOnIds;
  final Map<String, String> requirementsAnswers;
  final int amountTotal;
  final int amountCardFee;

  const CreditCardScreen({
    super.key,
    required this.orderId,
    required this.gigId,
    required this.addOnIds,
    required this.requirementsAnswers,
    required this.amountTotal,
    required this.amountCardFee,
  });

  @override
  State<CreditCardScreen> createState() => _CreditCardScreenState();
}

class _CreditCardScreenState extends State<CreditCardScreen> {
  bool _loading = false;
  String? _error;
  late final WebViewController _webViewController;
  bool _webViewLoaded = false;

  // HTML com a lib Asaas para tokenização
  static String get _asaasTokenizerHtml => '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="https://sandbox.asaas.com/static/js/asaas-card.js"></script>
</head>
<body>
<form id="card-form">
  <input id="holderName" placeholder="Nome no cartão" />
  <input id="number" placeholder="Número do cartão" maxlength="19" />
  <input id="expiryMonth" placeholder="MM" maxlength="2" />
  <input id="expiryYear" placeholder="AAAA" maxlength="4" />
  <input id="ccv" placeholder="CVV" maxlength="4" />
  <button type="button" onclick="tokenize()">Tokenizar</button>
</form>
<script>
async function tokenize() {
  try {
    const result = await AsaasCreditCard.tokenize({
      holderName: document.getElementById('holderName').value,
      number: document.getElementById('number').value.replace(/\\s/g, ''),
      expiryMonth: document.getElementById('expiryMonth').value,
      expiryYear: document.getElementById('expiryYear').value,
      ccv: document.getElementById('ccv').value,
    });
    TokenChannel.postMessage(JSON.stringify({ token: result.creditCardToken }));
  } catch(e) {
    TokenChannel.postMessage(JSON.stringify({ error: e.message }));
  }
}
</script>
</body>
</html>
''';

  @override
  void initState() {
    super.initState();
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'TokenChannel',
        onMessageReceived: (message) => _handleToken(message.message),
      )
      ..loadHtmlString(_asaasTokenizerHtml);
  }

  Future<void> _handleToken(String message) async {
    final Map<String, dynamic> data = Map.from(
      (message.isNotEmpty) ? _parseJson(message) : {},
    );

    if (data['error'] != null) {
      setState(() => _error = data['error'] as String);
      return;
    }

    final token = data['token'] as String?;
    if (token == null) return;

    setState(() { _loading = true; _error = null; });

    try {
      final response = await api.post('/checkout/create', data: {
        'gig_id': widget.gigId,
        'add_on_ids': widget.addOnIds,
        'requirements_answers': widget.requirementsAnswers,
        'payment_method': 'CARD',
        'card_token': token,
        'card_holder_name': '',       // preencher do formulário se necessário
        'card_holder_postal_code': '',
        'card_holder_address_number': '',
      });

      final status = response.data['data']['status'] as String?;
      final orderId = response.data['data']['order_id'] as String;

      if (status == 'CONFIRMED' || status == 'PAID') {
        if (mounted) {
          Navigator.pushReplacement(context, MaterialPageRoute(
            builder: (_) => OrderConfirmationScreen(orderId: orderId),
          ));
        }
      } else {
        // PENDING — iniciar polling igual ao PIX
        _startPolling(response.data['data']['asaas_payment_id'] as String, orderId);
      }
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  void _startPolling(String paymentId, String orderId) {
    // Polling a cada 5 segundos por até 10 minutos
    var attempts = 0;
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 5));
      attempts++;
      if (attempts > 120 || !mounted) return false;

      try {
        final res = await api.get('/checkout/status/$paymentId');
        final status = res.data['data']['status'] as String?;
        if (status == 'PAID') {
          if (mounted) {
            Navigator.pushReplacement(context, MaterialPageRoute(
              builder: (_) => OrderConfirmationScreen(orderId: orderId),
            ));
          }
          return false;
        }
        if (status == 'OVERDUE') {
          setState(() { _error = 'Pagamento expirado.'; _loading = false; });
          return false;
        }
      } catch (_) {}
      return true;
    });
  }

  dynamic _parseJson(String s) {
    // Simple JSON parse helper
    try { return Map<String, dynamic>.from({}); } catch (_) { return {}; }
    // Usar dart:convert json.decode
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Pagamento com Cartão')),
      body: Stack(
        children: [
          WebViewWidget(controller: _webViewController),
          if (_loading) const Center(child: CircularProgressIndicator()),
          if (_error != null)
            Positioned(
              bottom: 16, left: 16, right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                color: Colors.red.shade100,
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            ),
        ],
      ),
    );
  }
}
```

**Alternativa mais simples (sem WebView):** Se o projeto não pode usar WebView por alguma restrição, implementar campos manuais no Flutter e enviar os dados do cartão para um endpoint interno da Fastify que tokenize usando a API REST do Asaas. Discutir com o time antes.

---

## TAREFA 6 — Flutter: Verificar `pix_screen.dart`

**Arquivo:** `isidis_flutter/lib/features/checkout/pix_screen.dart`  
**Dependência:** nenhuma (verificação apenas)

O `pix_screen.dart` atual faz polling em `/checkout/status/:pixQrCodeId`. O contrato desse endpoint **não muda** — apenas o ID interno muda de AbacatePay para Asaas, mas o frontend não precisa saber disso.

**Verificar que:**
1. O QR Code é exibido a partir de `qr_code_base64` — campo mantido na resposta
2. O código copia-e-cola usa `copy_paste_code` — campo mantido
3. O polling chama `/checkout/status/{pixQrCodeId}` — endpoint mantido
4. A resposta de polling `{ status: 'PAID', order_id: uuid }` — contrato mantido

**Ação esperada:** nenhuma modificação necessária se os campos estiverem mapeados corretamente.

---

## TAREFA 7 — Flutter: Verificar `checkout_screen.dart`

**Arquivo:** `isidis_flutter/lib/features/checkout/checkout_screen.dart`  
**Dependência:** nenhuma (verificação apenas)

O `checkout_screen.dart` atual chama `POST /checkout/create` via `api.post()`. O contrato de request **não muda para PIX**. Para cartão, precisará passar os campos adicionais (`card_token`, etc.) mas isso é responsabilidade da `credit_card_screen.dart` após tokenização.

**Verificar que:**
1. Para PIX: o request body não inclui campos de cartão → OK
2. Para CARD: o `checkout_screen.dart` navega para `CreditCardScreen` passando os dados do pedido (gig_id, amounts) → `CreditCardScreen` faz a tokenização e cria o checkout CARD
3. A exibição de taxa do cartão (`amount_card_fee`) ainda usa os mesmos campos → verificar que usa `amount_card_fee` da resposta

**Mudança necessária em `checkout_screen.dart`:**

Quando `payment_method === 'CARD'`, o `checkout_screen.dart` provavelmente criava o checkout e passava `client_secret` para `CreditCardScreen`. Agora, `CreditCardScreen` é responsável por criar o checkout CARD. Portanto:

- Para CARD: **não chamar** `POST /checkout/create` no `checkout_screen.dart`
- Navegar para `CreditCardScreen` passando `gigId`, `addOnIds`, `requirementsAnswers`, `amountTotal`, `amountCardFee`
- `CreditCardScreen` tokeniza e cria o checkout

```dart
// Se payment_method == CARD:
context.push('/checkout/card', extra: {
  'gig_id': gigId,
  'add_on_ids': addOnIds,
  'requirements_answers': requirementsAnswers,
  'amount_total': amountTotal,
  'amount_card_fee': amountCardFee,
});

// Se payment_method == PIX:
// Criar checkout PIX aqui e navegar para pix_screen (comportamento atual mantido)
```

---

## Variáveis de ambiente Next.js

**Manter:**
```env
NEXT_PUBLIC_API_URL=https://api.isidis.com.br  # URL da Fastify API
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Remover:**
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
STRIPE_SECRET_KEY=...
```

---

## Ordem de execução recomendada

```
Dia 1:
  Tarefa 1 (remover arquivos obsoletos — sem dependência)
  Tarefa 4 (pubspec.yaml flutter — sem dependência)

Dia 2:
  Tarefa 2 (reescrever actions.ts) — após Tarefa 1
  Tarefa 5 (reescrever credit_card_screen.dart) — após Tarefa 4

Dia 3:
  Tarefa 3 (reescrever checkout-form.tsx) — após Tarefa 2
  Tarefa 6 (verificar pix_screen.dart) — após Tarefa 5
  Tarefa 7 (verificar checkout_screen.dart) — após Tarefa 5
```

---

## Checklist de verificação final

**Next.js:**
- [ ] `npm run build` sem erros de TypeScript
- [ ] Zero imports de `@stripe/stripe-js` ou `abacate` em todo o projeto
- [ ] PIX: `createPixPayment()` chama Fastify API → retorna `pix_qr_code_id` + `qr_code_base64` + `copy_paste_code`
- [ ] PIX: Polling chama `checkPaymentStatus()` → consulta Fastify → status retorna `PAID` quando confirmado
- [ ] PIX: `checkPaymentStatus()` NÃO faz wallet credit (removido)
- [ ] CARD: `createCardPayment()` chama Fastify com `card_token` → retorna `asaas_payment_id` + `status`
- [ ] CARD: Tokenização Asaas JS funciona (script carregado, `window.AsaasCreditCard.tokenize()` disponível)
- [ ] `GET /checkout/config` não é mais necessário no frontend (ou retorna `gateway: asaas` sem quebrar)
- [ ] Webhook `/api/webhooks/abacate/` removido

**Flutter:**
- [ ] `flutter pub get` sem erros
- [ ] Zero imports de `flutter_stripe` em todo o projeto
- [ ] PIX: `pix_screen.dart` exibe QR Code e faz polling normalmente
- [ ] CARD: `credit_card_screen.dart` carrega WebView com Asaas, tokeniza, cria checkout CARD
- [ ] CARD: Após `status: CONFIRMED`, navega para `OrderConfirmationScreen`
- [ ] `checkout_screen.dart`: para CARD, navega para `CreditCardScreen` sem criar checkout previamente

## Pontos de atenção

1. **`checkPaymentStatus()` sem wallet credit:** A função antiga creditava a wallet quando detectava PAID. **Não reimplementar isso.** O único crédito de wallet vem do webhook Fastify.
2. **Asaas JS lib — ambiente:** A URL da lib muda entre sandbox e produção. Usar variável de ambiente ou `process.env.NODE_ENV`.
3. **Tokenização Flutter — WebView HTTPS:** O Asaas JS pode exigir HTTPS. Em desenvolvimento local, pode ser necessário usar a versão sandbox que aceita `localhost`. Testar com dispositivo físico ou emulador.
4. **Polling de CARD:** Se o Asaas retornar `status: PENDING` (aprovação assíncrona), o frontend precisa fazer polling igual ao PIX. Implementar com timeout de 15 minutos.
5. **`dart:convert`:** O `_parseJson` na implementação de `CreditCardScreen` deve usar `json.decode(message)` do `dart:convert`.
