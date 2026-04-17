FROM debian:bookworm-slim AS builder

ARG FLUTTER_CHANNEL=stable
ARG API_URL
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG MERCADOPAGO_ENV=sandbox

ENV DEBIAN_FRONTEND=noninteractive
ENV FLUTTER_HOME=/opt/flutter
ENV PATH="${FLUTTER_HOME}/bin:${FLUTTER_HOME}/bin/cache/dart-sdk/bin:${PATH}"

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        curl \
        git \
        libglu1-mesa \
        unzip \
        xz-utils \
        zip \
    && rm -rf /var/lib/apt/lists/*

RUN git clone https://github.com/flutter/flutter.git \
      --depth 1 \
      --branch "${FLUTTER_CHANNEL}" \
      "${FLUTTER_HOME}"

RUN flutter config --enable-web \
    && flutter precache --web

WORKDIR /app

COPY pubspec.yaml pubspec.lock ./
RUN flutter pub get

COPY . .

RUN test -n "${API_URL}" || (echo "API_URL build arg is required." >&2 && exit 1)
RUN test -n "${SUPABASE_URL}" || (echo "SUPABASE_URL build arg is required." >&2 && exit 1)
RUN test -n "${SUPABASE_ANON_KEY}" || (echo "SUPABASE_ANON_KEY build arg is required." >&2 && exit 1)

RUN flutter build web --release \
      --dart-define=API_URL="${API_URL}" \
      --dart-define=SUPABASE_URL="${SUPABASE_URL}" \
      --dart-define=SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
      --dart-define=MERCADOPAGO_ENV="${MERCADOPAGO_ENV}"

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
