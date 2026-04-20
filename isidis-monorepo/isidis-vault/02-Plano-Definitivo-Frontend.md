# 🛠️ Plano Definitivo de Migração (Frontend)

Este é o roteiro de execução para converter o projeto em uma verdadeira aplicação React/Vite escalável.

## Fase 1: Limpeza de Dependências
- **Ação:** Remover `@supabase/ssr` se não houver renderização do lado do servidor (SSR) ou adaptação para o Client puro.
- **Ação:** Garantir que pacotes exclusivos do Next.js (se ainda ocultos em algum `package-lock`) sejam completamente expurgados.

## Fase 2: Reestruturação de Pastas (Vite Standard)
Adeus, `src/app`! Vamos adotar uma arquitetura baseada em `pages` e `layouts` (ou features):

**De:**
```text
src/
└── app/
    ├── (website)/
    │   ├── page.tsx
    │   └── layout.tsx
    ├── dashboard/
    └── quiz-onboarding/
```

**Para:**
```text
src/
├── layouts/
│   ├── WebsiteLayout.tsx
│   ├── AuthLayout.tsx
│   └── DashboardLayout.tsx
├── pages/
│   ├── public/
│   │   ├── Home.tsx
│   │   ├── Cartomantes.tsx
│   │   └── ServicoDetail.tsx
│   ├── auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   └── dashboard/
│       ├── ClientDashboard.tsx
│       └── ReaderDashboard.tsx
├── features/ (Opcional, para lógica encapsulada)
└── routes/
    └── index.tsx (Configuração do react-router)
```

## Fase 3: Refatoração do Roteamento
- Remover o `<Suspense>` global massivo de `App.tsx` e implementar `React.lazy` corretamente por rota (Code Splitting).
- Mudar todas as importações em `App.tsx` para refletir os novos caminhos de `src/pages`.
- Atualizar todos os links internos (`import { Link } from 'react-router-dom'`) para garantir que nenhuma referência a `next/link` tenha sobrado e que os paths apontem para o lugar certo.

## Fase 4: Otimização de Assets
- Mover todos os recursos estáticos (`robots.txt`, manifestos) para o diretório `public/` do Vite.
- Validar configuração do `vite.config.ts` para otimização de chunks.