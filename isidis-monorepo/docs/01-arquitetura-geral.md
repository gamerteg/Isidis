# 01 - Arquitetura Geral do Sistema (IsidisApp / Magicplace)

## 1. Visão Geral
O **IsidisApp** (Magicplace) é um ecossistema de marketplace para serviços de Tarô e Esoterismo, composto por uma aplicação web (Next.js), uma aplicação mobile (Flutter) e uma API de suporte (Fastify). O sistema utiliza o **Supabase** como infraestrutura principal para banco de dados, autenticação, armazenamento de arquivos e atualizações em tempo real.

## 2. Componentes do Ecossistema

### 2.1 Frontend Web (`Isidis/`)
- **Framework:** Next.js 14+ (App Router).
- **Estilização:** Tailwind CSS + Shadcn/UI + Lucide React.
- **Gerenciamento de Estado/Dados:** SWR para fetching, Server Actions para mutações.
- **Autenticação:** Supabase Auth (Integrado via `@supabase/ssr`).
- **Função:** Portal principal para clientes e interface administrativa para tarólogas (leitura de cartas, gestão de perfil).

### 2.2 Mobile App (`isidis_flutter/`)
- **Framework:** Flutter.
- **Gerenciamento de Estado:** Riverpod (com `riverpod_generator`).
- **Navegação:** GoRouter.
- **Integração:** Supabase SDK para Auth/Realtime e Dio para chamadas à Fastify API.
- **Função:** Experiência mobile nativa, notificações push, gravação de áudio para leituras e consumo de conteúdo.

### 2.3 Backend API (`IsidisApp-API/`)
- **Framework:** Fastify (Node.js/TypeScript).
- **Validação:** Zod.
- **Integrações Externas:** Asaas (Pagamentos PIX + Cartão + Saques), Firebase Admin (Push Notifications), Resend (E-mail).
- **Função:** Lógica de negócio complexa, processamento de webhooks, tarefas agendadas (crons) e integração com serviços de terceiros que exigem chaves de API privadas.

### 2.4 Infraestrutura (Supabase)
- **PostgreSQL:** Banco de dados relacional.
- **Realtime:** Atualizações de status de pedidos e chats.
- **Storage:** Armazenamento de avatares, imagens de cartas e áudios de leituras.
- **Auth:** Gestão de usuários e permissões via RLS (Row Level Security).

## 3. Fluxo de Dados e Integrações

### 3.1 Pagamentos (Asaas)
- Gateway unificado **Asaas** para PIX, cartão de crédito e saques PIX para tarólogas.
- Fluxo: Cliente inicia checkout -> API cria cobrança Asaas -> Webhook confirma pagamento -> Ledger interno atualiza saldo da taróloga com hold de 48h.

### 3.2 Entrega de Leitura (Core Experience)
- Taróloga seleciona cartas e grava áudio no App (Flutter) ou Web.
- Os arquivos são salvos no Supabase Storage.
- O conteúdo da leitura é salvo em uma coluna `jsonb` (`delivery_content`) na tabela `orders`.
- O cliente recebe uma notificação (Push/Email) e visualiza a leitura interativa.

## 4. Segurança
- **RLS (Row Level Security):** Todas as tabelas no Supabase possuem políticas rígidas que garantem que usuários só acessem seus próprios dados (ex: apenas o cliente e a taróloga podem ver os detalhes de um pedido).
- **Service Role:** Operações críticas de backend (via Fastify API) utilizam a `SERVICE_ROLE_KEY` para bypassar RLS em contextos controlados.
