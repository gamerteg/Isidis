# 🧪 Estratégia de Testes

Garantir a integridade do sistema antes de cada deploy.

## 🖥️ Frontend (`/web`)
- **Runner:** `Vitest` (por ser nativo e rápido com Vite).
- **Unitários:** Testar funções utilitárias de cálculo de preço, formatação de datas e lógica de permissões.
- **Componentes:** `React Testing Library` para garantir que botões e formulários disparem os eventos corretos.

## ⚙️ Backend (`/api`)
- **Integração:** Testar rotas completas usando `fastify.inject()`. 
- **Mocks:** Simular chamadas ao Mercado Pago e Supabase para testar a lógica de negócio isoladamente.

## 🐜 E2E (End-to-End)
- **Playwright:** Simular o fluxo completo de um usuário: Login ➔ Busca de Cartomante ➔ Checkout (PIX Mock) ➔ Visualização do Pedido.

---

### 📈 Cobertura de Código
Focar inicialmente em **100% de cobertura nos fluxos financeiros** (Checkout e Webhooks), que são as partes mais sensíveis do Isidis.