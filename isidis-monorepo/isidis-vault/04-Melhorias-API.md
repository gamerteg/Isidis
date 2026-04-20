# ⚙️ Análise e Melhorias no Backend (/api)

O backend (Fastify) encontra-se em melhor estado estrutural que o frontend, porém algumas integrações precisam de atenção durante a consolidação.

## 1. Segurança e CORS
Como o frontend agora será servido via Vite (possivelmente sob um domínio principal ou subdomínio estático), certifique-se de que a configuração de CORS no `server.ts` ou `app.ts` do Fastify permite explicitamente as origens corretas (`APP_URL`) sem wildcard `*` em produção.

## 2. Tipagem Compartilhada (Zod / TypeScript)
Atualmente `/web` e `/api` possuem seus próprios esquemas.
- **Ação Recomendada:** Criar um pacote interno local (Monorepo Workspace) ou uma pasta `shared/types` para compartilhar schemas do Zod entre o Frontend e a API. Isso evita que uma mudança na API quebre silenciosamente o formulário do Frontend.

## 3. Gestão de Estado da Sessão (Supabase)
O interceptor do axios (`apiClient.ts` no frontend) recupera a sessão ativa do Supabase em cada request:
```typescript
const { data: { session } } = await supabase.auth.getSession();
```
Isso é feito de forma assíncrona iterativa, o que adiciona latência e carga na rede (se acionar local storage lento).
- **Otimização:** Armazenar o token localmente no estado global (Context/Zustand) ou memória após o login inicial, atualizá-lo reativamente via os listeners de estado da autenticação (`onAuthStateChange`), e injetá-lo de forma síncrona/direta no header do axios.

## 4. Variáveis de Ambiente
A API valida firmemente as `CORE_ENV_VARS` e lança erros fatais. Manter essa prática. No entanto, é fundamental que o ambiente de dev local garanta resiliência. Considere logs descritivos para falhas de webhook.