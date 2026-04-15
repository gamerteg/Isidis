import { Resend } from 'resend'

// Configure your verified sender domain in Resend
const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL || 'Isidis <noreply@isidis.com.br>'
const APP_URL = import.meta.env.VITE_APP_URL || 'https://isidis.com.br'

// Lazy Resend instance — avoids process.env crash in browser context
let _resend: Resend | null = null
function getResend(): Resend {
    if (!_resend) _resend = new Resend(import.meta.env.VITE_RESEND_API_KEY || '')
    return _resend
}

// ─── Shared Layout ──────────────────────────────────────────────────────────

function emailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f0a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:560px;" cellpadding="0" cellspacing="0">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6d28d9,#8b5cf6);border-radius:12px 12px 0 0;padding:28px 40px;text-align:center;">
              <img src="${APP_URL}/logo.png" alt="Isidis" width="120" style="display:block;margin:0 auto;max-width:120px;" />
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#1a1030;padding:32px 40px;border-left:1px solid #2d1f4e;border-right:1px solid #2d1f4e;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#120c24;border-radius:0 0 12px 12px;border:1px solid #2d1f4e;border-top:none;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#6b5fa0;font-size:12px;">
                Você está recebendo este email porque tem uma conta na Isidis.<br/>
                <a href="${APP_URL}" style="color:#8b5cf6;text-decoration:none;">isidis.com.br</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function primaryButton(text: string, url: string): string {
    return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">${text}</a>`
}

function h2(text: string): string {
    return `<h2 style="margin:0 0 12px;color:#e2d9f3;font-size:20px;font-weight:700;">${text}</h2>`
}

function p(text: string): string {
    return `<p style="margin:0 0 10px;color:#a89bc9;font-size:15px;line-height:1.6;">${text}</p>`
}

function infoBox(content: string): string {
    return `<div style="margin:20px 0;padding:16px 20px;background:#2a1850;border-left:3px solid #8b5cf6;border-radius:6px;color:#c4b5fd;font-size:14px;line-height:1.6;">${content}</div>`
}

// ─── Email: Pedido Pago → Cartomante ────────────────────────────────────────

