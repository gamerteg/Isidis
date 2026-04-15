import apiClient from '@/lib/apiClient'
import type { WalletBalance, WalletTransaction } from '@/types'

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.formErrors?.[0] ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  )
}

export async function getWalletBalances(_walletId?: string) {
  const response = await apiClient.get<{ data: WalletBalance }>('/wallet/balance')
  const balance = response.data.data

  return {
    totalEarnings: balance.total,
    pendingBalance: balance.pending,
    availableBalance: balance.available,
    reservedWithdrawals: balance.reservedWithdrawals,
    pendingItems: balance.pendingItems,
  }
}

export async function getWalletTransactions(page = 1, limit = 50) {
  const response = await apiClient.get<{
    data: WalletTransaction[]
    pagination: { total: number; page: number; limit: number; pages: number }
  }>('/wallet/transactions', {
    params: { page, limit },
  })

  return response.data
}

export async function requestWithdrawal(
  amountCents: number,
  pixKey: string,
  pixKeyType = 'CPF',
) {
  try {
    await apiClient.post('/wallet/withdraw', {
      amount: amountCents,
      pix_key: pixKey,
      pix_key_type: pixKeyType === 'ALEATORIA' ? 'RANDOM' : pixKeyType === 'CELULAR' ? 'PHONE' : pixKeyType,
    })

    return { success: true }
  } catch (error: any) {
    return {
      error: getApiErrorMessage(error, 'Nao foi possivel solicitar o saque.'),
    }
  }
}
