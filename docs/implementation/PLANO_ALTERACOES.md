# Plano de Ação - Alterações Sesh Store

> **Data:** 04/02/2026
> **Projeto:** sesh-store (React + Vite + Tailwind + Supabase)

---

## ✅ STATUS DA IMPLEMENTAÇÃO

**Data de Conclusão:** 04/02/2026

### Resumo Geral
- ✅ **11 de 13 funcionalidades concluídas** (85%)
- ⚠️ **1 pendente de migration** (Foto da variante)
- ⏳ **1 pendente de implementação** (Login/Logout)

### Componentes Criados
- `src/components/PriceDisplay.tsx` - Exibição de preços com PIX e parcelamento
- `src/components/FreeShippingBanner.tsx` - Banner de frete grátis
- `src/components/AgeVerificationPopup.tsx` - Popup +18
- `src/components/PromoPopup.tsx` - Popup promocional

### Modificações Principais
- [App.tsx](App.tsx) - Remoções, integrações de popups e cupom
- [ProductCard.tsx](src/components/ProductCard.tsx) - Removido badge "NOVO"
- [ShippingCalculator.tsx](src/components/ShippingCalculator.tsx) - Regra de frete grátis
- [ShippingOption.tsx](src/components/ShippingOption.tsx) - Exibição "GRÁTIS"
- [brands.ts](src/config/brands.ts) - Threshold atualizado para R$300

### Próximos Passos
1. **Migration Supabase**: Adicionar campo `image_url` em `product_variants`
2. **Login/Logout**: Implementar autenticação com Supabase Auth
3. **Testes**: Executar checklist de testes completo

---

## Resumo das Alterações

| Área | Funcionalidade | Complexidade | Risco |
|------|----------------|--------------|-------|
| Página Produto | Tag estoque baixo/escassez | Baixa | Baixo |
| Página Produto | Foto variante na seleção de cor | Média | Baixo |
| Página Produto | Remover avaliação e tag "novo" | Baixa | Baixo |
| Página Produto | Desconto PIX | Baixa | Baixo |
| Página Produto | Parcelamento 12x | Baixa | Baixo |
| Página Produto | Dropdown parcelamento detalhado | Média | Baixo |
| Página Produto | Remover troca/devolução | Baixa | Baixo |
| Geral | Tag frete grátis R$300 | Baixa | Baixo |
| Geral | Regra frete grátis R$300 | Média | Médio |
| Geral | Login/Logout | Alta | Médio |
| Geral | Popup +18 | Média | Baixo |
| Geral | Popup promocional | Média | Baixo |
| Carrinho | Campo cupom de desconto | Baixa | Baixo |
| Tipografia | Manter fonte padrão | Baixa | Baixo |

---

## 1. PÁGINA DE PRODUTO

### 1.1 Tag de Estoque Baixo e Escassez (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/components/ProductCard.tsx`
- `src/components/VariantSelector.tsx`
- `App.tsx` (seção de produto detalhado)

**Implementação:**
```tsx
// Componente de tag de escassez
const StockTag = ({ stock }: { stock: number }) => {
  if (stock === 0) return <span className="text-red-500 text-sm font-medium">Esgotado</span>;
  if (stock <= 3) return <span className="text-orange-500 text-sm font-medium">Últimas {stock} unidades!</span>;
  if (stock <= 10) return <span className="text-yellow-600 text-sm font-medium">Estoque baixo</span>;
  return null;
};
```

**Tarefas:**
- [ ] Criar componente `StockTag.tsx`
- [ ] Integrar no `VariantSelector.tsx` (mostra quando seleciona cor/tamanho)
- [ ] Adicionar na listagem de produtos (ProductCard) se necessário
- [ ] Testar com produtos de estoque variado

**Dependências:** Dados de estoque já existem em `product_variants`

---

### 1.2 Exibir Foto da Variante ao Escolher Cor (⚠️ PENDENTE - Requer Migration)

