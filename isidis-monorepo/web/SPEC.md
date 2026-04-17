# Technical Specification (SPEC) - Magicplace

## 1. Tech Stack
- **Frontend Framework:** Next.js 14+ (App Router, Server Actions).
- **Language:** TypeScript.
- **Styling:** Tailwind CSS + Shadcn/UI (para componentes rÃ¡pidos e acessÃ­veis).
- **Backend/Database:** Supabase (PostgreSQL, Auth, Storage, Realtime).
- **Payments:** Mercado Pago
- **Hosting:** Vercel.

## 2. Arquitetura de Banco de Dados (Supabase Schema)

### 2.1 Tabelas Principais

**`profiles`** (Extends `auth.users`)
- `id`: uuid (PK, FK auth.users)
- `role`: text ('CLIENT', 'READER', 'ADMIN')
- `full_name`: text
- `avatar_url`: text
- `bio`: text
- `specialties`: text[]
- `pix_key_type`: text
- `pix_key`: text

**`gigs`**
- `id`: uuid (PK)
- `owner_id`: uuid (FK profiles)
- `title`: text
- `description`: text
- `price`: integer (in cents)
- `image_url`: text
- `is_active`: boolean

**`orders`**
- `id`: uuid (PK)
- `client_id`: uuid (FK profiles)
- `gig_id`: uuid (FK gigs)
- `reader_id`: uuid (FK profiles)
- `status`: text ('PENDING_PAYMENT', 'PAID', 'DELIVERED', 'COMPLETED', 'CANCELED')
- `payment_id`: text (Mercado Pago payment ID)
- `amount_total`: integer (cents)
- `amount_platform_fee`: integer (cents)
- `amount_reader_net`: integer (cents)
- `delivery_content`: jsonb (Estrutura da entrega rica)
- `created_at`: timestamp

**`wallets`**
- `id`: uuid (PK)
- `user_id`: uuid (FK profiles)
- `created_at`: timestamp

**`transactions`** (Ledger ImutÃ¡vel)
- `id`: uuid (PK)
- `wallet_id`: uuid (FK wallets)
- `amount`: integer (Negative for debit, Positive for credit)
- `type`: text ('SALE_CREDIT', 'PLATFORM_FEE', 'WITHDRAWAL')
- `status`: text ('PENDING', 'COMPLETED', 'FAILED')
- `order_id`: uuid (Nullable)
- `external_id`: text (Abacate Pay Transfer ID)

### 2.2 Estrutura JSONB (`delivery_content`)
``json
{
  "summary": "Resumo geral...",
  "cards": [
    {
      "position_name": "Passado",
      "card_image": "url_string",
      "meaning": "text_string",
      "audio_url": "url_string"
    }
  ]
}
``

## 3. IntegraÃ§Ã£o com Abacate Pay (Fluxos CrÃ­ticos)

### 3.1 Checkout (Compra)

1.  **Action:** `createOrder(gigId)`
    
2.  Backend cria registro em `orders` com status `PENDING_PAYMENT`.
    
3.  Backend chama Abacate Pay API para criar billing PIX.
    
4.  Retorna `encodedImage` (QR Code) e `payload` (Copia e Cola) para o frontend.
    

### 3.2 Webhook (ConfirmaÃ§Ã£o)

1.  Rota `/api/webhooks/mercadopago`.
    
2.  Verificar token no header (SeguranÃ§a).
    
3.  Se evento == `PAYMENT_RECEIVED`:
    
    -   Atualizar `orders.status` -> `PAID`.
        
    -   Criar registro em `transactions`: CrÃ©dito para TarÃ³loga (Status: `PENDING` - bloqueado temporariamente).
        

### 3.3 Saque (Withdrawal) - **CRÃTICO**

Deve ser implementado via **Supabase RPC (Postgres Function)** para garantir atomicidade.

**Algoritmo da RPC `request_withdrawal`:**

1.  Iniciar TransaÃ§Ã£o DB.
    
2.  `SELECT SUM(amount) FROM transactions WHERE wallet_id = X AND status = 'COMPLETED'` com `FOR UPDATE` (Lock na leitura).
    
3.  Verificar se `Saldo >= Valor Solicitado`.
    
4.  Inserir nova transaÃ§Ã£o: Tipo `WITHDRAWAL`, Valor `-Amount`, Status `PENDING`.
    
5.  Retornar ID da transaÃ§Ã£o.
    
6.  (No Server Action Next.js): Chamar Abacate Pay API para transferÃªncia.
    
7.  Se sucesso no Abacate Pay -> Update transaÃ§Ã£o para `COMPLETED`.
    
8.  Se erro no Abacate Pay -> Update transaÃ§Ã£o para `FAILED`.
    

## 4. SeguranÃ§a e RLS (Row Level Security)

-   **`profiles`**: Leitura pÃºblica para perfis de TarÃ³logas. EdiÃ§Ã£o apenas pelo dono.
    
-   **`orders`**: Leitura apenas para `client_id` ou `reader_id`.
    
-   **`delivery_content`**: Acesso estrito.
    
-   **`transactions`**: VisÃ­vel apenas para o dono da carteira (Admin vÃª tudo).
    

## 5. Componentes de UI Sugeridos (Shadcn/UI)

-   `Card` (para Gigs).
    
-   `Dialog` (para detalhes do pedido).
    
-   `Form` (React Hook Form + Zod) para criaÃ§Ã£o de Gigs e Checkout.
    
-   `Table` (para extrato financeiro).
    
-   `Badge` (para status do pedido). 


