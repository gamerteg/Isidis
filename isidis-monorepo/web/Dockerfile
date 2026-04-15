FROM node:22-alpine AS builder

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_URL=https://isidis.com.br

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN test -n "${VITE_API_URL}" || (echo "VITE_API_URL build arg is required." >&2 && exit 1)
RUN test -n "${VITE_SUPABASE_URL}" || (echo "VITE_SUPABASE_URL build arg is required." >&2 && exit 1)
RUN test -n "${VITE_SUPABASE_ANON_KEY}" || (echo "VITE_SUPABASE_ANON_KEY build arg is required." >&2 && exit 1)

RUN VITE_API_URL="${VITE_API_URL}" \
    VITE_SUPABASE_URL="${VITE_SUPABASE_URL}" \
    VITE_SUPABASE_ANON_KEY="${VITE_SUPABASE_ANON_KEY}" \
    VITE_APP_URL="${VITE_APP_URL}" \
    npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
