# Task 1: Levantamento e reproducao dos erros atuais

Data: 2026-05-14

## Resumo

Diagnostico executado nos fluxos publicos de autenticacao. O cadastro publico de cartomantes foi tratado como fora de escopo, conforme decisao atual: cartomantes serao registrados via painel admin.

## Ambiente e build

- App web: `isidis-monorepo/web`
- Dev server: `http://127.0.0.1:3000/`
- Comando: `npm run build`
- Resultado: sucesso.
- Warnings observados:
  - Vite detectou `vite-tsconfig-paths` e recomenda migrar para `resolve.tsconfigPaths: true`.

## Reproducao: login invalido

Passos:

1. Abrir `/login`.
2. Preencher email inexistente e senha invalida.
3. Enviar o formulario.

Resultado observado:

- A tela carregou com conteudo e sem overlay de erro.
- A UI exibiu `Email ou senha incorretos.`
- A URL permaneceu em `/login`.
- Supabase respondeu ao fluxo de senha com erro de credencial invalida.
- Console registrou `Login error: Invalid login credentials`.

Trechos relacionados:

- `web/src/pages/auth/Login.tsx` usa `useActionState`.
- `web/src/lib/auth/actions.ts` chama `supabase.auth.signInWithPassword`.
- `web/src/lib/auth/actions.ts` redireciona com `window.location.href`.

## Reproducao: cadastro de consulente

Dados descartaveis usados:

- Email: `isidis.task1.20260514135028@example.com`
- Nome: `Task1 Client 20260514135028`
- CPF valido de teste: `529.982.247-25`

Passos:

1. Abrir `/register`.
2. Escolher `Quero Consultar`.
3. Preencher nome, sexo, email, senha, confirmacao, CPF e celular.
4. Enviar o formulario.

Resultado observado:

- A tela inicial de cadastro ainda mostra `Sou Cartomante`; isso contradiz o novo escopo e deve ser removido/redirecionado nas proximas tasks.
- O cadastro de consulente redirecionou para `/register/confirm`.
- A chamada `auth/v1/signup` retornou sucesso.
- O `profiles.upsert` retornou sucesso.
- O profile foi encontrado no Supabase com:
  - `role = CLIENT`
  - `full_name = Task1 Client 20260514135028`
  - `sexo = feminino`
  - `tax_id = 52998224725`
  - `cpf_cnpj = 52998224725`
  - `cellphone = 11999999999`

Trechos relacionados:

- `web/src/pages/auth/Register.tsx` usa `useActionState`.
- `web/src/lib/auth/actions.ts` chama `supabase.auth.signUp`.
- `web/src/lib/auth/actions.ts` faz `profiles.upsert` depois de criar o usuario.
- `web/src/lib/auth/actions.ts` registra `SIGNUP PROFILE ATTEMPT` no console com o payload do perfil, o que pode expor CPF e telefone.

## Reproducao: redirects com next

Observacao atual:

- `/login?next=/dashboard` preserva `/dashboard` em input hidden.
- `/login?next=https://evil.example/path` tambem preserva a URL externa em input hidden.
- `getPostAuthDestination` possui `sanitizeNextPath` e deve bloquear destino externo no momento do calculo do redirect, mas a tela ainda carrega o valor externo sem limpeza previa.

Decisao para proximas tasks:

- Manter sanitizacao centralizada no servico de auth.
- Evitar carregar/preservar `next` externo na tela quando o login for refatorado.

## Evidencias estaticas

- `profiles` permite insert/update do proprio usuario via RLS em `00_initial_schema.sql`.
- Nao foi encontrada trigger `on_auth_user_created` para criar profile minimo em toda criacao de usuario.
- Existe trigger de wallet apos insert em `profiles`, mas nao trigger de profile apos insert em `auth.users`.
- Textos com encoding quebrado seguem presentes em `Login.tsx`, `Register.tsx` e `actions.ts`.

## Decisao

Para o cadastro de consulente por email/senha no ambiente atual, o `upsert` client-side em `profiles` foi suficiente: criou/atualizou o profile corretamente.

Ainda assim, para o hardening planejado, a proxima implementacao deve manter `ensureUserProfile` idempotente e considerar trigger/RPC se o OAuth Google ou falhas parciais mostrarem bloqueio por RLS. Como nao ha trigger `on_auth_user_created`, novos fluxos OAuth nao devem depender apenas de sorte do primeiro redirect para completar perfil.

## Itens para as proximas tasks

- Remover ou redirecionar a opcao publica `Sou Cartomante`.
- Remover logs de payload sensivel no cadastro.
- Refatorar login/cadastro para submissao explicita client-side, sem `useActionState`.
- Sanitizar `next` antes de preserva-lo em estado/UI.
- Centralizar `mapAuthError`, `ensureUserProfile` e redirects no novo servico de auth.
