# PATCH-2026-04-25 — Reskin completo do App Cliente

## Motivação

Bundle de design exportado via `claude.ai/design` (`App Cliente.html`) forneceu um redesign completo do fluxo do consulente. O objetivo foi incorporar o design no app web existente mantendo toda lógica de dados, rotas e SDK do Mercado Pago.

## Escopo

Reskin mobile-first com graceful desktop das 9 telas do cliente + criação de 13 novos componentes de design de marca.

---

## Tokens adicionados em `globals.css`

Seção `APP CLIENTE — tokens do claude.ai/design`:

- `.tarot-mini` + `::before` inset border dourado
- `.chip-filter` / `.chip-filter.active` — pill de categoria
- `.bubble-them` / `.bubble-me` — bolhas de chat assimétricas
- `.reader-card` com `:active { transform: scale(0.97) }`
- `.surface-card`, `.glass-card`
- `.btn-primary-design`, `.btn-gold-design`, `.btn-ghost-design`
- `@keyframes pulseRing` + `.animate-pulse-ring`
- `.badge-pill`, `.mobile-canvas`

---

## Componentes criados em `web/src/components/design/`

| Arquivo | Propósito |
|---|---|
| `OrbBackground.tsx` | Orbs coloridos desfocados para atmosfera de fundo |
| `TarotMini.tsx` | Mini carta de arcano (gradiente roxo-profundo + borda dourada) |
| `ChipFilter.tsx` | Pill filtro de categoria com emoji e estado ativo |
| `MoonPhaseCard.tsx` | Card de fase lunar animada (cálculo real via lunação) |
| `ActiveOrderNudge.tsx` | Nudge de pedido ativo com progress ring SVG |
| `StarRating.tsx` | 5 estrelas douradas SVG |
| `ReaderCard.tsx` | Card de leitora (variant row ou tarot) |
| `ReaderCardRow.tsx` | Linha horizontal de avatares de leitoras online |
| `CardReveal.tsx` + `CardRevealGrid.tsx` | Revelação de cartas com chime Web Audio API |
| `AudioWaveformPlayer.tsx` | Player com 60 barras de waveform + scrubber |
| `SuccessAnimation.tsx` | Animação de sucesso 3-fases com partículas + check SVG |
| `StepProgressBar.tsx` | Barra de progresso 4 passos gradiente roxo→dourado |
| `PixPaymentStep.tsx` | PIX: QR SVG placeholder + timer + copia chave |
| `index.ts` | Re-exporta todos os 13 componentes |

---

## Arquivos modificados

### Dashboard Cliente
- `web/src/pages/dashboard/client/DashboardHome.tsx` — saudação + MoonPhaseCard + ActiveOrderNudge + ChipFilter + ReaderCardRow online + ReaderCard recomendadas
- `web/src/pages/dashboard/client/MinhasTiragens.tsx` — cards com TarotMini + status pills + shortId (#MP-XXXXXX) + formatDate (hoje/ontem)
- `web/src/pages/dashboard/client/PedidoDetail.tsx` — status card gradiente + timeline 5 etapas + deadline dourado + botões de ação
- `web/src/pages/dashboard/client/LeituraDetail.tsx` — mensagem da leitora em italic + AudioWaveformPlayer + CardRevealGrid + review modal inline com picker de estrelas + thank-you pós-avaliação
- `web/src/pages/dashboard/client/Mensagens.tsx` — wrapper já correto; atualizado `ClientMessagesClient.tsx`
- `web/src/pages/dashboard/client/Perfil.tsx` — avatar centralizado + nome/email + ProfileForm em card glass + ações rápidas + botão "Sair" vermelho

### Público
- `web/src/pages/public/CheckoutSuccess.tsx` — SuccessAnimation + card de previsão de entrega + CTA
- `web/src/pages/public/Checkout.tsx` — background atualizado para `bg-background-deep`; delega para `CheckoutForm`
- `web/src/components/checkout/CheckoutForm.tsx` — 3 passos com StepProgressBar (confirm / pergunta / pagamento); PixPaymentStep integrado ao passo PIX; preservado SDK MP para CARD
- `web/src/pages/public/Cartomantes.tsx` — sem alteração (só carrega `CartomantesClient`)
- `web/src/components/cartomantes/CartomantesClient.tsx` — hero com OrbBackground + header serif/aurora; substituído `ReaderCard` inline pelo componente `design/ReaderCard` variant='tarot'
- `web/src/pages/public/CartomanteDetail.tsx` — cover 200px + arcano numeral ghost + avatar overlaid 64px + stats grid 3 cols + TarotMini nos gigs + gold CTA + reviews com StarRating

### Chat
- `web/src/components/messages/ClientMessagesClient.tsx` — lista de conversas com avatares iniciais + indicador unread + dark glass design

---

## Correções de tipo notáveis

- `ReaderListItem.starting_price` (não `min_price`)
- `ReaderListItem.rating_average` / `reviews_count` (não `average_rating` / `total_reviews`)
- `OrderStatus` tem exatamente 5 valores: `PENDING_PAYMENT | PAID | DELIVERED | COMPLETED | CANCELED`
- `AudioWaveformPlayer` aceita `title`, não `readerName`

---

## Build

```
✓ built in 6.05s  (exit 0)
npx tsc --noEmit  (exit 0)
```

Sem erros de tipo, sem erros de build.

---

## Dependências novas

Nenhuma. Todos os componentes usam React, Web Audio API nativa e CSS inline + classes existentes.
