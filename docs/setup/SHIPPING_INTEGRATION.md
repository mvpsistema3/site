# 📦 Sistema de Cálculo de Frete - API Frenet

Este documento descreve como usar e fazer deploy do sistema de cálculo de frete integrado com a API Frenet.

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Deploy da Edge Function](#deploy-da-edge-function)
4. [Uso dos Componentes](#uso-dos-componentes)
5. [Testes](#testes)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O sistema calcula frete de forma **dinâmica** usando a API Frenet, com as seguintes características:

- **Dimensões Fixas**: Todos os pedidos usam uma caixa padrão (25x15x12cm, 0.8kg)
- **CEP de Origem**: Fixo em Niterói - RJ (24330286)
- **Segurança**: Token da API protegido via Supabase Edge Function
- **Múltiplas Opções**: Retorna SEDEX, PAC e outras transportadoras disponíveis

---

## 🏗️ Arquitetura

```
┌─────────────┐
│   Frontend  │
│  (React)    │
└──────┬──────┘
       │
       │ calculateShipping()
       ▼
┌──────────────────┐
│ FrenetService    │
│ (src/lib)        │
└──────┬───────────┘
       │
       │ POST /calculate-shipping
       ▼
┌──────────────────────┐
│ Supabase Edge Function│
│ (protege token)      │
└──────┬───────────────┘
       │
       │ POST com token
       ▼
┌──────────────────┐
│  API Frenet      │
│ (api.frenet.com) │
└──────────────────┘
```

### Componentes Criados

- **Tipos**: [src/types/shipping.types.ts](../src/types/shipping.types.ts)
- **Serviço**: [src/lib/frenet.service.ts](../src/lib/frenet.service.ts)
- **Hook**: [src/hooks/useShipping.ts](../src/hooks/useShipping.ts)
- **Componentes**:
  - [src/components/ShippingCalculator.tsx](../src/components/ShippingCalculator.tsx)
  - [src/components/ShippingOption.tsx](../src/components/ShippingOption.tsx)
- **Edge Function**: [supabase/functions/calculate-shipping/](../supabase/functions/calculate-shipping/)

---

## 🚀 Deploy da Edge Function

### 1. Instalar Supabase CLI

```bash
# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Mac/Linux
brew install supabase/tap/supabase
```

### 2. Login no Supabase

```bash
npx supabase login
```

### 3. Link do Projeto

```bash
# Use o Project ID do seu projeto Supabase
npx supabase link --project-ref zzdvqchnbbxzyqrvufuj
```

### 4. Deploy da Edge Function

```bash
# Deploy da função
npx supabase functions deploy calculate-shipping

# Configurar secret (token da API)
npx supabase secrets set FRENET_API_TOKEN=8637DDEBREA99R4DDBR92E3R5D823268204F
```

### 5. Verificar Deploy

```bash
# Listar funções
npx supabase functions list

# Ver logs
npx supabase functions logs calculate-shipping
```

### 6. Testar Edge Function

```bash
# Testar com curl
curl -X POST \
  https://zzdvqchnbbxzyqrvufuj.supabase.co/functions/v1/calculate-shipping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "recipientCEP": "01310100",
    "invoiceValue": 150.00
  }'
```

**Resposta esperada:**
```json
{
  "ShippingSevicesArray": [
    {
      "Carrier": "Correios",
      "ServiceDescription": "SEDEX",
      "ShippingPrice": "31.71",
      "DeliveryTime": "3",
      "Error": false
    },
    {
      "Carrier": "Correios",
      "ServiceDescription": "PAC",
      "ShippingPrice": "18.50",
      "DeliveryTime": "7",
      "Error": false
    }
  ]
}
```

---

## 💻 Uso dos Componentes

### 1. Componente Básico

```tsx
import { ShippingCalculator } from './components/ShippingCalculator';
import { useCartStore } from './stores/cartStore';

function CheckoutPage() {
  const { cartTotal, setShipping } = useCartStore();

  return (
    <div>
      <ShippingCalculator
        cartTotal={cartTotal}
        onShippingSelected={(service) => {
          console.log('Frete selecionado:', service);
          setShipping(service);
        }}
      />
    </div>
  );
}
```

### 2. Uso com Hook Customizado

```tsx
import { useShipping } from './hooks/useShipping';

function MyComponent() {
  const {
    options,
    loading,
    error,
    selectedService,
    calculateShipping,
    selectService,
  } = useShipping();

  const handleCalculate = async () => {
    try {
      await calculateShipping({
        destinationCEP: '01310100',
        invoiceValue: 150.00,
      });
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div>
      <button onClick={handleCalculate}>Calcular Frete</button>

      {loading && <p>Carregando...</p>}
      {error && <p>Erro: {error}</p>}

      {options.map((service) => (
        <div key={service.ServiceCode}>
          <p>{service.ServiceDescription}</p>
          <p>R$ {service.ShippingPrice}</p>
          <button onClick={() => selectService(service)}>
            Selecionar
          </button>
        </div>
      ))}
    </div>
  );
}
```

### 3. Acesso ao Frete no Cart Store

```tsx
import { useCartStore } from './stores/cartStore';

function CartSummary() {
  const {
    cartSubtotal,
    discountAmount,
    cartTotal,
    shippingCost,
    finalTotal,
    shipping,
  } = useCartStore();

  return (
    <div>
      <p>Subtotal: R$ {cartSubtotal.toFixed(2)}</p>
      {discountAmount > 0 && (
        <p>Desconto: - R$ {discountAmount.toFixed(2)}</p>
      )}
      <p>Total Produtos: R$ {cartTotal.toFixed(2)}</p>

      {shipping && (
        <>
          <p>Frete ({shipping.ServiceDescription}): R$ {shippingCost.toFixed(2)}</p>
          <p>Prazo: {shipping.DeliveryTime} dias úteis</p>
        </>
      )}

      <p><strong>Total Final: R$ {finalTotal.toFixed(2)}</strong></p>
    </div>
  );
}
```

---

## 🧪 Testes

### CEPs para Teste

```javascript
const TEST_CEPS = {
  saoPaulo: '01310100',      // Av. Paulista
  rio: '20040020',           // Centro do Rio
  beloHorizonte: '30130100', // Centro de BH
  brasilia: '70040902',      // Congresso Nacional
  curitiba: '80060140',      // Centro de Curitiba
};
```

### Testar Localmente

1. Certifique-se que a edge function está deployada
2. Acesse a aplicação: `npm run dev`
3. Navegue até o checkout
4. Digite um CEP de teste
5. Verifique se as opções de frete aparecem

### Testar Edge Function Localmente

```bash
# Servir edge functions localmente
npx supabase functions serve calculate-shipping --env-file .env.local

# Em outro terminal, testar
curl -X POST http://localhost:54321/functions/v1/calculate-shipping \
  -H "Content-Type: application/json" \
  -d '{"recipientCEP": "01310100", "invoiceValue": 150}'
```

---

## 🔧 Troubleshooting

### Erro: "Token não autorizado"

**Solução**: Configure o secret no Supabase:
```bash
npx supabase secrets set FRENET_API_TOKEN=8637DDEBREA99R4DDBR92E3R5D823268204F
```

### Erro: "Edge function não encontrada"

**Solução**: Faça deploy novamente:
```bash
npx supabase functions deploy calculate-shipping
```

### Erro: "CEP inválido"

- Verifique se o CEP tem 8 dígitos
- O componente já remove automaticamente traços e espaços
- CEPs muito antigos podem não existir na base dos Correios

### Erro: "Timeout"

- A API Frenet pode estar lenta
- O sistema já tem retry automático (1 tentativa extra)
- Timeout configurado: 10 segundos

### Nenhuma opção retornada

- Verifique se o CEP está correto
- Alguns CEPs remotos podem não ter cobertura
- Verifique os logs da edge function:
  ```bash
  npx supabase functions logs calculate-shipping
  ```

### CORS Error

- Verifique se o arquivo `_shared/cors.ts` existe
- Certifique-se que está importando o `corsHeaders` na edge function

---

## 📝 Notas Importantes

1. **Dimensões Fixas**: As dimensões (25x15x12cm, 0.8kg) são fixas e NÃO mudam por produto
2. **Token Seguro**: O token da API NUNCA deve estar no código do frontend
3. **CEP de Origem**: Fixo em 24330286 (Niterói - RJ)
4. **Prazo**: Dias úteis, começam a contar após postagem
5. **Preço**: Pode variar ligeiramente dependendo da região

---

## 📚 Referências

- [Documentação API Frenet](https://painel.frenet.com.br/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Hooks](https://react.dev/reference/react)

---

## 🆘 Suporte

Em caso de dúvidas ou problemas:

1. Verifique os logs da edge function
2. Teste o CEP no site dos Correios
3. Valide o token da API Frenet no painel
4. Consulte a documentação oficial da Frenet
