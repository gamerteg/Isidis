# 🚨 Monitoramento e Gestão de Erros

Um sistema de missão crítica como o Isidis (que envolve pagamentos) não pode falhar no escuro.

## 📊 Backend (Sentry + Fastify)
- **Error Handler:** Implementar um handler global no Fastify que capture exceções não tratadas e as envie para o Sentry.
- **Logs:** Usar o `pino` (nativo do Fastify) para logs estruturados, facilitando o debug via CloudWatch ou Datadog.

## 🎨 Frontend (UI/UX de Erros)
- **Toasts:** Usar o `sonner` (já instalado) para notificações globais de sucesso/erro.
- **Boundary:** Envolver rotas principais com `ErrorBoundary` do React para evitar que a aplicação inteira quebre (tela branca) em caso de erro em um componente isolado.
- **Formulários:** Validação em tempo real com mensagens de erro claras abaixo de cada input (via Zod + React Hook Form).

## 📡 API Client
- **Interceptores:** O `apiClient.ts` deve interceptar erros `401` (sessão expirada) para deslogar o usuário e erros `500` para mostrar um Toast genérico de "Erro no Servidor".

---

### 🛡️ Regra de Segurança
Nunca mostre erros brutos do banco de dados ou stack traces para o usuário final. Sempre mapeie erros internos para mensagens amigáveis no frontend.