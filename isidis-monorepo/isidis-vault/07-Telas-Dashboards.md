# 📊 Análise Detalhada: Dashboards (Consulente e Cartomante)

Os dashboards são onde a mágica do Isidis acontece no dia a dia.

## 👤 Dashboard Consulente (`/dashboard`)

### 🔍 Estado Atual
- **Erro:** Grande massa de código inline. O `DashboardHome` gerencia sidebar, refreshing, headers e múltiplas seções em um único arquivo gigante.
- **Responsividade:** O layout usa `overflow-hidden` no main, o que pode quebrar o scroll nativo do iOS em certas condições.

### 🚀 Como Melhorar
1.  **Layout Patterns:** Mover o `UserSidebar` para um `DashboardLayout.tsx` compartilhado. A página deve apenas renderizar o conteúdo central.
2.  **Componentização das Seções:** Criar componentes como `CategoryGrid`, `OnlineReadersList` e `RecommendedGigs` em arquivos separados.
3.  **Mobile-First (Bottom Nav):** Considerar uma barra de navegação inferior (tab bar) para as funções principais do dashboard no mobile, em vez de depender apenas do menu lateral escondido.

---

## 🃏 Dashboard Cartomante (`/dashboard/cartomante`)

### 🔍 Estado Atual
- **Erro:** Cada página do dashboard da cartomante importa sua própria sidebar (`CartomanteSidebar`), o que causa re-renderizações desnecessárias e "pisca" a interface na navegação.
- **Gestão de Pedidos:** A visualização de novos pedidos pode não ser agressiva o suficiente em termos de notificação visual.

### 🚀 Como Melhorar
1.  **Nested Layouts:** Usar o roteamento aninhado do `react-router-dom` para que a `CartomanteSidebar` fique fixa e apenas o conteúdo mude.
2.  **Mobile-First (Gestão):** A cartomante precisa conseguir responder pedidos e enviar áudios/fotos facilmente pelo celular. Garantir que o upload de mídia seja robusto e mostre progresso claro.
3.  **Carteira:** Simplificar a visualização de ganhos no mobile com gráficos simples e botões de saque proeminentes.

---

## 💬 Mensagens e Atendimento (`/dashboard/mensagens`)

### 🔍 Estado Atual
- **Erro:** Mensagens em tempo real são complexas de manter estáveis em conexões móveis instáveis.

### 🚀 Como Melhorar
1.  **Resiliência:** Implementar um estado "Offline" claro e tentar re-sincronizar automaticamente quando a rede voltar.
2.  **Interface de Chat:** Seguir o padrão de apps de mensagens populares (input fixo no rodapé, bolhas de fala com contraste alto). Aproveitar o `PresenceProvider` já existente para mostrar quem está online.