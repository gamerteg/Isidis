# 04 - Padrões de Desenvolvimento e Convenções

## 1. Frontend Web (Next.js)

### 1.1 Stack de UI
- **Componentes:** Baseados em **Shadcn/UI**. Novos componentes devem ser adicionados na pasta `components/ui` e seguir o padrão de acessibilidade do Radix UI.
- **Estilização:** Utilizar **Tailwind CSS**. Evitar CSS módulos ou estilos inline.
- **Ícones:** Utilizar a biblioteca **Lucide React**.

### 1.2 Gerenciamento de Dados
- **Fetching:** Utilizar o hook `useSWR` para dados que precisam de atualização em tempo real ou cache otimista.
- **Mutations:** Preferir o uso de **Server Actions** (`"use server"`) para submissão de formulários e alterações no banco de dados.
- **Forms:** Utilizar `react-hook-form` com validação **Zod**.

### 1.3 Estrutura de Pastas
- `app/`: Rotas, layouts e server components.
- `components/`: Componentes reutilizáveis (divididos em `ui`, `marketing`, `chat`, etc).
- `hooks/`: Hooks customizados.
- `lib/`: Utilitários, configurações do Supabase e lógica de cliente.
- `types/`: Definições globais de TypeScript.

## 2. Mobile App (Flutter)

### 2.1 Gerenciamento de Estado
- Utilizar **Riverpod** com geradores (`@riverpod`, `@riverpod_generator`).
- Estado assíncrono deve ser tratado via `AsyncValue`.

### 2.2 Navegação
- Utilizar **GoRouter**. Rotas devem ser definidas de forma centralizada em `lib/core/router/app_router.dart`.
- Utilizar `StatefulShellRoute` para navegação em abas (BottomNavigationBar).

### 2.3 Arquitetura
- Seguir o padrão de **Features**: Cada funcionalidade tem sua própria pasta em `lib/features` contendo:
    - `data/`: Repositórios e fontes de dados.
    - `domain/`: Modelos e entidades.
    - `presentation/`: Widgets, telas e providers (controllers).

## 3. Backend API (Fastify)

### 3.1 Padrões de Rota
- Todas as rotas devem possuir validação de schema (Input e Output) via **Zod**.
- Utilizar prefixos de versão (ex: `/v1/payments`).

### 3.2 Segurança
- Verificação rigorosa de assinaturas em Webhooks (Stripe, Abacate Pay).
- Utilizar JWT via `fastify-jwt` quando necessário (além da Auth nativa do Supabase).

## 4. Banco de Dados (PostgreSQL / Supabase)

### 4.1 Nomenclatura
- Tabelas e colunas: `snake_case`.
- Enums: `UPPERCASE` (ex: `PENDING`, `APPROVED`).
- Migrações: Nomeadas sequencialmente (ex: `202401010001_create_users.sql`).

### 4.2 Boas Práticas
- Nunca desabilitar o **RLS** em produção.
- Utilizar **Triggers** para auditoria e sincronização de dados derivados (como rankings).
- Criar **Views** ou **RPCs** para consultas complexas que envolvam muitos joins.
