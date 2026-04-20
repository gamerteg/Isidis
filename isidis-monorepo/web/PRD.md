# Product Requirements Document (PRD) - Isidis

## 1. Visão Geral do Produto
O **Isidis** é um marketplace de nicho focado em serviços de Tarô e Esoterismo. O objetivo é conectar tarólogas qualificadas a clientes que buscam orientação, oferecendo uma experiência de entrega superior (visual e auditiva) e um sistema de pagamento simplificado via PIX.

### 1.1 Diferenciais Chave
- **Entrega Rica:** Diferente de chats simples, a entrega é um "Produto Digital" visual (Cartas virando + Áudio explicativo + Texto).
- **Modelo Pix-First:** Focado na realidade brasileira, eliminando barreiras de cartão de crédito.
- **Carteira Digital:** Sistema interno de gestão de saldo para as profissionais.

## 2. Perfis de Usuário
1.  **Cliente (Querente):** Busca orientação, paga via PIX, visualiza a tiragem interativa.
2.  **Profissional (Taróloga):** Cria perfil, cadastra serviços (Gigs), realiza tiragens ricas, gerencia saldo e solicita saques.
3.  **Admin:** Gerencia disputas e monitora transações (Backoffice).

## 3. Jornadas do Usuário (User Stories)

### 3.1 Autenticação e Perfil
- **Como usuário,** quero me cadastrar usando E-mail/Senha ou Google para acessar a plataforma.
- **Como taróloga,** quero editar meu perfil (foto, bio, baralhos, especialidades) para atrair clientes.

### 3.2 Marketplace e Contratação
- **Como cliente,** quero buscar tarólogas por filtros (amor, carreira, baralho) e ordenar por avaliação.
- **Como cliente,** quero ver os detalhes de uma Gig e o preço final antes de comprar.
- **Como cliente,** quero pagar via PIX (Copia e Cola ou QR Code) e ter a liberação imediata após o pagamento.

### 3.3 A Entrega (Core Experience)
- **Como taróloga,** quero um editor estruturado onde eu possa:
    - Selecionar a carta tirada (upload ou banco de imagens).
    - Gravar ou subir um áudio explicando aquela carta específica.
    - Escrever um texto complementar.
- **Como cliente,** quero visualizar minha leitura com animações de cartas virando e player de áudio integrado.

### 3.4 Financeiro (Wallet & Ledger)
- **Como taróloga,** quero ver meu "Saldo Bloqueado" (pedidos recentes) e "Saldo Disponível" (após 24h/48h).
- **Como taróloga,** quero cadastrar minha chave PIX.
- **Como taróloga,** quero solicitar o saque do meu saldo disponível e receber na minha conta bancária.

## 4. Regras de Negócio
1.  **Taxa da Plataforma:** 15% sobre o valor da Gig (retido na fonte). A Taróloga recebe 85%.
2.  **Fluxo de Pagamento:**
    - Cliente paga R$ 50,00 -> Plataforma recebe R$ 50,00 no Abacate Pay.
    - Ledger Interno: Crédito de R$ 42,50 para Taróloga (Status: Bloqueado).
3.  **Liberação de Saldo:** O saldo migra de "Bloqueado" para "Disponível" 48 horas após a entrega do serviço, se não houver disputa.
4.  **Saque Mínimo:** R$ 20,00.

## 5. Requisitos Não Funcionais
- **Performance:** O carregamento da página de leitura deve ser instantâneo (Next.js SSR/ISR).
- **Segurança:** Uso de RLS (Row Level Security) no Supabase para garantir que apenas o dono do pedido veja a leitura.
- **Concorrência:** Prevenção total contra "Double Spending" no momento do saque.
