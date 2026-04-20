# 🛠️ Funcionalidades: Mensagens e Presença

O sistema de comunicação do Isidis é o que garante a confiança entre o Consulente e a Cartomante. Ele utiliza o Supabase para persistência e Realtime para notificações e status.

## 🟢 Presença em Tempo Real (`PresenceProvider`)

### 🔍 Como Funciona
- Utiliza o **Supabase Presence** para rastrear quem está com a aba do Isidis aberta.
- O `PresenceProvider` sincroniza uma lista de `onlineUsers` (IDs de usuários).
- No frontend, o componente `OnlineReaders` filtra essa lista para mostrar quem está disponível para atendimento imediato.

### 🚀 Melhorias de Escalabilidade
1.  **Throttling de Status:** Evitar disparar re-renderizações em toda a árvore do React a cada milissegundo quando alguém entra/sai. Usar um debounce no estado do contexto.
2.  **Status "Ocupado":** Diferenciar entre "Online" (navegando) e "Em Atendimento" (com pedido ativo em aberto). Isso deve ser um merge do estado de Presence com o estado da tabela de `orders` no banco.

---

## 💬 Sistema de Chat2 e Mensagens

### 🔍 Funcionalidades Atuais
- Chat de texto simples entre usuários.
- Notificações de novas mensagens via Realtime.

### 🚀 Melhorias Necessárias (Mobile-First)
1.  **Suporte a Mídia Rica:** O chat precisa suportar nativamente o envio de fotos das cartas e áudios de interpretação.
2.  **Cache Offline (Optimistic Updates):** Quando o usuário envia uma mensagem no mobile com sinal fraco, a mensagem deve aparecer instantaneamente com um ícone de "enviando" (relógio), sendo confirmada apenas após o sucesso da API.
3.  **Push Notifications:** Atualmente o sistema depende de abas abertas. É crucial integrar com o Firebase Cloud Messaging (FCM) para enviar notificações push reais quando o usuário não está com o navegador aberto.

---

## 🔔 Notificações do Sistema

### 🔍 Tipos de Notificação
- **Transacionais:** "Seu pagamento foi aprovado", "Sua leitura está pronta".
- **Interação:** "Você recebeu uma nova mensagem".

### 🚀 Estratégia de Consolidação
- Centralizar todas as notificações em um serviço único no backend (`/api/services/notify.ts`).
- **Prioridade de Canal:** 
    1.  Push (se disponível).
    2.  Realtime In-App (se logado).
    3.  E-mail ( fallback para transações importantes).