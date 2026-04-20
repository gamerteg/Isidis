# 📱 Diretrizes Mobile-First

O desenvolvimento no Isidis deve assumir a mentalidade **Mobile-First**. Todo componente deve ser desenhado primeiro para telas pequenas, expandindo (scale-up) para desktop.

## 1. Regra de Ouro do Tailwind
No Tailwind, as classes sem prefixo são aplicadas a todas as telas (por padrão, mobile). Prefixos (`sm:`, `md:`, `lg:`, `xl:`) são **apenas para breakpoints maiores**.

**❌ Errado (Desktop-First):**
```tsx
<div className="w-[800px] flex-row md:flex-col lg:w-full">...</div>
```

**✅ Correto (Mobile-First):**
```tsx
<div className="w-full flex-col md:flex-row lg:w-[800px]">...</div>
```

## 2. Padrões de Layout
- **Containers:** O `<PageContainer>` deve ter padding horizontal fluido (ex: `px-4 md:px-8`).
- **Navegação (Navbar):** Menu hambúrguer (Sheet do Radix) nativo para mobile (`<md`), expandindo para links horizontais apenas no desktop (`>=md`).
- **Grids:** Use 1 coluna por padrão, expandindo gradualmente: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- **Tipografia:** Textos grandes devem ser fluidos ou ajustados. Ex: `text-2xl md:text-4xl`.

## 3. Experiência de Usuário (Mobile)
- **Tap Targets:** Botões e links interativos devem ter no mínimo `44x44px` (touch targets da Apple/Google).
- **Hover States:** Lembre-se que `:hover` fica "preso" em mobile após o clique. Use `active:` ou confie nos estados de foco. Classes como `hover:bg-primary/20` devem idealmente ser encapsuladas com media queries de ponteiro fino (`@media (hover: hover)`), que o Tailwind permite via plugins ou classes customizadas no `globals.css`.
- **Teclado:** Formulários devem usar os tipos corretos de input (`type="email"`, `type="tel"`) para abrir o teclado adequado no celular.
- **Área Segura (Safe Area):** Respeitar a "notch" do iPhone usando padding inferior seguro (`pb-safe`) se necessário, especialmente em rodapés fixos ou abas de navegação.