**Arquivos envolvidos:**
- `src/components/VariantSelector.tsx`
- `App.tsx` (galeria de imagens)

**Implementação:**
```tsx
// No VariantSelector, ao selecionar cor:
const handleColorSelect = (color: string) => {
  setSelectedColor(color);
  // Encontrar imagem da variante com essa cor
  const variantImage = product.variants?.find(v => v.color === color)?.image_url;
  if (variantImage) {
    onImageChange?.(variantImage); // callback para atualizar imagem principal
  }
};
```

**Tarefas:**
- [ ] Verificar se `product_variants` tem campo `image_url` no Supabase
- [ ] Se não existir, criar migration para adicionar campo
- [ ] Modificar `VariantSelector` para mostrar mini-thumbnail da cor
- [ ] Passar callback para trocar imagem principal na galeria
- [ ] Adicionar transição suave na troca de imagem

**Dependências:** Pode precisar de migration no banco de dados

---

### 1.3 Remover Avaliação e Tag "Produto Novo" (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/components/ProductCard.tsx`
- `App.tsx` (página de produto)

**Implementação:**
```tsx
// ANTES (remover):
{product.isNew && <span className="badge-new">NOVO</span>}
{product.rating && <StarRating value={product.rating} />}
{product.reviews && <span>{product.reviews} avaliações</span>}

// DEPOIS: simplesmente remover esses elementos
```

**Tarefas:**
- [ ] Remover renderização de `isNew` badge no ProductCard
- [ ] Remover seção de avaliações (estrelas) no ProductCard
- [ ] Remover seção de avaliações na página de produto detalhado
- [ ] Manter dados no banco (não excluir campos, apenas ocultar UI)

**Dependências:** Nenhuma

---

### 1.4 Mostrar Valor de Desconto no PIX (CONCLUÍDO)

**Arquivos envolvidos:**
- `App.tsx` (seção de preço)
- `src/lib/currency.utils.ts`

**Implementação:**
```tsx
// Constante de desconto PIX (pode vir da config da brand)
const PIX_DISCOUNT = 0.05; // 5% de desconto

const PriceDisplay = ({ price }: { price: number }) => {
  const pixPrice = price * (1 - PIX_DISCOUNT);
  return (
    <div>
      <p className="text-2xl font-bold">{formatCurrency(price)}</p>
      <p className="text-green-600 text-sm">
        <span className="font-medium">{formatCurrency(pixPrice)}</span> no PIX
        <span className="text-xs ml-1">({PIX_DISCOUNT * 100}% off)</span>
      </p>
    </div>
  );
};
```

**Tarefas:**
- [ ] Criar constante/config para percentual de desconto PIX
- [ ] Criar componente `PriceWithPix.tsx`
- [ ] Integrar na página de produto
- [ ] Integrar no carrinho (opcional)

**Dependências:** Nenhuma

---

### 1.5 Mostrar Parcelamento 12x (CONCLUÍDO)

**Arquivos envolvidos:**
- `App.tsx` (seção de preço)
- `src/config/brands.ts` (já tem `maxInstallments`)

**Implementação:**
```tsx
const InstallmentPreview = ({ price, maxInstallments = 12 }: Props) => {
  const installmentValue = price / maxInstallments;
  return (
    <p className="text-sm text-gray-600">
      ou {maxInstallments}x de {formatCurrency(installmentValue)} sem juros
    </p>
  );
};
```

**Tarefas:**
- [ ] Usar `maxInstallments` da config da brand (já existe)
- [ ] Criar componente `InstallmentPreview.tsx`
- [ ] Adicionar abaixo do preço na página de produto

**Dependências:** Config já existe em `brands.ts`

---

### 1.6 Dropdown de Parcelamento Detalhado (CONCLUÍDO)

**Arquivos envolvidos:**
- Novo: `src/components/InstallmentDropdown.tsx`
- `App.tsx`

