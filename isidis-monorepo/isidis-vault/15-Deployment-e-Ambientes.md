# 🚀 Deployment e Ambientes

Padronização de ambientes Local, Staging e Produção.

## 🔗 Sincronização de Variáveis (`.env`)
- **Local:** `.env`
- **Exemplo:** `.env.example` (deve ser mantido atualizado com todas as chaves, sem os valores).
- **Produção:** Gerenciado via plataforma de deploy (Vercel/Render/VPS).

## 🐋 Dockerização
- **Frontend:** Dockerfile com Nginx para servir o build estático do Vite.
- **Backend:** Dockerfile com Node.js (distroless ou alpine) para rodar o Fastify.
- **Orquestração:** `docker-compose.yml` para rodar ambos localmente com as configurações corretas de rede.

## 🔄 Fluxo de CI/CD (GitHub Actions)
1. **Lint & Typecheck:** Validar código em todo Push.
2. **Tests:** Rodar suíte de testes automáticos.
3. **Build:** Gerar artefatos de produção.
4. **Deploy:** Enviar para o ambiente de destino.

---

### ⚠️ Ponto de Atenção
Sempre que houver uma alteração no banco de dados, as **Migrations** devem ser rodadas no ambiente de Staging antes da Produção para evitar perda de dados.