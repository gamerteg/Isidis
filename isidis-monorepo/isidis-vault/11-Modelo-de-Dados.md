# 🗄️ Modelo de Dados (Database Schema)

O Isidis utiliza o **Supabase (PostgreSQL)** como banco de dados principal. Abaixo está o mapeamento das entidades core e seus relacionamentos.

## 👤 Perfis e Usuários (`profiles`)
Estende a tabela `auth.users` do Supabase via triggers.
- **Campos Chave:** `id`, `full_name`, `email`, `role` (CLIENT, READER, ADMIN), `avatar_url`.
- **Campos Reader:** `bio`, `specialties`, `experience_years`, `rating_average`, `reviews_count`, `pix_key`.

## 🔮 Serviços (`gigs`)
Define as ofertas das cartomantes.
- **Relacionamentos:** Pertence a um `owner_id` (Profile).
- **Campos Chave:** `title`, `description`, `price` (em centavos), `delivery_time_hours`, `category`.
- **Metadados:** `requirements` (JSONB com perguntas para o cliente), `add_ons` (opcionais de velocidade ou extras).

## 📦 Pedidos (`orders`)
O motor financeiro e operacional.
- **Relacionamentos:** Conecta um `client_id`, `reader_id` e `gig_id`.
- **Status:** `PENDING_PAYMENT` ➔ `PAID` ➔ `DELIVERED` ➔ `COMPLETED` (ou `CANCELED`).
- **Financeiro:** `amount_total`, `amount_platform_fee`, `amount_reader_net`, `mercadopago_payment_id`.

## 💰 Financeiro (`wallets` & `transactions`)
Controle de saldos e saques.
- **Wallets:** Um registro por usuário (`user_id`). Saldo `available` e `pending`.
- **Transactions:** Histórico de entradas (`SALE_CREDIT`) e saídas (`WITHDRAWAL`). 
- **Regra de Liberação:** Créditos de vendas costumam ficar pendentes por 7 dias ou até a conclusão do pedido.

## 💬 Comunicação (`messages` & `notifications`)
- **Messages:** `sender_id`, `receiver_id`, `content`, `order_id` (opcional).
- **Notifications:** `user_id`, `type`, `title`, `message`, `read_at`.

---

### 💡 Dica de Implementação
Ao realizar queries complexas (ex: listar cartomantes online com preço inicial), prefira criar **Views** ou **RPCs (Remote Procedure Calls)** no Supabase para manter a lógica de agregação próxima aos dados.