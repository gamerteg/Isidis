FROM node:22-alpine AS builder

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_URL=https://isidis.com.br

ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV VITE_APP_URL=${VITE_APP_URL}

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN test -n "${VITE_API_URL}" || (echo "VITE_API_URL build arg is required." >&2 && exit 1)
RUN test -n "${VITE_SUPABASE_URL}" || (echo "VITE_SUPABASE_URL build arg is required." >&2 && exit 1)
RUN test -n "${VITE_SUPABASE_ANON_KEY}" || (echo "VITE_SUPABASE_ANON_KEY build arg is required." >&2 && exit 1)

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
