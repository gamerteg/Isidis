# Spec: Mitigacao de login/cadastro e Login com Google

## Contexto

O app web do Isidis usa React/Vite, React Router e Supabase Auth. Hoje os fluxos principais estao em:

- `web/src/pages/auth/Login.tsx`
- `web/src/pages/auth/Register.tsx`
- `web/src/lib/auth/actions.ts`
- `web/src/lib/bootstrap.ts`
- `web/src/hooks/useAuth.ts`
- `web/src/routes/index.tsx`
- `web/supabase/migrations/*`

Antes de adicionar Login com Google, precisamos reduzir os erros do login/cadastro atual. O fluxo de auth ainda usa `useActionState` com funcoes client-side em `actions.ts`, redireciona com `window.location.href`, depende de `user_metadata.role` em alguns momentos e faz `upsert` direto em `profiles` apos `signUp`. Isso torna o comportamento sensivel a falhas parciais: usuario criado sem perfil completo, profile salvo com erro, mensagens genericas, redirect inconsistente e dificuldade de recuperar o fluxo quando algo quebra.

## Objetivo

Entregar um fluxo de autenticacao mais previsivel e adicionar entrada com Google para usuarios consulentes, sem quebrar o cadastro completo de cartomantes.

O projeto deve terminar com:

- Login por email/senha com erros claros, loading e redirect consistente.
- Cadastro por email/senha com validacao, salvamento de perfil idempotente e tratamento de falhas parciais.
- Login com Google disponivel na tela de login e, se fizer sentido para UX, na etapa inicial de cadastro de consulente.
- Callback OAuth dedicado para finalizar a sessao, garantir `profiles` e redirecionar o usuario.
- Documentacao de variaveis/configuracao necessarias no Supabase e ambientes.
- Testes cobrindo os fluxos criticos.

## Escopo

### Dentro do escopo

- Refatorar login e cadastro web para submissao client-side explicita (`onSubmit`) ou hook dedicado, removendo dependencia fragil de `useActionState` para esses fluxos.
- Criar camada de servico de auth no frontend para centralizar:
  - login por senha;
  - cadastro por senha;
  - login OAuth Google;
  - callback OAuth;
  - criacao/atualizacao idempotente de `profiles`;
  - calculo de destino pos-login.
- Criar rota de callback, por exemplo `/auth/callback`, usando `supabase.auth.exchangeCodeForSession` quando aplicavel.
- Garantir que usuarios Google recebam perfil default `CLIENT` quando nao houver perfil existente.
- Preservar fluxo de cartomante como cadastro completo por formulario, com documentos e dados fiscais/profissionais.
- Padronizar mensagens de erro em portugues.
- Sanitizar `next` e manter redirects seguros.
- Atualizar ou criar migracao SQL se for necessario fortalecer schema, indices ou funcoes auxiliares de `profiles`.
- Validar manualmente e/ou via testes:
  - login email/senha;
  - erro de senha invalida;
  - cadastro de consulente;
  - cadastro de cartomante;
  - login Google novo usuario;
  - login Google usuario existente;
  - redirects com `next`.

### Fora do escopo

- Login Google para o admin.
- Cadastro simplificado de cartomante via Google com documentos depois. Isso pode ser uma fase futura.
- Mudanca de provedor de auth.
- Reescrita visual completa das telas de login/cadastro.
- Backoffice para vincular/desvincular provedores sociais.

## Diagnostico tecnico inicial

### Pontos de risco observados

- `Login.tsx` e `Register.tsx` usam `useActionState` com funcoes que executam no cliente. Isso funciona de forma limitada, mas mistura padrao de Server Action com Vite e dificulta controle fino de estado, loading e navegacao.
- `actions.ts` usa `window.location.href`; em React Router, `navigate()` ou uma funcao de redirect coordenada evita reloads desnecessarios e melhora previsibilidade.
- O cadastro cria o usuario no Supabase Auth e depois faz `upsert` em `profiles`. Se o `upsert` falhar, fica uma conta criada com perfil incompleto.
- O fluxo usa `user_metadata.role` e depois confirma em `profiles`. O `profiles` deve ser a fonte de verdade sempre que existir.
- O cadastro de cartomante faz upload de documentos antes de confirmar que o perfil foi salvo com sucesso. Falhas intermediarias precisam ser recuperaveis.
- Ha textos com problemas de encoding em telas de auth, como `NÃ£o`, `PrÃ³ximo`, `MÃ­stico`.
- Nao ha rota `/auth/callback` cadastrada hoje; existe apenas `/auth/auth-code-error`.
- As migracoes iniciais permitem `profiles` inserido pelo proprio usuario, mas nao ha trigger `on_auth_user_created` visivel nas migracoes atuais. OAuth precisa de um mecanismo idempotente para criar perfil.

