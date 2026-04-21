# PATCH — Checkout Redesign: 3 Passos Mobile First

**Data:** 2026-04-21  
**Status:** Concluído ✅

---

## Problema

O checkout anterior era uma página de 2 colunas (grid) com toda a informação exibida simultaneamente: sidebar com resumo, formulário de perguntas e Brick de pagamento lado a lado. Isso resultava em:
- Sobrecarga visual, especialmente em mobile
- Textos de marketing do Mercado Pago expostos ("PIX com Checkout Bricks", "Ambiente protegido", "Checkout Bricks oficial", etc.)
- Layout inutilizável em tela estreita (< 640px)

---

## Solução: Fluxo em 3 Passos Sequenciais

```
Passo 1 — Resumo do pedido
  Imagem do gig (hero full-width com gradiente overlay)
  Título + "com [Nome]" em secondary
  Descrição (line-clamp-3)
  Grid 2 cols: Entrega + Extras
  Breakdown do preço
  [ Continuar ]

Passo 2 — Perguntas (apenas se requirements.length > 0)
  ← Voltar
  Campos dinâmicos (textarea / select)
  Validação antes de avançar
  [ Continuar para o pagamento ]

Passo 3 — Pagamento
  ← Voltar
  Header compacto: título + total
  Toggle PIX / Cartão (se ambos disponíveis)
  Brick do Mercado Pago diretamente
```

Sem requirements: apenas 2 passos (Resumo → Pagamento).

---

## Mudanças

### `web/src/components/checkout/CheckoutForm.tsx` — REESCRITO

**Novos props:**
```ts
gigTitle: string
gigDescription?: string
gigImageUrl?: string
readerName?: string
readerAvatarUrl?: string
deliveryHours?: number
basePrice: number        // em reais
addOnsTotal?: number     // em reais
```

**Step logic:**
```ts
const steps = requirements.length > 0
  ? ['summary', 'requirements', 'payment'] as const
  : ['summary', 'payment'] as const
const [stepIndex, setStepIndex] = useState(0)
const currentStep = steps[stepIndex]
```

**Progress bar:** 3 barrinhas — `bg-primary` para passos concluídos/atual, `bg-white/10` para futuros.

**Removido completamente:**
- Box "Checkout Bricks oficial do Mercado Pago" com ShieldCheck
- Box "PIX com Checkout Bricks" com lista explicativa
- Box "Pagamento com Cartão via Checkout Pro" com lista explicativa
- Badge "Ambiente protegido"

**Mantido intacto:** toda a lógica de pagamento (`handleBrickSubmit`, `handleCardProSubmit`, polling PIX, copyToClipboard, StatusScreen, QR code).

---

### `web/src/pages/public/Checkout.tsx`

- Removido layout `lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]`
- Removido `<aside>` com sidebar de resumo (conteúdo migrado para passo 1 do form)
- Layout: `mx-auto max-w-lg px-4 py-6` — coluna única
- Loading state: spinner em vez de texto
- Removidos imports não utilizados: `CheckCircle2, Clock3, ShieldCheck, Sparkles, User`
- Removidas funções `formatCurrencyFromCents` e `formatCurrencyFromReais` (lógica migrada para o form)
- Adicionados props ao `<CheckoutForm>`: `gigTitle`, `gigDescription`, `gigImageUrl`, `readerName`, `readerAvatarUrl`, `deliveryHours`, `basePrice`, `addOnsTotal`

---

## Verificação

- [x] `npm run build` — ✅ 5.91s, zero erros
- [x] Layout coluna única (max-w-lg) — sem sidebar
- [x] Fluxo sem requirements: 2 passos (Resumo → Pagamento)
- [x] Fluxo com requirements: 3 passos, validação impede avançar sem preencher obrigatórios
- [x] Nenhum texto de marketing do Mercado Pago visível
- [x] Toda lógica de pagamento preservada
