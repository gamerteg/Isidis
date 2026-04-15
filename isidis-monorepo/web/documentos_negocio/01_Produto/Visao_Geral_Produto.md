# Visão Geral do Produto (Product Overview)

## 1. O que é o Magicplace?
O **Magicplace** é um marketplace de nicho exclusivo, projetado para conectar clientes (Querentes) a profissionais qualificadas de Esoterismo e Cartomancia (Tarólogas, Astrólogas, etc.).

O grande diferencial do Magicplace em relação a concorrentes genéricos ou atendimentos informais (como WhatsApp) é o foco na **"Entrega Rica"** e na **"Segurança Financeira"**.

## 2. A "Entrega Rica" (Core Value Proposition)
A plataforma não é um simples chat ou sistema de videochamada. A entrega central do produto é um ambiente interativo onde o cliente recebe sua leitura estruturada:
- **Visualização da Mesa:** Uma interface visual onde as cartas sorteadas são exibidas.
- **Áudio Integrado:** Cada carta/posição possui um player de áudio dedicado onde a taróloga explica o significado específico daquela jogada.
- **Relatório em Texto:** Resumos e observações da profissional acompanham o áudio.

Isso transforma uma simples leitura de tarô comum em um **Produto Digital Premium** que o cliente pode guardar, reouvir e consultar sempre que quiser.

## 3. O Modelo de Negócios (Pix-First & Escrow)
- **Para o Cliente:** Fim da barreira do cartão de crédito. Pagamento instantâneo e seguro via PIX (Copia e Cola ou QR Code).
- **Para a Profissional:** Fim dos "calotes" e da gestão manual de comprovantes. O pagamento do cliente fica retido na plataforma (Escrow) e só é liberado para a carteira da profissional após a entrega do serviço.
- **Para a Plataforma:** A monetização ocorre pela retenção de uma taxa (Platform Fee, atualmente 15%) sobre cada transação realizada com sucesso.

## 4. O Ecossistema (Aplicações)
O produto é composto por três grandes visões (Interfaces):

1. **Visão do Cliente (Marketplace):** Vitrine de profissionais, busca facetada (filtros por categoria), página de detalhes da oferta (Gig), checkout PIX e visualizador da leitura.
2. **Visão da Profissional (Painel / Wallet):** Dashboard de vendas, gestão de portfólio (criar/editar Gigs), editor de entrega de leitura (upload de áudio e imagem) e carteira virtual para solicitação de saques PIX.
3. **Visão Admin (Backoffice):** Painel de controle para os fundadores aprovarem perfis, monitorarem o volume transacional financeiro, mediarem disputas de reembolso e controlarem a saúde sistêmica.

## 5. Arquitetura de Alto Nível (Resumo Técnico)
- O Cérebro: Desenvolvido em **Next.js** (React) de alta performance.
- O Motor Financeiro: Integração via API e Webhooks com a **Abacate Pay** para processamento PIX nativo.
- O Cofrinho e Arquivo: Banco de dados relacional (PostgreSQL) e armazenamento de arquivos (Storage de áudios/imagens) providos pelo **Supabase**.
