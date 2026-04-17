# Patch Notes & Changelog (Registro de AtualizaÃ§Ãµes)

Este documento registra todas as alteraÃ§Ãµes, novidades (Features), correÃ§Ãµes de bugs (Fixes) e melhorias (Improvements) aplicadas na plataforma Magicplace ao longo do tempo.

---

## [v1.0.0] - 2026-02-24 (LanÃ§amento MVP)

### âœ¨ Novidades (Features)
- LanÃ§amento oficial da plataforma base (Marketplace).
- **AutenticaÃ§Ã£o:** Login seguro e criaÃ§Ã£o de perfis distintos (Cliente e TarÃ³loga).
- **Vitrine:** VisualizaÃ§Ã£o de listagem de Gigs ativas (apenas profissionais com serviÃ§os criados aparecem no catÃ¡logo).
- **Checkout PIX:** Integracao v1 com gateway de pagamentos para geracao de PIX (Copia e Cola / QR Code).
- **Wallet Interna:** Carteira para tarÃ³logas com SeparaÃ§Ã£o de Saldo Bloqueado e Saldo DisponÃ­vel (liberaÃ§Ã£o em 48h).
- **Entrega Rica:** Editor de leituras permitindo upload de artes (cartas) e Ã¡udios com player interativo para o consmidor final.
- **Dashboards:** Ãrea administrativa para visÃ£o de logs financeiros, listagem consolidada de usuÃ¡rios e liberaÃ§Ã£o de acesso.

### ðŸ›  Melhorias (Improvements)
- OtimizaÃ§Ã£o pesada de imagens trocando tags padrÃ£o HTML para componentes super rÃ¡pidos `<Image>` do ecossistema NextJS melhorando o SEO da Home.
- OtimizaÃ§Ã£o do design-system refatorado para o padrÃ£o Shadcn de alto contraste e acessibilidade (cores premium Dark Mode/Mesa FÃ­sica ajustada).
- Adicionadas notificaÃ§Ãµes no Painel Admin via banco (Realtime) para alertar gerentes que novas Gigs foram criadas.

### ðŸ› CorreÃ§Ãµes de Bugs (Fixes)
- **CorreÃ§Ã£o CrÃ­tica Financeira:** Concertado o problema onde o painel Admin nÃ£o estava refletindo fielmente os valores agregados em tempo real do sistema.
- **Saques Automatizados:** Retirada a obrigatoriedade de aprovaÃ§Ã£o manual para saques; o PIX da profissional pela operacao automatizada de pagamentos agora processa automÃ¡tico pela API apÃ³s atingÃªncia de saldo lÃ­quido.
- **Envio de E-mails Transacionais:** Normalizada falha lÃ³gica que impedia os disparos automÃ¡ticos para confirmaÃ§Ã£o e acompanhamento de pedido por divergÃªncia e mÃ¡ leitura do Supabase Auth.
- Corrigido erro estrutural no perfil durante o cadastro inicial (`trigger` do banco consertada).

--- 
*(Novas versÃµes serÃ£o adicionadas acima deste bloco cronologicamente)*


