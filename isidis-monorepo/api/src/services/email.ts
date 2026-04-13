import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@isidis.com.br'
const APP_URL = process.env.APP_URL ?? 'http://localhost:3000'

const header = (title: string) => `
  <div style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);padding:32px;text-align:center;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:22px;font-family:sans-serif">${title}</h1>
  </div>
`

const footer = () => `
  <div style="background:#0f0a1a;padding:16px;text-align:center;border-radius:0 0 12px 12px">
    <p style="color:#6b7280;font-size:12px;margin:0;font-family:sans-serif">
      Isidis — Plataforma de Tarot &amp; Espiritualidade
    </p>
  </div>
`

const wrap = (title: string, body: string) => `
  <div style="max-width:560px;margin:0 auto;background:#1a1025;border-radius:12px;overflow:hidden">
    ${header(title)}
    <div style="padding:32px;font-family:sans-serif;color:#e5e7eb">
      ${body}
    </div>
    ${footer()}
  </div>
`

// ─── Emails de Pedido ──────────────────────────────────────────────────────────

export async function sendOrderPaidToReader(params: {
  readerEmail: string
  readerName: string
  clientName: string
  gigTitle: string
  amount: number
  orderId: string
}) {
  const { readerEmail, readerName, clientName, gigTitle, amount, orderId } = params
  const amountBRL = `R$${(amount / 100).toFixed(2)}`

  await resend.emails.send({
    from: FROM,
    to: readerEmail,
    subject: `Novo pedido recebido — ${gigTitle}`,
    html: wrap('Novo pedido! 🎉', `
      <p>Olá, <strong>${readerName}</strong>!</p>
      <p>Você recebeu um novo pedido de <strong>${clientName}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#a78bfa">Serviço</td><td>${gigTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#a78bfa">Valor</td><td>${amountBRL}</td></tr>
      </table>
      <a href="${APP_URL}/dashboard/cartomante/pedido/${orderId}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        Ver pedido
      </a>
    `),
  })
}

export async function sendOrderPaidToClient(params: {
  clientEmail: string
  clientName: string
  readerName: string
  gigTitle: string
  amount: number
  orderId: string
  deliveryHours: number
}) {
  const { clientEmail, clientName, readerName, gigTitle, amount, orderId, deliveryHours } = params
  const amountBRL = `R$${(amount / 100).toFixed(2)}`

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Pedido confirmado — ${gigTitle}`,
    html: wrap('Pedido confirmado! ✨', `
      <p>Olá, <strong>${clientName}</strong>!</p>
      <p>Seu pagamento foi confirmado. <strong>${readerName}</strong> já foi notificada e tem até <strong>${deliveryHours}h</strong> para entregar sua leitura.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:8px 0;color:#a78bfa">Serviço</td><td>${gigTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#a78bfa">Valor pago</td><td>${amountBRL}</td></tr>
        <tr><td style="padding:8px 0;color:#a78bfa">Prazo de entrega</td><td>até ${deliveryHours}h</td></tr>
      </table>
      <a href="${APP_URL}/dashboard/leitura/${orderId}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        Acompanhar pedido
      </a>
    `),
  })
}

export async function sendOrderDelivered(params: {
  clientEmail: string
  clientName: string
  readerName: string
  gigTitle: string
  orderId: string
}) {
  const { clientEmail, clientName, readerName, gigTitle, orderId } = params

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Sua leitura chegou — ${gigTitle}`,
    html: wrap('Sua leitura espiritual chegou! ✨', `
      <p>Olá, <strong>${clientName}</strong>!</p>
      <p><strong>${readerName}</strong> finalizou e entregou sua leitura de <strong>${gigTitle}</strong>.</p>
      <p>Você tem 48h para revisar e, caso necessário, abrir uma disputa.</p>
      <a href="${APP_URL}/dashboard/leitura/${orderId}"
         style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
        Ver minha leitura
      </a>
    `),
  })
}

export async function sendOrderCanceled(params: {
  clientEmail: string
  clientName: string
  gigTitle: string
  reason?: string
}) {
  const { clientEmail, clientName, gigTitle, reason } = params

  await resend.emails.send({
    from: FROM,
    to: clientEmail,
    subject: `Pedido cancelado — ${gigTitle}`,
    html: wrap('Pedido cancelado', `
      <p>Olá, <strong>${clientName}</strong>!</p>
      <p>Seu pedido de <strong>${gigTitle}</strong> foi cancelado.</p>
      ${reason ? `<p style="color:#f87171"><strong>Motivo:</strong> ${reason}</p>` : ''}
      <p>O reembolso será processado em até 5 dias úteis dependendo do seu banco.</p>
    `),
  })
}
