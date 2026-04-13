import 'dotenv/config'
import { build } from './app.js'

const CORE_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
] as const

const OPTIONAL_ENV_VARS = [
  'APP_URL',
  'APP_URLS',
  'ASAAS_API_KEY',
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
    console.error('Erro fatal ao iniciar servidor:', err)
    process.exit(1)
  }
}

start()
