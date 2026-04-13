# 02 - Modelo de Dados e Banco de Dados (PostgreSQL / Supabase)

## 1. Tabelas Principais e Relacionamentos

### 1.1 `profiles`
Estende `auth.users` e armazena informações de perfil de todos os usuários.
- `id`: uuid (PK, FK auth.users)
- `full_name`: nome completo
- `role`: 'CLIENT' | 'READER' | 'ADMIN'
- `avatar_url`: URL da imagem de perfil
- `bio`: biografia da taróloga
- `specialties`: array de especialidades (ex: ['Tarot', 'Baralho Cigano'])
- `verification_status`: status de aprovação ('PENDING', 'APPROVED', 'REJECTED')
- `rating_average` / `reviews_count`: estatísticas de avaliação
- `pix_key_type` / `pix_key`: dados bancários para saque

### 1.2 `gigs`
Serviços oferecidos pelas tarólogas.
- `id`: uuid (PK)
- `owner_id`: uuid (FK profiles)
- `title`: título do serviço
- `description`: descrição detalhada
- `price`: valor em centavos
- `status`: status de aprovação ('PENDING', 'APPROVED', 'REJECTED')
- `slug`: slug para URL amigável
- `requirements`: array de perguntas para o cliente responder ao contratar
- `add_ons`: serviços extras (velocidade, leitura extra, etc)

### 1.3 `orders`
Registros de contratações de serviços.
- `id`: uuid (PK)
- `client_id`: uuid (FK profiles)
- `reader_id`: uuid (FK profiles)
- `gig_id`: uuid (FK gigs)
- `status`: 'PENDING_PAYMENT' | 'PAID' | 'DELIVERED' | 'COMPLETED' | 'CANCELED'
- `amount_total`: valor total em centavos
- `delivery_content`: `jsonb` (Estrutura da leitura rica)
- `requirements_answers`: `jsonb` (Respostas do cliente às perguntas da Gig)

### 1.4 `subscriptions`
Assinaturas recorrentes de serviços.
- `id`: uuid (PK)
- `status`: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED'
- `monthly_price`: valor mensal
- `readings_per_month`: limite de leituras por mês
- `readings_done_this_period`: contador de leituras realizadas

### 1.5 `transactions` (Ledger Financeiro)
Histórico imutável de movimentações financeiras.
- `id`: uuid (PK)
- `wallet_id`: uuid (FK wallets)
- `amount`: valor (positivo para crédito, negativo para débito)
- `type`: 'SALE_CREDIT' | 'PLATFORM_FEE' | 'WITHDRAWAL' | 'REFUND'
- `status`: 'PENDING' | 'COMPLETED' | 'FAILED'

### 1.6 `messages` (Chat System)
- `sender_id` / `receiver_id`: uuid (FK profiles)
- `content`: texto da mensagem
- `order_id`: uuid (opcional, vincula chat a um pedido específico)
- `is_read`: boolean

## 2. Estrutura JSONB de Entrega (`delivery_content`)
Utilizado para armazenar a "Leitura Rica" de forma flexível.
``json
{
  "summary": "Resumo da tiragem...",
  "cards": [
    {
      "position_name": "Presente",
      "card_name": "O Mago",
      "card_image": "https://...",
      "meaning": "Texto explicativo...",
      "audio_url": "https://..."
    }
  ]
}
``

## 3. Segurança e Políticas (RLS)
- **Profiles:** Leitura pública para `READER`. Edição apenas pelo dono (`auth.uid() = id`).
- **Orders:** Apenas `client_id` ou `reader_id` podem visualizar os detalhes e o `delivery_content`.
- **Transactions:** Apenas o dono da carteira pode visualizar.
- **Admin:** Possui políticas que permitem bypass em todas as tabelas para gestão.

## 4. Triggers e Funções Críticas
- **`financial_triggers.sql`**: Automatiza a criação de registros no ledger ao mudar status de pedido.
- **`ranking_system.sql`**: Atualiza a média de avaliações das tarólogas.
- **`auto_complete_orders.sql`**: Completa pedidos automaticamente após X horas da entrega se não houver disputa.