**Implementação:**
```tsx
const InstallmentDropdown = ({ price, maxInstallments = 12 }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  const installments = Array.from({ length: maxInstallments }, (_, i) => {
    const n = i + 1;
    return {
      parcelas: n,
      valor: price / n,
      total: price, // sem juros
    };
  });

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        Ver todas as opções de parcelamento
        <ChevronDown className={isOpen ? 'rotate-180' : ''} />
      </button>
      {isOpen && (
        <div className="absolute bg-white shadow-lg rounded-lg p-4 z-10">
          {installments.map(({ parcelas, valor }) => (
            <div key={parcelas} className="flex justify-between py-1">
              <span>{parcelas}x</span>
              <span>{formatCurrency(valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Tarefas:**
- [ ] Criar componente `InstallmentDropdown.tsx`
- [ ] Estilizar com Tailwind (animação de abertura)
- [ ] Integrar na página de produto
- [ ] Adicionar ícone de cartão de crédito

**Dependências:** Nenhuma

---

### 1.7 Remover Seção de Troca e Devolução (CONCLUÍDO)

**Arquivos envolvidos:**
- `App.tsx` (página de produto)

**Implementação:**
- Localizar e remover/comentar seção de "Troca e Devolução"
- Manter o código comentado caso queira reativar futuramente

**Tarefas:**
- [ ] Identificar seção de troca/devolução no código
- [ ] Remover renderização
- [ ] Testar layout após remoção

**Dependências:** Nenhuma

---

## 2. GERAL (SITE-WIDE)

### 2.1 Tag de Frete Grátis R$300 (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/components/FreeShippingProgress.tsx` (já existe!)
- `src/config/brands.ts`
- Header/Navbar

**Implementação:**
```tsx
// Banner fixo no topo ou header
const FreeShippingBanner = () => {
  const { settings } = useBrand();
  return (
    <div className="bg-green-500 text-white text-center py-2 text-sm">
      🚚 Frete GRÁTIS para compras acima de {formatCurrency(settings.freeShippingThreshold)}
    </div>
  );
};
```

**Tarefas:**
- [ ] Atualizar `freeShippingThreshold` para 300 em `brands.ts`
- [ ] Adicionar banner no header ou topo do site
- [ ] Usar componente `FreeShippingProgress` existente no carrinho

**Dependências:** Config já existe, só precisa atualizar valor

---

### 2.2 Regra de Zerar Frete para R$300+ (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/stores/cartStore.ts`
- `src/lib/frenet.service.ts`
- `src/components/ShippingCalculator.tsx`

**Implementação:**
```tsx
// No cartStore, modificar cálculo de frete
const calculateTotal = () => {
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const { freeShippingThreshold } = getBrandSettings();

  // Zerar frete se atingir threshold
  const shippingCost = subtotal >= freeShippingThreshold ? 0 : shipping?.cost || 0;

  return subtotal - discount + shippingCost;
};
```

**Tarefas:**
- [ ] Modificar `cartStore.ts` para aplicar regra de frete grátis
- [ ] Atualizar `ShippingCalculator` para mostrar "GRÁTIS" quando aplicável
- [ ] Mostrar progresso para frete grátis no carrinho
- [ ] Testar com carrinho abaixo e acima de R$300

**Dependências:** Usa `FreeShippingProgress.tsx` existente

---

### 2.3 Login/Logout (⏳ PENDENTE)

**Arquivos envolvidos:**
- Novo: `src/contexts/AuthContext.tsx`
- Novo: `src/components/LoginModal.tsx`
- Novo: `src/components/UserMenu.tsx`
- `src/lib/supabase.ts`
- Header/Navbar