export async function sendOrderPaidToReader({
    readerEmail,
    readerName,
    orderId,
    gigTitle,
    clientName,
    amount,
}: {
    readerEmail: string
    readerName: string
    orderId: string
    gigTitle: string
    clientName: string
    amount: number
}) {
    const formattedAmount = (amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    const orderUrl = `${APP_URL}/dashboard/cartomante/pedido/${orderId}`

    const body = emailLayout(`
        ${h2('💰 Novo pedido confirmado!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>! Temos ótimas notícias.`)}
        ${p('Um cliente acabou de confirmar o pagamento para um dos seus serviços.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cliente:</strong> ${clientName}<br/>
            <strong>Valor recebido:</strong> ${formattedAmount}
        `)}
        ${p('Acesse o painel para ver os detalhes e começar a preparar a leitura.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Pedido', orderUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: `💰 Novo pedido pago — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Pedido Pago → Cliente ───────────────────────────────────────────

export async function sendOrderPaidToClient({
    clientEmail,
    clientName,
    orderId,
    gigTitle,
    readerName,
}: {
    clientEmail: string
    clientName: string
    orderId: string
    gigTitle: string
    readerName: string
}) {
    const orderUrl = `${APP_URL}/dashboard/minhas-tiragens`

    const body = emailLayout(`
        ${h2('✨ Seu pedido foi confirmado!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>!`)}
        ${p('Seu pagamento foi confirmado com sucesso. A cartomante já foi notificada e em breve começará a preparar sua leitura.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cartomante:</strong> ${readerName}
        `)}
        ${p('Você receberá outro email assim que a sua leitura estiver pronta.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Meus Pedidos', orderUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `✨ Pedido confirmado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Leitura Entregue → Cliente ──────────────────────────────────────

export async function sendReadingDelivered({
    clientEmail,
    clientName,
    orderId,
    gigTitle,
    readerName,
}: {
    clientEmail: string
    clientName: string
    orderId: string
    gigTitle: string
    readerName: string
}) {
    const readingUrl = `${APP_URL}/dashboard/leitura/${orderId}`

    const body = emailLayout(`
        ${h2('🔮 Sua leitura chegou!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>!`)}
        ${p(`A sua leitura de <strong style="color:#e2d9f3;">${gigTitle}</strong> por <strong style="color:#e2d9f3;">${readerName}</strong> está pronta e disponível no seu painel.`)}
        ${p('Clique no botão abaixo para acessar o resultado da sua tiragem.')}
        <div style="text-align:center;">
            ${primaryButton('Ver Minha Leitura 🔮', readingUrl)}
        </div>
        ${p('Não esqueça de deixar uma avaliação após ver sua leitura. Isso ajuda outros clientes e apoia a cartomante!')}
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `🔮 Sua leitura está pronta — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Pedido Cancelado → Cliente ──────────────────────────────────────

export async function sendOrderCanceled({
    clientEmail,
    clientName,
    gigTitle,
}: {
    clientEmail: string
    clientName: string
    gigTitle: string
}) {
    const body = emailLayout(`
        ${h2('Pedido Cancelado')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${clientName}</strong>.`)}
        ${p(`Informamos que o seu pedido de <strong style="color:#e2d9f3;">${gigTitle}</strong> foi cancelado.`)}
        ${infoBox('Se o pagamento foi realizado, o estorno será processado automaticamente. Em caso de dúvidas, entre em contato conosco pelo suporte.')}
        <div style="text-align:center;">
            ${primaryButton('Ir para o Suporte', `${APP_URL}/dashboard/tickets`)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `Pedido cancelado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Ticket respondido → Usuário ─────────────────────────────────────

export async function sendTicketReply({
    userEmail,
    userName,
    ticketId,
    ticketSubject,
    replyPreview,
}: {
    userEmail: string
    userName: string
    ticketId: string
    ticketSubject: string
    replyPreview: string
}) {
    const ticketUrl = `${APP_URL}/dashboard/tickets/${ticketId}`

    const body = emailLayout(`
        ${h2('📬 Resposta no seu ticket de suporte')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${userName}</strong>!`)}
        ${p('Nossa equipe respondeu ao seu ticket de suporte.')}
        ${infoBox(`
            <strong>Assunto:</strong> ${ticketSubject}<br/><br/>
            <em>${replyPreview.length > 200 ? replyPreview.substring(0, 200) + '...' : replyPreview}</em>
        `)}
        <div style="text-align:center;">
            ${primaryButton('Ver Resposta Completa', ticketUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: userEmail,
        subject: `📬 Resposta ao ticket: ${ticketSubject}`,
        html: body,
    })
}

// ─── Email: Novo Gig Pendente → Admins ──────────────────────────────────────

export async function sendAdminGigPending({
    adminEmails,
    gigId,
    gigTitle,
    readerName,
}: {
    adminEmails: string[]
    gigId: string
    gigTitle: string
    readerName: string
}) {
    if (adminEmails.length === 0) return

    const approvalUrl = `${APP_URL}/admin/approvals/${gigId}`

    const body = emailLayout(`
        ${h2('✨ Novo Gig aguardando aprovação')}
        ${p('Um novo serviço foi criado e está aguardando revisão do administrador.')}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Cartomante:</strong> ${readerName}
        `)}
        <div style="text-align:center;">
            ${primaryButton('Revisar Gig', approvalUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject: `✨ Novo gig pendente — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Novo Usuário Pendente → Admins ──────────────────────────────────

export async function sendAdminUserPending({
    adminEmails,
    userName,
}: {
    adminEmails: string[]
    userName: string
}) {
    if (adminEmails.length === 0) return

    const usersUrl = `${APP_URL}/admin/users`

    const body = emailLayout(`
        ${h2('👤 Nova aprovação de cartomante pendente')}
        ${p('Um usuário solicitou verificação para atuar como cartomante na plataforma.')}
        ${infoBox(`
            <strong>Usuário:</strong> ${userName}
        `)}
        <div style="text-align:center;">
            ${primaryButton('Revisar Usuários', usersUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: adminEmails,
        subject: `👤 Nova cartomante aguardando aprovação — ${userName}`,
        html: body,
    })
}

// ─── Email: Gig Aprovada → Cartomante ───────────────────────────────────────

export async function sendGigApproved({
    readerEmail,
    readerName,
    gigTitle,
    gigId,
}: {
    readerEmail: string
    readerName: string
    gigTitle: string
    gigId: string
}) {
    const gigUrl = `${APP_URL}/dashboard/cartomante/gigs`

    const body = emailLayout(`
        ${h2('✅ Seu serviço foi aprovado!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>!`)}
        ${p(`Ótimas notícias: o seu serviço foi revisado e <strong style="color:#a7f3d0;">aprovado</strong> pela nossa equipe. Ele já está visível na plataforma para os clientes.`)}
        ${infoBox(`<strong>Serviço:</strong> ${gigTitle}`)}
        <div style="text-align:center;">
            ${primaryButton('Ver Meus Serviços', gigUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: `✅ Serviço aprovado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Gig Rejeitada → Cartomante ──────────────────────────────────────

export async function sendGigRejected({
    readerEmail,
    readerName,
    gigTitle,
}: {
    readerEmail: string
    readerName: string
    gigTitle: string
}) {
    const gigsUrl = `${APP_URL}/dashboard/cartomante/gigs`

    const body = emailLayout(`
        ${h2('Serviço não aprovado')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>.`)}
        ${p(`Infelizmente o seu serviço <strong style="color:#e2d9f3;">${gigTitle}</strong> não foi aprovado nesta revisão.`)}
        ${infoBox('Você pode editar o serviço e submetê-lo novamente para aprovação. Em caso de dúvidas, entre em contato com nosso suporte.')}
        <div style="text-align:center;">
            ${primaryButton('Editar Serviços', gigsUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: `Serviço não aprovado — ${gigTitle}`,
        html: body,
    })
}

// ─── Email: Cartomante Aprovada ──────────────────────────────────────────────

export async function sendReaderApproved({
    readerEmail,
    readerName,
}: {
    readerEmail: string
    readerName: string
}) {
    const dashboardUrl = `${APP_URL}/dashboard/cartomante`

    const body = emailLayout(`
        ${h2('🎉 Sua conta foi aprovada!')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>!`)}
        ${p('Sua solicitação para atuar como cartomante na plataforma foi <strong style="color:#a7f3d0;">aprovada</strong>. Agora você pode criar seus serviços e começar a atender clientes.')}
        ${infoBox('Acesse seu painel, crie seus primeiros serviços e aguarde a aprovação para começar a receber pedidos.')}
        <div style="text-align:center;">
            ${primaryButton('Acessar Meu Painel', dashboardUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: '🎉 Sua conta de cartomante foi aprovada!',
        html: body,
    })
}

// ─── Email: Cartomante Rejeitada ─────────────────────────────────────────────

export async function sendReaderRejected({
    readerEmail,
    readerName,
}: {
    readerEmail: string
    readerName: string
}) {
    const body = emailLayout(`
        ${h2('Solicitação não aprovada')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>.`)}
        ${p('Após análise, sua solicitação para atuar como cartomante na plataforma não foi aprovada neste momento.')}
        ${infoBox('Em caso de dúvidas ou para mais informações, entre em contato com nosso suporte. Estamos à disposição para ajudar.')}
        <div style="text-align:center;">
            ${primaryButton('Abrir Ticket de Suporte', `${APP_URL}/dashboard/tickets`)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: 'Atualização sobre sua solicitação na Isidis',
        html: body,
    })
}

// ─── Email: Leitura de Assinatura Pendente → Cartomante ──────────────────────

export async function sendSubscriptionReadingDue({
    readerEmail,
    readerName,
    clientName,
    gigTitle,
    frequencyLabel,
}: {
    readerEmail: string
    readerName: string
    clientName: string
    gigTitle: string
    frequencyLabel: string
}) {
    const dashboardUrl = `${APP_URL}/dashboard/cartomante/assinaturas`

    const body = emailLayout(`
        ${h2('🔮 Tiragem Recorrente Pendente')}
        ${p(`Olá, <strong style="color:#e2d9f3;">${readerName}</strong>!`)}
        ${p(`É o momento de realizar a próxima tiragem para a assinatura de <strong style="color:#e2d9f3;">${clientName}</strong>.`)}
        ${infoBox(`
            <strong>Serviço:</strong> ${gigTitle}<br/>
            <strong>Frequência:</strong> ${frequencyLabel}<br/>
            <strong>Cliente:</strong> ${clientName}
        `)}
        ${p('Acesse seu painel para enviar a mensagem ou resultado ao seu cliente, mantendo o acompanhamento em dia.')}
        <div style="text-align:center;">
            ${primaryButton('Acessar Assinaturas', dashboardUrl)}
        </div>
    `)

    return getResend().emails.send({
        from: FROM_EMAIL,
        to: readerEmail,
        subject: `🔮 Tiragem de assinatura pendente: ${clientName}`,
        html: body,
    })
}