## Requisitos funcionais

### Login email/senha

- Como usuario, quero informar email e senha para entrar.
- Se as credenciais estiverem erradas, devo ver `Email ou senha incorretos.`
- Se minha conta existir mas houver problema de perfil, devo entrar em uma rota segura de recuperacao/onboarding, nao ficar preso em erro generico.
- Se eu vier de uma rota protegida com `?next=...`, devo voltar para esse destino se ele for interno e permitido.

### Cadastro de consulente

- Como consulente, quero criar conta com nome, email, senha, sexo, CPF e celular.
- O CPF deve ser validado antes de enviar.
- Ao criar a conta, o perfil deve ser salvo com role `CLIENT`, `full_name`, `sexo`, `tax_id`/`cpf_cnpj` e `cellphone`.
- Se o Supabase exigir confirmacao de email, o usuario deve ser levado para `/register/confirm`.
- Se a sessao for criada imediatamente, o destino deve ser definido por `getPostAuthDestination`.
- Se o perfil falhar apos usuario criado, a UI deve exibir erro recuperavel e a proxima tentativa deve conseguir completar o perfil sem duplicar usuario.

### Cadastro de cartomante

- Como cartomante, quero preencher cadastro completo com dados pessoais, endereco, documentos, biografia, especialidades e Pix.
- O fluxo deve continuar exigindo documentos antes de finalizar.
- Ao criar a conta, o perfil deve ser salvo como `READER` com `verification_status = 'PENDING'`.
- Em caso de falha parcial, a mensagem deve informar se a conta foi criada e qual acao o usuario deve tomar.

### Login com Google

- Como usuario, quero clicar em `Continuar com Google` e autenticar pelo Google.
- O login Google deve usar `supabase.auth.signInWithOAuth({ provider: 'google' })`.
- O `redirectTo` deve apontar para `${origin}/auth/callback` e preservar `next` quando houver.
- No callback, o app deve:
  - trocar o code por sessao quando necessario;
  - ler o usuario autenticado;
  - garantir que exista um `profiles` para o usuario;
  - criar perfil default `CLIENT` se nao existir;
  - preencher `full_name` e `avatar_url` a partir dos metadados do Google quando disponiveis;
  - redirecionar com `getPostAuthDestination`.
- Se o usuario ja tiver perfil `READER`, o Login com Google deve respeitar o role existente.
- Se houver erro no OAuth, redirecionar para `/auth/auth-code-error` com uma mensagem amigavel ou exibir a tela de erro atual melhorada.

## Requisitos nao funcionais

- Nao expor service role no frontend.
- Nao aceitar redirects externos via `next`.
- Evitar duplicacao de perfis e tratar `profiles.id` como chave idempotente.
- Evitar logs com dados sensiveis como CPF, Pix, telefone ou documentos.
- Preservar compatibilidade mobile.
- Fluxos devem funcionar com Vite e React Router.
- O codigo deve permanecer tipado em TypeScript e passar `npm run build`.

## Proposta de arquitetura

### Frontend

Criar um modulo dedicado:

- `web/src/lib/auth/service.ts`

Responsabilidades:

- `signInWithPassword(input)`
- `signUpWithPassword(input)`
- `signInWithGoogle(options)`
- `handleOAuthCallback(searchParams)`
- `ensureUserProfile(user, defaults)`
- `mapAuthError(error)`

As paginas `Login.tsx` e `Register.tsx` passam a chamar esse servico em handlers `onSubmit`. O estado de loading/erro fica local ou em hooks pequenos.

### Rotas

Adicionar:

- `web/src/pages/auth/AuthCallback.tsx`
- rota `/auth/callback` em `web/src/routes/index.tsx`

