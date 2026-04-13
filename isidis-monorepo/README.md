# Isidis — Monorepo

Plataforma de consultas espirituais e tarot online.

## Estrutura do projeto

```
isidis-monorepo/
├── api/     # API REST (Node.js + Fastify + TypeScript)
├── app/     # App Flutter multiplataforma (Web + Android + iOS)
├── admin/   # Painel administrativo (React + Vite)
└── docs/    # Documentação técnica
```

## Projetos

### `api/` — API REST
- **Stack:** Node.js, Fastify, TypeScript
- **Deploy:** Vercel (serverless)
- **Responsabilidades:** autenticação, pagamentos (Asaas/Stripe), pedidos, carteiras, webhooks, crons

```bash
cd api
npm install
npm run dev
```

### `app/` — App Flutter (Web + Android + iOS)
- **Stack:** Flutter / Dart
- **Deploy Web:** Vercel (`flutter build web`)
- **Deploy Android:** Google Play Store
- **Deploy iOS:** Apple App Store
- **Responsabilidades:** toda a interface do usuário — marketplace, checkout, chat, carteira, pedidos

```bash
cd app
flutter pub get

# Rodar localmente (web)
flutter run -d chrome

# Rodar localmente (mobile)
flutter run

# Build web para deploy
flutter build web --release
```

### `admin/` — Painel Admin
- **Stack:** React, Vite, TypeScript
- **Deploy:** Vercel / Servidor próprio
- **Responsabilidades:** gestão de usuários, cartomantes, pedidos, aprovações, relatórios financeiros

```bash
cd admin
npm install
npm run dev
```

## Variáveis de ambiente

Cada projeto tem seu próprio `.env.example` com as variáveis necessárias. Copie e preencha:

```bash
cp api/.env.example api/.env
# preencha as variáveis em api/.env
```

## Banco de dados

O banco de dados é gerenciado pelo **Supabase**. As migrations estão em `api/migrations/`.
