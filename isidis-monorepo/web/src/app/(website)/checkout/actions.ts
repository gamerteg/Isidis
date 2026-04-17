import apiClient from '@/lib/apiClient'
import type {
  CheckoutCardInput,
  CheckoutCardResponse,
  CheckoutConfigResponse,
  CheckoutCreatePayload,
  CheckoutPixResponse,
  OrderDetail,
  PaymentStatusResponse,
} from '@/types'

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.fieldErrors?.payment_method?.[0] ||
    error?.response?.data?.error?.formErrors?.[0] ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

async function createCheckoutPayment(payload: CheckoutCreatePayload) {
  const response = await apiClient.post<{ data: CheckoutPixResponse | CheckoutCardResponse }>(
    '/checkout/create',
    payload,
  )

  return response.data.data
}

export async function createPixPayment(
  gigId: string,
  selectedAddOnIds: string[] = [],
  requirementsAnswers: Record<string, string> = {},
  existingOrderId?: string,
) {
  try {
    const result = await createCheckoutPayment({
      order_id: existingOrderId,
      gig_id: gigId,
      add_on_ids: selectedAddOnIds,
      requirements_answers: requirementsAnswers,
      payment_method: 'PIX',
    }) as CheckoutPixResponse

    return {
      orderId: result.order_id,
      pixId: result.pix_qr_code_id,
      qrcode: result.pix.qr_code_base64,
      content: result.pix.copy_paste_code,
      expiresAt: result.pix.expires_at,
    }
  } catch (error: any) {
    const message = getApiErrorMessage(error, 'Nao foi possivel gerar o PIX.')
    return { error: message, needsProfile: message.includes('Complete seu perfil') }
  }
}

export async function createCardPayment(
  gigId: string,
  selectedAddOnIds: string[] = [],
  requirementsAnswers: Record<string, string> = {},
  card: CheckoutCardInput,
  existingOrderId?: string,
) {
  try {
    const result = await createCheckoutPayment({
      order_id: existingOrderId,
      gig_id: gigId,
      add_on_ids: selectedAddOnIds,
      requirements_answers: requirementsAnswers,
      payment_method: 'CARD',
      card_token: card.token,
      payment_method_id: card.payment_method_id,
      installments: card.installments,
      issuer_id: card.issuer_id,
      device_id: card.device_id,
      card_holder_name: card.holder_name,
      card_holder_postal_code: card.postal_code,
      card_holder_address_number: card.address_number,
    }) as CheckoutCardResponse

    return {
      orderId: result.order_id,
      paymentId: result.payment_id ?? result.asaas_payment_id,
      status: result.status,
      amountTotal: result.amount_total,
      amountCardFee: result.amount_card_fee,
    }
  } catch (error: any) {
    const message = getApiErrorMessage(error, 'Nao foi possivel processar o cartao.')
    return { error: message, needsProfile: message.includes('Complete seu perfil') }
  }
}

export async function checkPaymentStatus(paymentId: string) {
  const response = await apiClient.get<{ data: PaymentStatusResponse }>(`/checkout/status/${paymentId}`)
  return {
    status: response.data.data.status,
    orderId: response.data.data.order_id,
  }
}

export async function getCheckoutConfig() {
  const response = await apiClient.get<{ data: CheckoutConfigResponse }>('/checkout/config')
  return response.data.data
}

export async function saveOrderRequirements(orderId: string, answers: Record<string, string>) {
  try {
    await apiClient.patch(`/orders/${orderId}/requirements`, {
      requirements_answers: answers,
    })

    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Nao foi possivel salvar as respostas do pedido.'),
    }
  }
}

export async function getOrderDetail(orderId: string) {
  const response = await apiClient.get<{ data: OrderDetail }>(`/orders/${orderId}`)
  return response.data.data
}
