import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { build } from './app.js'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.SENTRY_DSN),
})

const CORE_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'MERCADOPAGO_ACCESS_TOKEN',
  'MERCADOPAGO_PUBLIC_KEY',
  'API_URL',
  'APP_URL',
] as const

const OPTIONAL_ENV_VARS = [
  'APP_URLS',
  'RESEND_API_KEY',
  'CRON_SECRET',
] as const

const start = async () => {
  try {
    const missingCoreVars = CORE_ENV_VARS.filter((key) => !process.env[key])
    if (missingCoreVars.length > 0) {
      throw new Error(
        `Variavel de ambiente obrigatoria ausente: ${missingCoreVars.join(', ')}`
      )
    }

    if (process.env.NODE_ENV === 'production' && !process.env.MERCADOPAGO_WEBHOOK_SECRET) {
      throw new Error(
        'Variavel de ambiente obrigatoria ausente em producao: MERCADOPAGO_WEBHOOK_SECRET'
      )
    }

    const missingOptionalVars = OPTIONAL_ENV_VARS.filter((key) => !process.env[key])
    if (missingOptionalVars.length > 0) {
      console.warn(
        `Variaveis opcionais ausentes: ${missingOptionalVars.join(', ')}. ` +
        'Rotas relacionadas podem ficar indisponiveis ate a configuracao ser concluida.'
      )
    }

    const fastify = await build()
    const port = Number(process.env.PORT ?? 3001)
    const host = '0.0.0.0'

    await fastify.listen({ port, host })
    fastify.log.info(`IsidisApp API rodando em http://${host}:${port}`)
  } catch (err) {
    Sentry.captureException(err)
    await Sentry.close(2000)
    console.error('Erro fatal ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
