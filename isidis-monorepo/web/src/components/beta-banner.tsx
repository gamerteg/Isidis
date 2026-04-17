
// BetaBanner — visível apenas em ambiente de desenvolvimento
export function BetaBanner() {
    if (!import.meta.env.DEV) return null

    return null
}