**Implementação:**
```tsx
// AuthContext
const AuthContext = createContext<AuthContextType>(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listener de mudanças de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = async () => {
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Tarefas:**
- [ ] Criar `AuthContext.tsx` com Supabase Auth
- [ ] Criar `LoginModal.tsx` (email/senha ou magic link)
- [ ] Criar `UserMenu.tsx` (dropdown com opções do usuário)
- [ ] Adicionar botão de login no header
- [ ] Mostrar nome/email do usuário quando logado
- [ ] Adicionar botão de logout
- [ ] Configurar Supabase Auth (se não estiver configurado)
- [ ] Criar tabela `profiles` no Supabase (se necessário)

**Dependências:** Supabase Auth precisa estar habilitado

---

### 2.4 Popup +18 (CONCLUÍDO)

**Arquivos envolvidos:**
- Novo: `src/components/AgeVerificationPopup.tsx`
- `App.tsx`
- `localStorage` para persistência

**Implementação:**
```tsx
const AgeVerificationPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('age_verified');
    if (!verified) setIsOpen(true);
  }, []);

  const handleConfirm = () => {
    localStorage.setItem('age_verified', 'true');
    setIsOpen(false);
  };

  const handleDeny = () => {
    window.location.href = 'https://google.com'; // Redireciona se menor
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Verificação de Idade</h2>
        <p className="mb-6">
          Este site contém conteúdo destinado apenas para maiores de 18 anos.
          Você tem mais de 18 anos?
        </p>
        <div className="flex gap-4 justify-center">
          <button onClick={handleConfirm} className="btn-primary">
            Sim, tenho +18
          </button>
          <button onClick={handleDeny} className="btn-secondary">
            Não
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Tarefas:**
- [ ] Criar `AgeVerificationPopup.tsx`
- [ ] Adicionar no `App.tsx` (renderiza primeiro)
- [ ] Usar localStorage para não mostrar novamente
- [ ] Estilizar com design da marca
- [ ] Adicionar logo no popup

**Dependências:** Nenhuma

---

### 2.5 Popup Promocional (CONCLUÍDO)

**Arquivos envolvidos:**
- Novo: `src/components/PromoPopup.tsx`
- `src/hooks/useBanners.ts` (pode reutilizar)
- Supabase (tabela para gerenciar promoções)

**Implementação:**
```tsx
const PromoPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [promo, setPromo] = useState<Promo | null>(null);

  useEffect(() => {
    // Verificar se já viu o popup hoje
    const lastSeen = localStorage.getItem('promo_popup_seen');
    const today = new Date().toDateString();

    if (lastSeen !== today) {
      // Buscar promo ativa do banco
      fetchActivePromo().then(data => {
        if (data) {
          setPromo(data);
          setIsOpen(true);
        }
      });
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('promo_popup_seen', new Date().toDateString());
    setIsOpen(false);
  };

  if (!isOpen || !promo) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
      <div className="bg-white rounded-lg max-w-lg relative">
        <button onClick={handleClose} className="absolute top-2 right-2">
          <X size={24} />
        </button>
        <img src={promo.image} alt={promo.title} className="rounded-t-lg" />
        <div className="p-6">
          <h3 className="text-xl font-bold">{promo.title}</h3>
          <p className="text-gray-600">{promo.description}</p>
          {promo.couponCode && (
            <div className="mt-4 bg-gray-100 p-3 rounded text-center">
              <span className="text-sm">Use o cupom:</span>
              <span className="font-mono font-bold ml-2">{promo.couponCode}</span>
            </div>
          )}
          <button onClick={handleClose} className="btn-primary w-full mt-4">
            Aproveitar
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Tarefas:**
- [ ] Criar tabela `promos` no Supabase (se necessário)
- [ ] Criar `PromoPopup.tsx`
- [ ] Criar hook `usePromo.ts` para buscar promo ativa
- [ ] Adicionar no `App.tsx` (após popup +18)
- [ ] Configurar frequência de exibição (1x por dia)
- [ ] Adicionar campo para cupom no popup

**Dependências:** Tabela no Supabase

---

## 3. CARRINHO

### 3.1 Campo de Cupom de Desconto (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/components/CouponInput.tsx` (JÁ EXISTE!)
- `src/stores/cartStore.ts` (já tem suporte a cupom!)
- `App.tsx` (drawer do carrinho)

**Implementação:**
O componente já existe! Só precisa integrar no drawer do carrinho.

```tsx
// No drawer do carrinho, adicionar:
<CouponInput
  onApply={(code, discount) => {
    applyCoupon(code, discount);
  }}
/>
```

**Tarefas:**
- [ ] Verificar se `CouponInput.tsx` está funcional
- [ ] Integrar no drawer/página do carrinho
- [ ] Testar validação de cupons
- [ ] Mostrar cupom aplicado e desconto
- [ ] Adicionar botão para remover cupom

**Dependências:** Componente já existe, só integrar

---

## 4. TIPOGRAFIA

### 4.1 Manter Fonte Padrão (CONCLUÍDO)

**Arquivos envolvidos:**
- `src/config/brands.ts`
- `tailwind.config.js`
- `index.css`

**Situação Atual:**
- Cada brand pode ter sua fonte definida em `brands.ts`
- A fonte padrão é aplicada via CSS variables

**Tarefas:**
- [ ] Verificar fontes atuais definidas por brand
- [ ] Confirmar que a fonte desejada está carregando
- [ ] Remover fontes não utilizadas (se houver)
- [ ] Garantir fallbacks adequados

**Dependências:** Nenhuma

---

## 5. ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### Fase 1: Alterações Simples (Baixo Risco)
1. ✅ Remover avaliação e tag "novo"
2. ✅ Remover seção troca/devolução
3. ✅ Integrar campo cupom no carrinho
4. ✅ Verificar tipografia

### Fase 2: Exibição de Preços
5. ✅ Mostrar desconto PIX
6. ✅ Mostrar parcelamento 12x
7. ✅ Dropdown parcelamento detalhado

### Fase 3: Estoque e Variantes
8. ✅ Tag de estoque baixo/escassez
9. ⚠️ Foto da variante na seleção de cor (Requer Migration)

### Fase 4: Frete Grátis
10. ✅ Tag/banner frete grátis R$300
11. ✅ Regra de zerar frete

### Fase 5: Popups
12. ✅ Popup +18
13. ✅ Popup promocional

### Fase 6: Autenticação
14. ⏳ Sistema de Login/Logout (PENDENTE)

---

## 6. CHECKLIST DE TESTES

### Antes de cada deploy:
- [ ] Testar fluxo completo de compra
- [ ] Verificar cálculo de frete
- [ ] Testar aplicação de cupons
- [ ] Verificar responsividade (mobile)
- [ ] Testar em múltiplos navegadores
- [ ] Verificar que login funciona
- [ ] Testar popup +18 (limpar localStorage)
- [ ] Verificar seleção de variantes

### Regressão:
- [ ] Carrinho adiciona/remove itens
- [ ] Cálculo de totais correto
- [ ] Checkout funciona com Stripe
- [ ] Busca de produtos funciona
- [ ] Navegação por categorias funciona
- [ ] Imagens carregam corretamente

---

## 7. NOTAS IMPORTANTES

1. **Backup:** Fazer commit antes de cada alteração significativa
2. **Feature Flags:** Considerar usar `useFeatureFlag` para deploy gradual
3. **Multi-tenant:** Testar alterações em todas as brands (Sesh, GOT, The OG)
4. **Mobile First:** Todas as alterações devem ser responsivas
5. **Performance:** Evitar re-renders desnecessários nos novos componentes

---

## 8. ARQUIVOS PRINCIPAIS A MODIFICAR

| Arquivo | Alterações |
|---------|------------|
| `App.tsx` | Popups, remoções, integrações |
| `src/components/ProductCard.tsx` | Remover rating/new, adicionar stock tag |
| `src/components/VariantSelector.tsx` | Foto da variante |
| `src/stores/cartStore.ts` | Regra frete grátis |
| `src/config/brands.ts` | Atualizar threshold |
| Header/Navbar | Banner frete, login/logout |

---

**Pronto para iniciar a implementação!** 🚀
