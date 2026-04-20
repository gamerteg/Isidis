import apiClient from '@/lib/apiClient'

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.formErrors?.[0] ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

export async function submitReview(formData: FormData) {
  const orderId = formData.get('order_id') as string
  const rating = Number(formData.get('rating'))
  const comment = (formData.get('comment') as string) || ''

  if (!orderId) {
    return { error: 'Pedido invalido.' }
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: 'Avaliacao invalida.' }
  }

  try {
    await apiClient.post(`/orders/${orderId}/review`, {
      rating,
      comment: comment.trim() || undefined,
    })

    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Falha ao enviar avaliacao.'),
    }
  }
}
