# PATCH — Footers removidos + Filtros de categoria + Variedade de Gigs

**Data:** 2026-04-20  
**Status:** Concluído ✅

---

## 1. Footers removidos

`Footer` removido de `WebsiteLayout.tsx` e `DashboardLayout.tsx`.  
O componente `src/components/layout/Footer.tsx` foi mantido mas não está mais em uso.

---

## 2. Filtros de categoria corrigidos

### Raiz do problema (divergência de 3 camadas)

| Camada | Antes | Depois |
|--------|-------|--------|
| `gigs.category` no banco | `'Love & Relationships'` etc. (English IDs) | — inalterado, é a fonte da verdade |
| `CartomantesClient.tsx` | 8 categorias PT (`'Amor & Relacionamentos'` etc.) que não existem no banco | 5 IDs reais do banco com labels PT |
| `getCategoryCounts()` (stats.ts) | Keyword matching frágil em `profiles.specialties` | Contagem direta por `gigs.category` |
| API filtro (readers/index.ts) | `specialties @> ['Amor & Relacionamentos']` — nunca encontrava ninguém | `gigs.category = specialty` — match exato correto |

### Mudanças

**`api/src/routes/readers/index.ts`**
```ts
// ANTES:
dbQuery = dbQuery.contains('specialties', [specialty])
// DEPOIS:
dbQuery = dbQuery.eq('gigs.category', specialty)
```

**`web/src/components/cartomantes/CartomantesClient.tsx`**
- 8 categorias PT substituídas pelas 5 categorias com IDs do banco (`'Love & Relationships'`, etc.) e labels em PT

**`web/src/lib/data/stats.ts` — `getCategoryCounts()`**
- Substituído busca em `profiles.specialties` por query direta em `gigs.category`
- Conta leitores únicos por categoria (via `Set<owner_id>`)
- Adicionado `CATEGORY_META` dict como fonte de verdade para label PT + imagem

---

## 3. Variedade de Gigs no dashboard do cliente

**`web/src/lib/data/stats.ts` — `getBestSellingGigs()`**

- Busca 20 gigs (antes: buscava apenas o `limit` direto — mesmo cartomante poderia aparecer múltiplas vezes)
- Deduplica por `owner.id` → no máximo 1 gig por cartomante
- Embaralha com Fisher-Yates → resultado diferente a cada carregamento
- Retorna os primeiros `limit` do resultado embaralhado

---

## Verificação

- [x] `npm run build` — ✅ 4.30s, zero erros
- [x] Filtros de categoria alinhados entre UI, API e banco
- [x] Footers removidos de WebsiteLayout e DashboardLayout
- [x] `getBestSellingGigs` com dedup por reader + shuffle
