# 🏷️ Estratégia de Tipagem (TypeScript Shared Types)

Para evitar que mudanças na API quebrem o Frontend silenciosamente, o Isidis deve adotar uma estratégia de tipagem compartilhada.

## 🏗️ Estrutura Recomendada
- **Shared Folder:** Criar um diretório `packages/shared` ou similar no monorepo.
- **Zod Schemas:** Definir os esquemas de validação (inputs de formulários, respostas de API) no shared.
- **Type Extraction:** Exportar os tipos extraídos (`z.infer<typeof schema>`).

## 🛠️ Exemplo de Implementação
1. No Backend (`/api`), o Zod valida o corpo da requisição.
2. No Frontend (`/web`), o mesmo schema alimenta o `react-hook-form` via `zodResolver`.

## 🔄 Sync Automático
- Utilize o comando `supabase gen types typescript` para gerar as interfaces das tabelas do banco automaticamente.
- Mantenha essas interfaces no shared e estenda-as com tipos de negócio específicos (ex: `OrderSummary`, `OrderDetail`).

---

### 🚀 Benefício
Elimina o erro comum de o frontend enviar um campo (ex: `price`) esperando centavos e a API receber esperando reais, ou vice-versa. Tipagem forte garante que o contrato da API seja respeitado em ambas as pontas.