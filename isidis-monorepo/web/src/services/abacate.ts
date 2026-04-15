export interface AbacateCustomer {
    name: string
    email: string
    cellphone?: string
    taxId?: string // CPF/CNPJ
}

export interface AbacateProduct {
    externalId: string
    name: string
    quantity: number
    price: number // in cents
    description?: string
}

export interface CreateBillingRequest {
    frequency: 'ONE_TIME' | 'MULTIPLE_PAYMENTS'
    methods: ('PIX' | 'CARD')[]
    products: AbacateProduct[]
    returnUrl: string
    completionUrl: string
    customer?: AbacateCustomer
    customerId?: string
    allowCoupons?: boolean
    coupons?: string[]
    externalId?: string
    metadata?: Record<string, string>
}

/**
 * Official API response format (from docs.abacatepay.com):
 * { data: { id, url, status, ... }, error: null }
 */
export interface CreateBillingResponse {
    data: {
        id: string
        url: string
        status: string
        devMode: boolean
        methods: string[]
        products: { id: string; externalId: string; quantity: number }[]
        frequency: string
        amount: number
        nextBilling: string | null
        pix?: {
            qrcode: string
            content: string
        }
        customer: {
            id: string
            metadata: {
                name: string
                cellphone: string
                email: string
                taxId: string
            }
        }
        allowCoupons: boolean
        coupons: string[]
    } | null
    error: string | null
}

const ABACATE_API_URL = 'https://api.abacatepay.com/v1'

export async function createBilling(data: CreateBillingRequest): Promise<CreateBillingResponse> {
    const apiKey = import.meta.env.VITE_ABACATE_PAY_API_KEY

    if (!apiKey) {
        throw new Error('ABACATE_PAY_API_KEY is not configured')
    }

    console.log('[AbacatePay] Creating billing with payload:', JSON.stringify(data, null, 2))

    const response = await fetch(`${ABACATE_API_URL}/billing/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })

    const responseBody = await response.text()
    console.log(`[AbacatePay] Response status: ${response.status}`)
    console.log(`[AbacatePay] Response body: ${responseBody}`)

    if (!response.ok) {
        throw new Error(`Abacate Pay Error (${response.status}): ${responseBody}`)
    }

    // Parse response
    let parsed: CreateBillingResponse
    try {
        parsed = JSON.parse(responseBody)
    } catch {
        throw new Error(`Abacate Pay: Invalid JSON response: ${responseBody}`)
    }

    // Check for API-level error
    if (parsed.error) {
        throw new Error(`Abacate Pay: ${parsed.error}`)
    }

    if (!parsed.data || !parsed.data.url) {
        throw new Error(`Abacate Pay: Missing billing URL in response. Full response: ${responseBody}`)
    }

    return parsed
}

export interface CreatePixRequest {
    amount: number
    expiresIn?: number
    description: string
    customer: AbacateCustomer
    metadata?: Record<string, string>
}

export interface PixResponse {
    data: {
        id: string
        amount: number
        status: string
        devMode: boolean
        brCode: string
        brCodeBase64: string
        platformFee: number
        createdAt: string
        updatedAt: string
        expiresAt: string
    } | null
    error: string | null
}

export async function createPixQrCode(data: CreatePixRequest): Promise<PixResponse> {
    const apiKey = import.meta.env.VITE_ABACATE_PAY_API_KEY
    if (!apiKey) throw new Error('ABACATE_PAY_API_KEY is not configured')

    const response = await fetch(`${ABACATE_API_URL}/pixQrCode/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })

    const responseBody = await response.text()
    if (!response.ok) {
        throw new Error(`Abacate Pay PIX Error (${response.status}): ${responseBody}`)
    }

    return JSON.parse(responseBody)
}

export async function checkPixQrCodeStatus(id: string): Promise<{ data: { status: string; expiresAt: string }; error: string | null }> {
    const apiKey = import.meta.env.VITE_ABACATE_PAY_API_KEY
    if (!apiKey) throw new Error('ABACATE_PAY_API_KEY is not configured')

    const response = await fetch(`${ABACATE_API_URL}/pixQrCode/check?id=${id}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
    })

    const responseBody = await response.text()
    if (!response.ok) {
        throw new Error(`Abacate Pay Status Error (${response.status}): ${responseBody}`)
    }

    return JSON.parse(responseBody)
}

export interface CreateWithdrawRequest {
    externalId: string
    amount: number
    method: 'PIX'
    pix: {
        type: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'RANDOM'
        key: string
    }
    description?: string
}

export interface WithdrawalResponse {
    data: {
        id: string
        status: string
        devMode: boolean
        receiptUrl: string
        kind: 'WITHDRAW'
        amount: number
        platformFee: number
        createdAt: string
        updatedAt: string
        externalId: string
    } | null
    error: string | null
}

export async function createWithdrawal(data: CreateWithdrawRequest): Promise<WithdrawalResponse> {
    const apiKey = import.meta.env.VITE_ABACATE_PAY_API_KEY
    if (!apiKey) throw new Error('ABACATE_PAY_API_KEY is not configured')

    const response = await fetch(`${ABACATE_API_URL}/withdraw/create`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })

    const responseBody = await response.text()
    if (!response.ok) {
        throw new Error(`Abacate Pay Withdrawal Error (${response.status}): ${responseBody}`)
    }

    return JSON.parse(responseBody)
}
