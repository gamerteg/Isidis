import apiClient from '@/lib/apiClient'
import type {
  CheckoutConfigResponse,
  CheckoutCreatePayload,
  CheckoutPaymentResponse,
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
  const response = await apiClient.post<{ data: CheckoutPaymentResponse }>(
    '/checkout/create',
    payload,
  )

  return response.data.data
}

export async function submitCheckoutPayment(payload: CheckoutCreatePayload) {
  try {
    return await createCheckoutPayment(payload)
  } catch (error: any) {
    throw Object.assign(new Error(getApiErrorMessage(error, 'Nao foi possivel processar o pagamento.')), {
      cause: error,
    })
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