Manter:

- `/auth/auth-code-error`
- `/register/confirm`
- `/recover`
- `/update-password`

### Dados

Fonte de verdade para role:

1. `profiles.role`, quando o perfil existir.
2. `user.user_metadata.role`, apenas como fallback no primeiro acesso.
3. `CLIENT`, para usuario Google novo sem perfil.

Possivel migracao:

- `web/supabase/migrations/37_auth_profile_hardening.sql`

Conteudo esperado, se necessario:

- indices uteis em `profiles(role)`;
- funcao RPC `ensure_profile_for_current_user` com `security definer`, se o upsert direto pelo cliente seguir falhando por RLS;
- ou trigger `on_auth_user_created` para criar perfil minimo em toda criacao de usuario.

A decisao entre RPC/trigger deve ser tomada apos validar o comportamento real do Supabase no ambiente. Preferencia: usar trigger para perfil minimo e manter atualizacao de campos pelo usuario autenticado.

### Hardening aplicado

- Criada migration `web/supabase/migrations/37_auth_profile_hardening.sql`.
- A migration adiciona trigger `on_auth_user_created` em `auth.users`.
- O trigger cria `profiles` minimo com `role = 'CLIENT'`, `full_name` e `avatar_url` quando existirem nos metadados.
- O trigger e o backfill sao idempotentes e nao sobrescrevem `role` existente.
- O frontend continua chamando `ensureUserProfile`; se o trigger ja criou um perfil minimo, o servico completa apenas campos vazios como `sexo`, `tax_id`, `cpf_cnpj` e `cellphone`, sem alterar `role`.

## Configuracao necessaria

No Supabase Dashboard:

- Habilitar provider Google em Authentication > Providers.
- Configurar Google Client ID e Client Secret.
- Adicionar redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/callback`
  - URL de preview/staging, se existir
  - URL de producao, por exemplo `https://<dominio>/auth/callback`
- Confirmar Site URL do projeto.
- Projeto Supabase atual do `.env`: `https://sjwgovfexzqkhdsfcsyb.supabase.co`

No Google Cloud Console:

- Criar OAuth Client para Web.
- Adicionar Authorized redirect URI do Supabase:
  - `https://sjwgovfexzqkhdsfcsyb.supabase.co/auth/v1/callback`
- Conferir tela de consentimento OAuth.

No `.env` web:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- opcional: `VITE_APP_URL`, se decidirmos nao depender de `window.location.origin`.

## Criterios de aceite

- `npm run build` em `web` finaliza sem erro.
- Login por senha redireciona corretamente para dashboard/onboarding conforme perfil.
- Login por senha invalida mostra mensagem amigavel e nao recarrega a pagina sem necessidade.
- Cadastro de consulente cria `auth.users` e `profiles` coerentes.
- Cadastro de cartomante cria `profiles.role = 'READER'` e `verification_status = 'PENDING'`.
- Login Google cria sessao e perfil `CLIENT` para usuario novo.
- Login Google com usuario existente nao sobrescreve role nem dados sensiveis existentes.
- `next` externo ou malicioso e ignorado.
- Callback com erro leva a uma tela de erro compreensivel.
- Nao ha logs de CPF/Pix/documentos no console.

## Riscos e mitigacoes

- **Email ja cadastrado com senha e tentativa via Google:** validar comportamento do Supabase para account linking. Se nao houver link automatico, mostrar erro claro e orientar login por senha.
- **Perfil incompleto criado por falha parcial:** tornar `ensureUserProfile` idempotente e chamar no login/callback.
- **RLS bloqueando upsert:** usar trigger ou RPC `security definer` limitada ao usuario autenticado.
- **Redirect incorreto em producao:** documentar URLs e validar callback em local e ambiente publicado.
- **Cadastro de cartomante pesado no cliente:** manter fase atual, mas encapsular uploads e salvar perfil em etapas recuperaveis.

## Plano de rollout

1. Corrigir base de login/cadastro por email/senha.
2. Adicionar callback OAuth e garantir perfil.
3. Adicionar botao Google e configuracao.
4. Validar localmente com ambiente Supabase.
5. Publicar em staging/preview e validar redirect real.
6. Publicar em producao apos configurar URLs finais.
