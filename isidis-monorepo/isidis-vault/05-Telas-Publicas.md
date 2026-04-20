# 📺 Análise Detalhada: Telas Públicas

As telas públicas são a porta de entrada do Isidis. Elas precisam de SEO (embora em SPA seja limitado sem SSR), performance extrema e fluidez mobile.

## 🏠 Home (`/`)

### 🔍 Estado Atual
- **Erros:** Segue o padrão `page.tsx` dentro de `(website)`. Usa `useEffect` para carregar dados básicos de estatísticas e profissionais em destaque.
- **Acoplamento:** Importa componentes pesados como `InteractiveTarotCards` via `React.lazy`, o que é bom, mas o layout de seção está muito repetitivo.

### 🚀 Como Melhorar
1.  **Transformar em `Home.tsx`:** Mover para `src/pages/public/Home.tsx`.
2.  **Abstração de Seções:** Criar componentes de seção mais reutilizáveis para evitar a repetição de `PageSection` e `PageContainer` com as mesmas props.
3.  **Mobile-First:** Garantir que o `MainHero` não corte imagens em telas pequenas (iPhone SE). Usar `aspect-square` em mobile para as cartas e `aspect-video` em desktop.

---

## 🔮 Marketplace de Cartomantes (`/cartomantes`)

### 🔍 Estado Atual
- **Erro Crítico:** Estrutura "Wrapper". Existe um `CartomantesPage` que só serve para buscar dados e passar para o `CartomantesClient`. Isso é um resquício de tentativa de SSR no Next.js.
- **Sincronização de URL:** O estado dos filtros está acoplado ao `useSearchParams`, o que é correto, mas a lógica de busca no `useEffect` é imperativa e pode gerar race conditions.

### 🚀 Como Melhorar
1.  **Unificação:** Eliminar o `cartomantes-client.tsx`. Tudo deve ser um único componente funcional `Cartomantes.tsx` em `src/pages/public/`.
2.  **React Query / SWR:** Em vez de `useEffect` manual, usar `useSWR` ou `Tanstack Query`. Isso traz cache automático e tratamento de erro nativo.
3.  **Skeleton Screens Mobile:** Em vez de "Carregando...", usar skeletons que imitem o `PractitionerCard` para evitar layout shift no mobile.

---

## 💳 Checkout (`/checkout/[id]`)

### 🔍 Estado Atual
- **Erro:** Frequentemente telas de checkout em SPAs perdem o estado se o usuário recarrega.
- **Segurança:** Muita lógica de cálculo de preço pode estar no frontend.

### 🚀 Como Melhorar
1.  **Single Source of Truth:** O checkout deve validar o preço e a disponibilidade sempre com a API (`/api/gigs/:id`) ao carregar, nunca confiar apenas no que veio da navegação anterior.
2.  **Mobile-First (Sticky Action):** Em mobile, o botão de "Pagar via PIX" deve ser fixo (sticky) no rodapé da tela para facilitar a conversão.
3.  **Feedback Instantâneo:** Usar WebSockets (ou polling curto) para detectar o pagamento do PIX e redirecionar automaticamente.