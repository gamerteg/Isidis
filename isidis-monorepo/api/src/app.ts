import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'

// Plugins
import supabasePlugin from './plugins/supabase.js'
import resendPlugin from './plugins/resend.js'
import authPlugin from './plugins/auth.js'
import mercadopagoPlugin from './plugins/mercadopago.js'

// Routes
import authRoutes from './routes/auth/index.js'
import readersRoutes from './routes/readers/index.js'
import gigsRoutes from './routes/gigs/index.js'
import ordersRoutes from './routes/orders/index.js'
import walletRoutes from './routes/wallet/index.js'
import checkoutRoutes from './routes/checkout/index.js'
import mercadopagoWebhookRoute from './routes/webhooks/mercadopago.js'
import cronRoutes from './routes/crons/index.js'
import deliveryRoutes from './routes/delivery/index.js'
import messagesRoutes from './routes/messages/index.js'
import notificationsRoutes from './routes/notifications/index.js'
import quizRoutes from './routes/quiz/index.js'
import adminRoutes from './routes/admin/index.js'

function getProductionOrigins() {
  const configuredOrigins = [
    process.env.APP_URL,
    ...(process.env.APP_URLS?.split(',') ?? []),
    'https://isidis.com.br',
    'https://www.isidis.com.br',
    'https://isidis-web.vercel.app',
  ]

  return [...new Set(
    configuredOrigins
      .map((origin) => origin?.trim())
      .filter((origin): origin is string => Boolean(origin))
  )]
}

export async function build() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  const productionOrigins = getProductionOrigins()

  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin:
      process.env.NODE_ENV === 'production'
        ? (origin, callback) => {
            if (!origin || productionOrigins.includes(origin)) {
              callback(null, true)
              return
            }
            callback(null, false)
          }
        : true,
    credentials: true,
  })
  await fastify.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  })

  await fastify.register(supabasePlugin)
  await fastify.register(resendPlugin)
  await fastify.register(authPlugin)
  await fastify.register(mercadopagoPlugin)

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))

  await fastify.register(authRoutes)
  await fastify.register(readersRoutes)
  await fastify.register(gigsRoutes)
  await fastify.register(ordersRoutes)
  await fastify.register(walletRoutes)
  await fastify.register(checkoutRoutes)
  await fastify.register(mercadopagoWebhookRoute)
  await fastify.register(cronRoutes)
  await fastify.register(deliveryRoutes)
  await fastify.register(messagesRoutes)
  await fastify.register(notificationsRoutes)
  await fastify.register(quizRoutes)
  await fastify.register(adminRoutes)

  return fastify
}
