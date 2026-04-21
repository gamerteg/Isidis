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
- Retorna os primeiros `limit` do resultado

---

## 4. Hotfix — Gigs flickering + Leitura Geral removida

**Problema:** Após o patch anterior, as gigs ficavam aparecendo e sumindo.

**Causas:**
1. O shuffle (Fisher-Yates) rodava em cada re-fetch — qualquer mudança em `refreshKey` ou `user` reordenava os itens, causando re-renders visuais contínuos. Shuffle removido.
2. `gig.owner` pode ser retornado como array pelo Supabase em alguns cenários — `gig.owner?.id` seria `undefined`, filtrando todos os gigs. Adicionado guard: `Array.isArray(gig.owner) ? gig.owner[0] : gig.owner`.

**Categoria removida:** `'General Reading'` / "Leitura Geral" removida de `CATEGORY_META` (stats.ts) e de `CartomantesClient.tsx` — ficam 4 categorias.

---

## Verificação

- [x] `npm run build` (web) — ✅ zero erros
- [x] `npm run build` (api) — ✅ zero erros
- [x] Filtros de categoria alinhados entre UI, API e banco
- [x] Footers removidos de WebsiteLayout e DashboardLayout
- [x] `getBestSellingGigs` com dedup por reader, sem shuffle
- [x] "Leitura Geral" removida das categorias
