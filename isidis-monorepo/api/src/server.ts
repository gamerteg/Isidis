import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'

// Plugins
import supabasePlugin from './plugins/supabase.js'
import resendPlugin from './plugins/resend.js'
import authPlugin from './plugins/auth.js'
import asaasPlugin from './plugins/asaas.js'

// Routes
import authRoutes from './routes/auth/index.js'
import readersRoutes from './routes/readers/index.js'
import gigsRoutes from './routes/gigs/index.js'
import ordersRoutes from './routes/orders/index.js'
import walletRoutes from './routes/wallet/index.js'
import checkoutRoutes from './routes/checkout/index.js'
import asaasWebhookRoute from './routes/webhooks/asaas.js'
import cronRoutes from './routes/crons/index.js'
import deliveryRoutes from './routes/delivery/index.js'
import messagesRoutes from './routes/messages/index.js'
import notificationsRoutes from './routes/notifications/index.js'
import quizRoutes from './routes/quiz/index.js'

const build = async () => {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Security & Parsing
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.APP_URL!, 'https://isidis.com.br']
      : true,
    credentials: true,
  })
  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  })

  // Plugins
  await fastify.register(supabasePlugin)
  await fastify.register(resendPlugin)
  await fastify.register(authPlugin)
  await fastify.register(asaasPlugin)

  // Health check
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))

  // Routes
  await fastify.register(authRoutes)
  await fastify.register(readersRoutes)
  await fastify.register(gigsRoutes)
  await fastify.register(ordersRoutes)
  await fastify.register(walletRoutes)
  await fastify.register(checkoutRoutes)
  await fastify.register(asaasWebhookRoute)
  await fastify.register(cronRoutes)
  await fastify.register(deliveryRoutes)
  await fastify.register(messagesRoutes)
  await fastify.register(notificationsRoutes)
  await fastify.register(quizRoutes)

  return fastify
}

const start = async () => {
  try {
    const required = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'ASAAS_API_KEY',
      'RESEND_API_KEY',
      'CRON_SECRET',
    ]

    for (const key of required) {
      if (!process.env[key]) {
        throw new Error(`Variavel de ambiente obrigatoria ausente: ${key}`)
      }
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
