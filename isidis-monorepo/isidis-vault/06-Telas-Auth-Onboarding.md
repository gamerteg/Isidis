# 🔐 Análise Detalhada: Telas de Autenticação e Onboarding

O fluxo de autenticação e o primeiro acesso (Onboarding) são críticos para a retenção do usuário.

## 🔑 Login (`/login`)

### 🔍 Estado Atual
- **Erro Crítico:** Uso de `useActionState` e importação de `login` de `@/app/auth/actions`. Isso é um padrão de Next.js Server Actions que não funciona nativamente no Vite como se imagina.
- **UX Mobile:** O formulário pode ficar "esmagado" em teclados virtuais que ocupam muito espaço.

### 🚀 Como Melhorar
1.  **Refatoração para API:** Mudar o `form action` para um `onSubmit` convencional que chame uma função assíncrona. Esta função deve usar o `apiClient` para falar com o endpoint de login da API (ou direto com o Supabase Client).
2.  **Gerenciamento de Erros:** Usar `react-hook-form` com `zod` para validação no lado do cliente antes mesmo de enviar para o servidor.
3.  **Ajuste Visual:** Adicionar `pb-[env(safe-area-inset-bottom)]` e garantir que o container do formulário seja rolável se o teclado cobrir o campo de senha.

---

## 📝 Registro (`/register`)

### 🔍 Estado Atual
- **Erro:** Muitas vezes o registro falha silenciosamente se o usuário já existe ou se a senha é fraca demais (padrão Supabase).

### 🚀 Como Melhorar
1.  **Feedback em Tempo Real:** Validar a força da senha enquanto o usuário digita.
2.  **Fluxo de Papel (Role):** Garantir que a seleção entre "Consulente" e "Cartomante" seja extremamente clara no mobile (usar cards grandes com ícones, não apenas um rádio pequeno).

---

## 🧭 Quiz de Onboarding (`/quiz-onboarding`)

### 🔍 Estado Atual
- **Erro:** Telas de quiz longas em mobile cansam o usuário. Se ele fechar o app, perde o progresso.

### 🚀 Como Melhorar
1.  **Persistência Local:** Salvar as respostas no `localStorage` a cada passo concluído. Se o usuário voltar, ele retoma de onde parou.
2.  **Micro-interações:** Adicionar uma barra de progresso no topo e animações suaves de transição (ex: `framer-motion`) entre as perguntas para dar a sensação de avanço rápido.
3.  **Mobile-First:** Botões de resposta devem ser largos (full width) para facilitar o clique com o polegar.