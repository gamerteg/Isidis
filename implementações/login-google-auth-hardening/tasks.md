# Tasks: Mitigacao de login/cadastro e Login com Google

## 1. Levantamento e reproducao dos erros atuais

**Objetivo:** identificar exatamente quais erros estao acontecendo antes de alterar o fluxo.

**Acoes:**

- Rodar `npm run build` em `web`.
- Testar manualmente `/login` com credenciais invalidas.
- Testar cadastro de consulente ate `/register/confirm`.
- Testar cadastro de cartomante com arquivos pequenos.
- Registrar mensagens de console e respostas do Supabase.
- Conferir se `profiles` e criado/atualizado em cada cadastro.

**Retorno esperado:**

- Lista curta dos erros reproduzidos com passo a passo.
- Evidencia de quais arquivos/trechos causam cada erro.
- Decisao documentada: upsert client-side e suficiente ou sera necessario trigger/RPC.

## 2. Criar camada central de auth

**Objetivo:** remover regra de negocio de auth das paginas e centralizar tratamento de erros/redirects.

**Acoes:**

- Criar `web/src/lib/auth/service.ts`.
- Implementar `mapAuthError`.
- Implementar `ensureUserProfile`.
- Implementar `signInWithPassword`.
- Implementar `signUpWithPassword`.
- Implementar `signInWithGoogle`.
- Implementar helper para limpar CPF/telefone sem espalhar logica.
- Remover logs com dados sensiveis.

**Retorno esperado:**

- Um servico tipado e reutilizavel.
- Login/cadastro/OAuth usando a mesma fonte de regras.
- Erros padronizados em portugues.

## 3. Refatorar Login

**Objetivo:** tornar `/login` previsivel, com loading e sem depender de `useActionState`.

**Acoes:**

- Alterar `web/src/pages/auth/Login.tsx` para `onSubmit`.
- Usar `useNavigate` para redirecionamento.
- Usar `signInWithPassword` do servico.
- Preservar `next` via `useSearchParams`.
- Adicionar botao `Continuar com Google`.
- Corrigir textos com encoding quebrado.
- Desabilitar botoes durante envio.

**Retorno esperado:**

- Login por senha funcionando sem reload desnecessario.
- Erro de credencial invalida exibido inline.
- Botao Google inicia OAuth com `redirectTo` correto.
- `next` interno continua funcionando.

## 4. Refatorar Cadastro

**Objetivo:** reduzir falhas parciais no cadastro de consulente e cartomante.

**Acoes:**

- Alterar `web/src/pages/auth/Register.tsx` para submissao controlada.
- Manter validacoes por etapa.
- Enviar dados para `signUpWithPassword`.
- Garantir que `CLIENT` e `READER` usem payloads claros.
- Preservar upload de documentos de cartomante, mas isolar tratamento de erro.
- Corrigir textos com encoding quebrado.
- Ajustar mensagem quando a conta e criada mas o perfil precisa ser completado.

**Retorno esperado:**

- Cadastro de consulente cria auth user e profile.
- Cadastro de cartomante salva dados e documentos ou falha com mensagem acionavel.
- Tentativa repetida nao cria duplicidade nem deixa usuario sem caminho de recuperacao.

## 5. Criar callback OAuth

**Objetivo:** finalizar Login com Google e redirecionar corretamente.

**Acoes:**

- Criar `web/src/pages/auth/AuthCallback.tsx`.
- Adicionar rota `/auth/callback` em `web/src/routes/index.tsx`.
- Chamar `supabase.auth.exchangeCodeForSession` quando houver `code`.
- Tratar `error` e `error_description` vindos da URL.
- Buscar usuario autenticado.
- Chamar `ensureUserProfile` com default `CLIENT`.
- Chamar `getPostAuthDestination`.
- Redirecionar com `navigate(..., { replace: true })`.

**Retorno esperado:**

- Callback carrega estado visual simples.
- Usuario Google novo termina no onboarding/dashboard de consulente.
- Usuario existente respeita role de `profiles`.
- Erros levam para `/auth/auth-code-error` ou mensagem equivalente.

## 6. Fortalecer schema/RLS se necessario

**Objetivo:** garantir que perfil minimo sempre exista e que OAuth nao dependa de sorte no upsert.

**Acoes:**

- Se o upsert autenticado falhar, criar migracao `web/supabase/migrations/37_auth_profile_hardening.sql`.
- Preferir trigger `on_auth_user_created` para inserir perfil minimo.
- Alternativa: criar RPC `ensure_profile_for_current_user` com `security definer`, limitada a `auth.uid()`.
- Garantir que a migracao nao sobrescreva roles existentes.
- Conferir politicas RLS de `profiles`.

**Retorno esperado:**

- Perfil minimo criado de forma idempotente para senha e Google.
- Login/callback nao quebram quando `profiles` ainda nao existe.
- Nenhuma permissao ampla indevida no banco.

## 7. Configurar Google OAuth nos ambientes

**Objetivo:** deixar a integracao pronta fora do codigo.

**Acoes:**

- Habilitar Google provider no Supabase.
- Configurar Client ID e Client Secret do Google.
- Cadastrar redirect URLs local, staging e producao.
- Conferir Site URL.
- Documentar configuracao em `implementações/login-google-auth-hardening/spec.md` se algum valor real precisar ser lembrado.

**Retorno esperado:**

- OAuth Google abre consentimento e retorna para `/auth/callback`.
- Ambiente local validado com `http://localhost:5173/auth/callback`.
- Lista de URLs finais conferida antes de producao.

## 8. Testes automatizados

**Objetivo:** proteger os fluxos mais frageis contra regressao.

**Acoes:**

- Criar testes unitarios para `sanitizeNextPath`.
- Criar testes para `mapAuthError`.
- Criar testes para `ensureUserProfile` com mocks do Supabase.
- Criar teste de render/interaction do Login para erro de credencial.
- Criar teste do callback OAuth para sucesso e erro.

**Retorno esperado:**

- `npm run test` passa em `web`.
- Casos de erro comuns ficam cobertos.
- Redirect externo via `next` fica explicitamente bloqueado por teste.

## 9. Validacao final

**Objetivo:** confirmar comportamento ponta a ponta antes de considerar pronto.

**Acoes:**

- Rodar `npm run build` em `web`.
- Testar login por senha com usuario existente.
- Testar senha errada.
- Testar cadastro de consulente novo.
- Testar cadastro de cartomante novo.
- Testar Login com Google usuario novo.
- Testar Login com Google usuario existente.
- Testar acesso a rota protegida com `?next=`.
- Conferir console sem vazamento de CPF/Pix/documentos.

**Retorno esperado:**

- Build e testes passando.
- Checklist manual preenchido.
- Fluxos de login, cadastro e Google OAuth aprovados para deploy.

## 10. Deploy e monitoramento inicial

**Objetivo:** publicar com risco controlado e observar falhas reais.

**Acoes:**

- Publicar em preview/staging.
- Validar OAuth com URL real de preview.
- Ajustar redirect URLs no Supabase/Google se necessario.
- Publicar em producao.
- Monitorar logs de auth/callback e relatos de usuarios nas primeiras horas.

**Retorno esperado:**

- Funcionalidade ativa em producao.
- Nenhum aumento de erro em login/cadastro.
- Qualquer erro restante registrado como task de follow-up com reproducao.

