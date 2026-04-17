# Isidis Flutter

Aplicativo Flutter do Isidis com foco atual em deploy web na Vercel e organização incremental por camadas.

## Estrutura

O projeto foi reorganizado para separar melhor entrada da aplicação, configuração de ambiente e infraestrutura:

- `lib/app/`: bootstrap, composição do app e roteamento de alto nível
- `lib/core/`: ambiente, serviços transversais, integrações, tema e regras de plataforma
- `lib/features/`: fluxos e telas agrupados por domínio funcional
- `lib/shared/`: modelos, dados estáticos e widgets reutilizáveis

## Variáveis obrigatórias

O app depende destas variáveis via `--dart-define`:

- `API_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Deploy na Vercel

Arquivos de deploy já preparados:

- [vercel.json](./vercel.json)
- [scripts/vercel-build.sh](./scripts/vercel-build.sh)
- [.vercelignore](./.vercelignore)

Configuração esperada na Vercel:

1. Definir `Root Directory` como `isidis_flutter`
2. Configurar as variáveis `API_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`
3. Executar o deploy

O build publica o diretório `build/web`.

## Limitações atuais da versão web

- pagamento com cartão permanece desabilitado no navegador
- edição e envio de leituras por leitores permanece desabilitado no navegador
- o backend precisa aceitar CORS do domínio publicado

## Comandos úteis

```bash
flutter pub get
flutter analyze
flutter build web --release \
  --dart-define=API_URL=https://api.example.com \
  --dart-define=SUPABASE_URL=https://example.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=example-key
```

## Deploy em VPS com Docker

O diretorio `app/` agora inclui:

- `Dockerfile`
- `nginx.conf`
- `.dockerignore`

Execute os comandos abaixo a partir deste diretorio (`isidis-monorepo/app`).

Build da imagem:

```bash
docker build -t isidis-web \
  --build-arg API_URL=https://api.seudominio.com \
  --build-arg SUPABASE_URL=https://xxxxx.supabase.co \
  --build-arg SUPABASE_ANON_KEY=xxxxx \
  --build-arg MERCADOPAGO_ENV=production \
  .
```

Subir o container:

```bash
docker run -d \
  --name isidis-web \
  --restart unless-stopped \
  -p 8080:80 \
  isidis-web
```

Notas:

- `API_URL`, `SUPABASE_URL` e `SUPABASE_ANON_KEY` sao obrigatorias no `docker build`
- no Flutter web, essas variaveis ficam compiladas no bundle final
- o `nginx.conf` faz fallback para `index.html`, entao rotas SPA continuam funcionando
- se voce usar proxy reverso na VPS, aponte o dominio para `http://127.0.0.1:8080`
