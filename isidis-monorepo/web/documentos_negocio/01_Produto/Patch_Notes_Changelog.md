# Patch Notes & Changelog (Registro de Atualizações)

Este documento registra todas as alterações, novidades (Features), correções de bugs (Fixes) e melhorias (Improvements) aplicadas na plataforma Magicplace ao longo do tempo.

---

## [v1.0.0] - 2026-02-24 (Lançamento MVP)

### ✨ Novidades (Features)
- Lançamento oficial da plataforma base (Marketplace).
- **Autenticação:** Login seguro e criação de perfis distintos (Cliente e Taróloga).
- **Vitrine:** Visualização de listagem de Gigs ativas (apenas profissionais com serviços criados aparecem no catálogo).
- **Checkout PIX:** Integração v1 com Abacate Pay para geração de PIX (Copia e Cola / QR Code).
- **Wallet Interna:** Carteira para tarólogas com Separação de Saldo Bloqueado e Saldo Disponível (liberação em 48h).
- **Entrega Rica:** Editor de leituras permitindo upload de artes (cartas) e áudios com player interativo para o consmidor final.
- **Dashboards:** Área administrativa para visão de logs financeiros, listagem consolidada de usuários e liberação de acesso.

### 🛠 Melhorias (Improvements)
- Otimização pesada de imagens trocando tags padrão HTML para componentes super rápidos `<Image>` do ecossistema NextJS melhorando o SEO da Home.
- Otimização do design-system refatorado para o padrão Shadcn de alto contraste e acessibilidade (cores premium Dark Mode/Mesa Física ajustada).
- Adicionadas notificações no Painel Admin via banco (Realtime) para alertar gerentes que novas Gigs foram criadas.

### 🐛 Correções de Bugs (Fixes)
- **Correção Crítica Financeira:** Concertado o problema onde o painel Admin não estava refletindo fielmente os valores agregados em tempo real do sistema.
- **Saques Automatizados:** Retirada a obrigatoriedade de aprovação manual para saques; o PIX da profissional pela AbacatePay agora processa automático pela API após atingência de saldo líquido.
- **Envio de E-mails Transacionais:** Normalizada falha lógica que impedia os disparos automáticos para confirmação e acompanhamento de pedido por divergência e má leitura do Supabase Auth.
- Corrigido erro estrutural no perfil durante o cadastro inicial (`trigger` do banco consertada).

--- 
*(Novas versões serão adicionadas acima deste bloco cronologicamente)*
