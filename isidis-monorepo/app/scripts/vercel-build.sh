#!/usr/bin/env bash
set -euo pipefail

FLUTTER_ROOT="${HOME}/flutter"
FLUTTER_CHANNEL="${FLUTTER_CHANNEL:-stable}"

if [ ! -x "${FLUTTER_ROOT}/bin/flutter" ]; then
  git clone https://github.com/flutter/flutter.git \
    --depth 1 \
    --branch "${FLUTTER_CHANNEL}" \
    "${FLUTTER_ROOT}"
fi

export PATH="${FLUTTER_ROOT}/bin:${PATH}"

required_vars=(
  API_URL
  SUPABASE_URL
  SUPABASE_ANON_KEY
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required environment variable: ${var_name}"
    echo "Configure it in the Vercel project settings before deploying."
    exit 1
  fi
done

flutter config --enable-web
flutter precache --web
flutter pub get

flutter build web --release \
  --dart-define=API_URL="${API_URL}" \
  --dart-define=SUPABASE_URL="${SUPABASE_URL}" \
  --dart-define=SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}"
