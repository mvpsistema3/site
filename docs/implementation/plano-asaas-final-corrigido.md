# Plano de Integração Asaas — FINAL CORRIGIDO

## Todas as decisões incorporadas, todas as RPCs verificadas, todos os bugs conhecidos resolvidos.

---

## DECISÕES FINAIS

| Decisão | Escolha | Impacto |
|---------|---------|---------|
| Cartão de crédito | **Transparente** (dados passam pela Edge Function → Asaas API) | Necessário para parcelamento. À vista usa o mesmo fluxo por consistência. Edge Function recebe dados sensíveis, não os persiste. HTTPS obrigatório. |
| Frete | **Aceitar valor do frontend** com validação básica server-side | Reduz latência do checkout em 2-5s. Validar que `shipping.cost >= 0` e `shipping.cost < 500` (sanity check). |
| RPCs existentes | **Reescrever 3, corrigir 2, manter 2** | `create_order_with_reservation` está QUEBRADA (10 colunas erradas). Corrigir ANTES de qualquer integração. |

---

## FASE 1 — CORRIGIR RPCs EXISTENTES (BLOQUEANTE)

> **Nada mais funciona se isso não for feito primeiro.**
> A Edge Function vai chamar essas RPCs. Se estiverem quebradas, o checkout inteiro falha.

### 1.1 REESCREVER: `create_order_with_reservation`

A versão atual tem 10 problemas que causam falha imediata. Esta é a versão corrigida, alinhada com o schema real.

```sql
-- =============================================================================
-- REESCRITA COMPLETA: create_order_with_reservation
-- 
-- MUDANÇAS vs. versão anterior:
--   - total_amount → total (coluna correta)
--   - billing_address removido (não existe na tabela)
--   - customer_phone, customer_cpf, shipping_cost, payment_method adicionados
--   - order_items: unit_price → price, total_price → subtotal
--   - order_items: brand_id e product_name agora são preenchidos
--   - Geração manual de order_number REMOVIDA (trigger cuida disso)
--   - increment_coupon_usage removido daqui (já feito inline, evita incremento 2x)
--   - reserved_until salvo na orders para o frontend mostrar timer
-- =============================================================================
CREATE OR REPLACE FUNCTION public.create_order_with_reservation(
  p_brand_id UUID,
  p_user_id UUID DEFAULT NULL,            -- NULL = guest checkout
  p_customer_name TEXT DEFAULT '',
  p_customer_email TEXT DEFAULT '',
  p_customer_phone TEXT DEFAULT '',
  p_customer_cpf TEXT DEFAULT '',
  p_items JSONB DEFAULT '[]'::jsonb,
  -- Cada item: { 
  --   "product_id": "uuid", 
  --   "variant_id": "uuid|null",
  --   "quantity": 1,
  --   "product_name": "Nome do Produto",
  --   "variant_name": "P / Azul",
  --   "sku": "SKU-001",
  --   "price": 59.90,            -- preço unitário (já recalculado server-side)
  --   "product_image_url": "https://..."
  -- }
  p_shipping_address JSONB DEFAULT '{}'::jsonb,
  p_subtotal NUMERIC DEFAULT 0,
  p_shipping_cost NUMERIC DEFAULT 0,
  p_discount NUMERIC DEFAULT 0,
  p_total NUMERIC DEFAULT 0,
  p_coupon_code TEXT DEFAULT NULL,
  p_discount_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL,      -- 'pix' | 'credit_card'
  p_installments INTEGER DEFAULT 1,
  p_customer_notes TEXT DEFAULT NULL,
  p_reservation_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_variant RECORD;
  v_available INTEGER;
  v_reserved_until TIMESTAMPTZ;
BEGIN
  v_reserved_until := now() + (p_reservation_minutes || ' minutes')::INTERVAL;

  -- =========================================
  -- 1. VALIDAR ESTOQUE DE TODOS OS ITEMS
  -- Falha rápido antes de criar qualquer coisa
  -- =========================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Buscar estoque disponível
    v_available := get_available_stock(
      (v_item->>'product_id')::UUID,
      CASE WHEN v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != 'null'
        THEN (v_item->>'variant_id')::UUID
        ELSE NULL
      END
    );
    
    IF v_available < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto %. Disponível: %, Solicitado: %',
        v_item->>'product_name',
        v_available,
        (v_item->>'quantity')::INTEGER;
    END IF;
  END LOOP;

  -- =========================================
  -- 2. CRIAR O PEDIDO
  -- order_number é gerado pelo trigger generate_order_number
  -- =========================================
  INSERT INTO orders (
    brand_id,
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    customer_cpf,
    shipping_address,
    subtotal,
    shipping_cost,
    discount,
    total,
    status,
    payment_status,
    fulfillment_status,
    payment_method,
    installments,
    coupon_code,
    discount_amount,
    customer_notes,
    reserved_until
  ) VALUES (
    p_brand_id,
    p_user_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_customer_cpf,
    p_shipping_address,
    p_subtotal,
    p_shipping_cost,
    p_discount,
    p_total,
    'pending',           -- status do pedido
    'pending',           -- payment_status
    'unfulfilled',       -- fulfillment_status
    p_payment_method,
    p_installments,
    p_coupon_code,
    p_discount_amount,
    p_customer_notes,
    v_reserved_until
  )
  RETURNING id INTO v_order_id;

  -- =========================================
  -- 3. CRIAR ORDER_ITEMS + RESERVAS DE ESTOQUE
  -- =========================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Inserir order_item com todas as colunas NOT NULL
    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      brand_id,
      product_name,
      variant_name,
      sku,
      price,
      quantity,
      subtotal,
      product_image_url
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      CASE WHEN v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != 'null'
        THEN (v_item->>'variant_id')::UUID
        ELSE NULL
      END,
      p_brand_id,
      COALESCE(v_item->>'product_name', 'Produto'),
      v_item->>'variant_name',
      v_item->>'sku',
      (v_item->>'price')::NUMERIC,
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC * (v_item->>'quantity')::INTEGER,
      v_item->>'product_image_url'
    );

    -- Criar reserva de estoque
    INSERT INTO stock_reservations (
      order_id,
      product_id,
      variant_id,
      brand_id,
      quantity,
      reserved_until,
      status
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      CASE WHEN v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != 'null'
        THEN (v_item->>'variant_id')::UUID
        ELSE NULL
      END,
      p_brand_id,
      (v_item->>'quantity')::INTEGER,
      v_reserved_until,
      'pending'
    );

    -- Incrementar reserved_stock na variant (se variant_id existir)
    IF v_item->>'variant_id' IS NOT NULL AND v_item->>'variant_id' != 'null' THEN
      UPDATE product_variants
      SET reserved_stock = reserved_stock + (v_item->>'quantity')::INTEGER
      WHERE id = (v_item->>'variant_id')::UUID;
    END IF;
  END LOOP;

  -- =========================================
  -- 4. REGISTRAR USO DO CUPOM (se aplicável)
  -- =========================================
  IF p_coupon_code IS NOT NULL AND p_coupon_code != '' THEN
    -- Incrementar usage_count na tabela coupons
    UPDATE coupons 
    SET usage_count = usage_count + 1
    WHERE code = p_coupon_code 
      AND brand_id = p_brand_id 
      AND active = true;
    
    -- Registrar na coupon_uses
    INSERT INTO coupon_uses (coupon_id, order_id, brand_id, discount_applied, order_total)
    SELECT c.id, v_order_id, p_brand_id, p_discount_amount, p_total
    FROM coupons c
    WHERE c.code = p_coupon_code AND c.brand_id = p_brand_id;
  END IF;

  RETURN v_order_id;
END;
$$;
```

### 1.2 CORRIGIR: `confirm_order_payment`

Problemas: não seta `payment_status` nem `paid_at`. A versão corrigida:

```sql
-- =============================================================================
-- CORREÇÃO: confirm_order_payment
--
-- MUDANÇAS:
--   - Agora seta payment_status = 'confirmed' (antes ficava 'pending')
--   - Agora seta paid_at = now()
--   - Mantém a lógica de confirmar reservas e decrementar stock
-- =============================================================================
CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  p_order_id UUID,
  p_payment_metadata JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- Buscar o pedido com lock
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Pedido não encontrado: %', p_order_id;
  END IF;

  -- Só confirmar se estiver pendente
  IF v_order.payment_status NOT IN ('pending', 'overdue') THEN
    RETURN FALSE;  -- Já foi processado (idempotência)
  END IF;

  -- Atualizar o pedido
  UPDATE orders SET
    status = 'processing',
    payment_status = 'confirmed',
    paid_at = now(),
    reservation_confirmed = TRUE,
    payment_metadata = COALESCE(p_payment_metadata, v_order.payment_metadata),
    updated_at = now()
  WHERE id = p_order_id;

  -- Confirmar reservas de estoque
  UPDATE stock_reservations SET
    status = 'confirmed',
    confirmed_at = now(),
    updated_at = now()
  WHERE order_id = p_order_id
    AND status = 'pending';

  -- Decrementar stock real dos variants
  UPDATE product_variants pv SET
    stock = pv.stock - sr.quantity,
    reserved_stock = GREATEST(0, pv.reserved_stock - sr.quantity)
  FROM stock_reservations sr
  WHERE sr.order_id = p_order_id
    AND sr.status = 'confirmed'
    AND sr.variant_id = pv.id;

  RETURN TRUE;
END;
$$;
```

### 1.3 CORRIGIR: `cancel_order_and_release_stock`

Problemas: não libera reservas `confirmed`, não restaura `stock`, não seta `cancelled_at` nem `payment_status`.

```sql
-- =============================================================================
-- CORREÇÃO: cancel_order_and_release_stock
--
-- MUDANÇAS:
--   - Agora aceita cancelar pedidos com payment_status 'confirmed' (reembolso)
--   - Restaura product_variants.stock para reservas 'confirmed'
--   - Seta cancelled_at e payment_status
--   - Cancela TODAS as reservas (pending E confirmed)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.cancel_order_and_release_stock(
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Não cancelar pedidos já entregues
  IF v_order.status IN ('delivered') THEN
    RETURN FALSE;
  END IF;

  -- Restaurar stock para reservas que já foram confirmadas
  -- (confirm_order_payment decrementou o stock, então precisamos reverter)
  UPDATE product_variants pv SET
    stock = pv.stock + sr.quantity,
    reserved_stock = GREATEST(0, pv.reserved_stock - sr.quantity)
  FROM stock_reservations sr
  WHERE sr.order_id = p_order_id
    AND sr.status = 'confirmed'
    AND sr.variant_id = pv.id;

  -- Liberar reserved_stock para reservas ainda pendentes
  UPDATE product_variants pv SET
    reserved_stock = GREATEST(0, pv.reserved_stock - sr.quantity)
  FROM stock_reservations sr
  WHERE sr.order_id = p_order_id
    AND sr.status = 'pending'
    AND sr.variant_id = pv.id;

  -- Cancelar TODAS as reservas deste pedido
  UPDATE stock_reservations SET
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  WHERE order_id = p_order_id
    AND status IN ('pending', 'confirmed');

  -- Atualizar o pedido
  UPDATE orders SET
    status = 'cancelled',
    payment_status = CASE
      WHEN v_order.payment_status IN ('confirmed', 'received') THEN 'refunded'
      ELSE 'cancelled'
    END,
    cancelled_at = now(),
    updated_at = now()
  WHERE id = p_order_id;

  RETURN TRUE;
END;
$$;
```

### 1.4 Atualizar CHECK constraint de `orders.status`

```sql
-- O CHECK atual: ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')
-- Precisamos adicionar 'refunded' para reembolsos.
-- A tabela está vazia (sem pedidos), então é seguro recriar.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',        -- aguardando pagamento
    'processing',     -- pago, preparando
    'shipped',        -- enviado
    'delivered',      -- entregue
    'cancelled',      -- cancelado (antes do pagamento)
    'refunded'        -- estornado (após pagamento)
  ));
-- Nota: removemos 'paid' porque o plano usa 'processing' como 
-- primeiro status após pagamento. Se o frontend usa 'paid', 
-- verificar useOrders.ts e ajustar ORDER_STATUS_CONFIG.
```

### 1.5 Adicionar CHECK em `orders.payment_status`

```sql
-- Atualmente é texto livre. Vamos restringir.
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'pending',        -- aguardando pagamento
    'confirmed',      -- cartão autorizado (liberar pedido)
    'received',       -- dinheiro na conta (PIX instantâneo / cartão 30 dias)
    'overdue',        -- vencido/expirado
    'refunded',       -- estornado
    'chargeback',     -- contestação
    'cancelled'       -- cancelado antes de pagar
  ));
```

### 1.6 Novas tabelas: `asaas_customers` e `webhook_logs`

```sql
-- =============================================================================
-- asaas_customers: cache local do customer Asaas para evitar duplicatas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.asaas_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  asaas_id TEXT NOT NULL UNIQUE,
  cpf_cnpj TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  mobile_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asaas_customers_cpf 
  ON asaas_customers(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_asaas_customers_user 
  ON asaas_customers(user_id) WHERE user_id IS NOT NULL;

CREATE TRIGGER update_asaas_customers_updated_at 
  BEFORE UPDATE ON asaas_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE asaas_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own asaas_customers" ON asaas_customers
  FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- webhook_logs: idempotência + auditoria dos webhooks Asaas
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  asaas_payment_id TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment 
  ON webhook_logs(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_unprocessed 
  ON webhook_logs(processed) WHERE processed = false;

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;
-- Sem policies = só service_role acessa. Intencional.
```

### 1.7 Function: `process_asaas_webhook`

```sql
-- =============================================================================
-- process_asaas_webhook
-- Chamada pela Edge Function asaas-webhook após validação de auth e idempotência.
-- Usa as RPCs corrigidas (confirm_order_payment, cancel_order_and_release_stock).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.process_asaas_webhook(
  p_asaas_payment_id TEXT,
  p_event_type TEXT,
  p_net_value NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_result BOOLEAN;
BEGIN
  -- Buscar o pedido pelo asaas_payment_id com lock
  SELECT * INTO v_order
  FROM orders
  WHERE asaas_payment_id = p_asaas_payment_id
  FOR UPDATE;

  IF v_order IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Order not found for payment: ' || p_asaas_payment_id
    );
  END IF;

  CASE p_event_type

    -- =====================================================
    -- PAGAMENTO CONFIRMADO
    -- PIX: PAYMENT_RECEIVED (instantâneo)
    -- Cartão: PAYMENT_CONFIRMED (autorizado, liberar pedido)
    -- =====================================================
    WHEN 'PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED' THEN
      IF v_order.payment_status IN ('pending', 'overdue') THEN
        -- Usar a RPC corrigida que seta payment_status + paid_at + confirma estoque
        v_result := confirm_order_payment(
          v_order.id,
          jsonb_build_object(
            'asaas_net_value', p_net_value,
            'last_webhook_event', p_event_type,
            'last_webhook_at', now()
          )
        );
        
        -- Se veio como PAYMENT_RECEIVED (PIX ou cartão 30d depois), atualizar pra 'received'
        IF p_event_type = 'PAYMENT_RECEIVED' THEN
          UPDATE orders SET payment_status = 'received' WHERE id = v_order.id;
        END IF;
      END IF;

    -- =====================================================
    -- PAGAMENTO ATRASADO / PIX EXPIRADO
    -- =====================================================
    WHEN 'PAYMENT_OVERDUE' THEN
      IF v_order.payment_status = 'pending' THEN
        UPDATE orders SET
          payment_status = 'overdue',
          payment_metadata = COALESCE(v_order.payment_metadata, '{}'::jsonb)
            || jsonb_build_object('last_webhook_event', p_event_type, 'last_webhook_at', now()),
          updated_at = now()
        WHERE id = v_order.id;
      END IF;

    -- =====================================================
    -- ESTORNO / REEMBOLSO
    -- =====================================================
    WHEN 'PAYMENT_REFUNDED', 'PAYMENT_REFUND_IN_PROGRESS' THEN
      -- cancel_order_and_release_stock (corrigida) agora:
      -- - Restaura stock de reservas confirmed
      -- - Seta payment_status = 'refunded'
      -- - Seta cancelled_at
      PERFORM cancel_order_and_release_stock(v_order.id);
      -- Sobrescrever status para 'refunded' (cancel seta 'cancelled')
      UPDATE orders SET status = 'refunded', payment_status = 'refunded' WHERE id = v_order.id;

    -- =====================================================
    -- CHARGEBACK
    -- =====================================================
    WHEN 'PAYMENT_CHARGEBACK_REQUESTED', 'PAYMENT_CHARGEBACK_DISPUTE' THEN
      PERFORM cancel_order_and_release_stock(v_order.id);
      UPDATE orders SET
        payment_status = 'chargeback',
        payment_metadata = COALESCE(v_order.payment_metadata, '{}'::jsonb)
          || jsonb_build_object('last_webhook_event', p_event_type, 'last_webhook_at', now())
      WHERE id = v_order.id;

    -- =====================================================
    -- COBRANÇA DELETADA (cancelamento manual no painel Asaas)
    -- =====================================================
    WHEN 'PAYMENT_DELETED' THEN
      IF v_order.payment_status IN ('pending', 'overdue') THEN
        PERFORM cancel_order_and_release_stock(v_order.id);
      END IF;

    -- =====================================================
    -- CARTÃO RECUSADO (captura falhou depois de autorizado)
    -- =====================================================
    WHEN 'PAYMENT_CREDIT_CARD_CAPTURE_REFUSED' THEN
      PERFORM cancel_order_and_release_stock(v_order.id);

    ELSE
      -- Evento não tratado — nenhuma ação, só fica logado em webhook_logs
      NULL;
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order.id,
    'event_type', p_event_type,
    'previous_payment_status', v_order.payment_status
  );
END;
$$;
```

---

## FASE 2 — EDGE FUNCTIONS (Deno)

### 2.1 Arquitetura

```
supabase/functions/
  _shared/
    cors.ts                         # Já existe — manter
    asaas-client.ts                 # NOVO — HTTP client Asaas (findOrCreateCustomer, createPayment, getPixQrCode)
    validation.ts                   # NOVO — validateCPF(), sanitize(), validateItems()
  create-asaas-payment/
    index.ts                        # REESCREVER COMPLETO
  asaas-webhook/
    index.ts                        # NOVO
  calculate-shipping/
    index.ts                        # Já existe — manter
```

### 2.2 Edge Function: `create-asaas-payment` — Fluxo Completo

```
ENTRADA (do frontend):
{
  brand_slug, auth_token?, guest_info?,
  items: [{ product_id, variant_id?, quantity }],
  shipping_address: { recipient_name, cep, street, number, complement?, neighborhood, city, state },
  shipping: { service_name, cost, delivery_days },
  coupon_code?,
  payment: { method: "pix"|"credit_card", credit_card?, credit_card_holder_info?, installments? },
  customer_notes?
}

FLUXO INTERNO:
┌─────────────────────────────────────────────────────────────────┐
│ 1. VALIDAR INPUT                                                │
│    - brand_slug existe e está ativo?                            │
│    - CPF válido? (algoritmo de validação)                       │
│    - Items não vazios?                                          │
│    - payment.method é 'pix' ou 'credit_card'?                  │
│    - Se credit_card: installments <= brand.settings.max?        │
│    - Se installments == 1: NÃO enviar installmentCount ao Asaas│
├─────────────────────────────────────────────────────────────────┤
│ 2. IDENTIFICAR CLIENTE                                          │
│    - Se auth_token: verificar JWT, buscar customer_profiles     │
│    - Se guest: usar guest_info (name, email, cpf, phone)       │
│    - CPF é a chave de identificação em ambos os casos           │
├─────────────────────────────────────────────────────────────────┤
│ 3. RECALCULAR PREÇOS SERVER-SIDE                                │
│    - Para cada item: buscar preço real em products/variants     │
│    - Recalcular subtotal = Σ(price × quantity)                  │
│    - Se variant tem price próprio, usar variant.price           │
│    - Se variant.price é NULL, usar product.price                │
│    - Validar que todos os items pertencem ao mesmo brand_id     │
├─────────────────────────────────────────────────────────────────┤
│ 4. VALIDAR CUPOM SERVER-SIDE (se coupon_code presente)          │
│    - Buscar em coupons por code + brand_id + active             │
│    - Verificar: valid_from, valid_until, usage_limit            │
│    - Calcular desconto real (percentage ou fixed)               │
│    - Aplicar maximum_discount e minimum_purchase                │
├─────────────────────────────────────────────────────────────────┤
│ 5. CALCULAR TOTAL                                               │
│    - total = subtotal + shipping.cost - discount                │
│    - Aplicar freeShippingThreshold do brand.settings            │
│    - Validar total > 0                                          │
│    - Validar minOrderValue do brand.settings                    │
├─────────────────────────────────────────────────────────────────┤
│ 6. FIND OR CREATE CUSTOMER NO ASAAS                             │
│    - Buscar em asaas_customers por cpf_cnpj                     │
│    - Se não existe: criar no Asaas API + salvar localmente      │
│    - Se existe: usar asaas_id existente                         │
├─────────────────────────────────────────────────────────────────┤
│ 7. CRIAR PEDIDO + RESERVAR ESTOQUE (RPC corrigida)              │
│    - Chamar create_order_with_reservation() com TODOS os campos │
│    - RPC valida estoque, cria order, items, reservas, cupom     │
│    - Se falhar (sem estoque): retornar erro OUT_OF_STOCK        │
│    - Retorna order_id (UUID)                                    │
├─────────────────────────────────────────────────────────────────┤
│ 8. CRIAR COBRANÇA NO ASAAS                                      │
│                                                                  │
│    Se PIX:                                                       │
│      POST /v3/payments {                                         │
│        customer: asaas_customer_id,                              │
│        billingType: "PIX",                                       │
│        value: total,                                             │
│        dueDate: hoje + 1 dia,                                    │
│        description: "Pedido #ORDER_NUMBER — BRAND_NAME",         │
│        externalReference: order_id                               │
│      }                                                           │
│      GET /v3/payments/{id}/pixQrCode → encodedImage, payload     │
│                                                                  │
│    Se Cartão À VISTA (installments == 1):                        │
│      POST /v3/payments {                                         │
│        customer: asaas_customer_id,                              │
│        billingType: "CREDIT_CARD",                               │
│        value: total,                                             │
│        dueDate: hoje,                                            │
│        description: "...",                                       │
│        externalReference: order_id,                              │
│        creditCard: { holderName, number, expiryMonth, ... },     │
│        creditCardHolderInfo: { name, cpfCnpj, postalCode, ... },│
│        remoteIp: IP do cliente                                   │
│        ⚠️ SEM installmentCount / installmentValue                │
│      }                                                           │
│                                                                  │
│    Se Cartão PARCELADO (installments >= 2):                      │
│      POST /v3/payments {                                         │
│        ...mesma coisa acima, MAIS:                               │
│        installmentCount: installments,                           │
│        installmentValue: total / installments (arredondado)      │
│      }                                                           │
│                                                                  │
│    ⚠️ Timeout de 60s para cartão (recomendação Asaas)            │
│    ⚠️ Se HTTP 400: pagamento recusado, cancelar order            │
├─────────────────────────────────────────────────────────────────┤
│ 9. ATUALIZAR ORDER COM DADOS DO ASAAS                            │
│    UPDATE orders SET                                             │
│      asaas_payment_id = response.id,                             │
│      asaas_invoice_url = response.invoiceUrl,                    │
│      payment_metadata = {                                        │
│        pix_qr_code_base64, pix_payload, pix_expiration,         │
│        credit_card_last4, credit_card_brand, credit_card_token, │
│        asaas_billing_type, asaas_status                          │
│      }                                                           │
│    WHERE id = order_id                                           │
│                                                                  │
│    Se cartão e HTTP 200 (autorizado):                            │
│      Chamar confirm_order_payment() imediatamente                │
│      (não esperar webhook — confirma na hora)                    │
├─────────────────────────────────────────────────────────────────┤
│ 10. RETORNAR RESPOSTA AO FRONTEND                               │
│     PIX: { order_id, order_number, pix: { qr_code, payload } } │
│     Cartão: { order_id, order_number, status: "CONFIRMED" }     │
│     Erro: { error: { code, message } }                          │
└─────────────────────────────────────────────────────────────────┘
```

**Ponto crucial — Cartão autorizado na hora:**
Quando o cartão retorna HTTP 200, o pagamento já está autorizado. A Edge Function chama `confirm_order_payment()` imediatamente — não espera o webhook. O webhook `PAYMENT_CONFIRMED` que chega depois é tratado como no-op pela idempotência (order já está com `payment_status = 'confirmed'`).

**Ponto crucial — Rollback se Asaas falhar:**
Se a criação da cobrança no Asaas falhar (step 8) DEPOIS de criar a order (step 7), chamar `cancel_order_and_release_stock(order_id)` para liberar o estoque. A order fica com `status = 'cancelled'`.

**Ponto crucial — `remoteIp`:**
Obrigatório para cartão de crédito. Pegar do header da request:
```typescript
const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  ?? req.headers.get("x-real-ip")
  ?? "unknown";
```

### 2.3 Edge Function: `asaas-webhook` — Fluxo

```
1. Validar método POST
2. Validar header 'asaas-access-token' === ASAAS_WEBHOOK_TOKEN
   → Se inválido: retornar 401
3. Parsear body JSON
4. Extrair: event.id, event.event, event.payment.id
5. INSERT INTO webhook_logs (event_id, event_type, asaas_payment_id, payload)
   → Se UNIQUE violation (event_id duplicado): retornar 200 (já processado)
6. Chamar RPC process_asaas_webhook(asaas_payment_id, event_type, net_value)
7. UPDATE webhook_logs SET processed = true, processed_at = now()
   → Se erro no step 6: SET processing_error = mensagem
8. Retornar 200

⚠️ Usar createClient com SUPABASE_SERVICE_ROLE_KEY (bypassa RLS)
⚠️ Responder 200 SEMPRE (mesmo se processamento falhar internamente)
   → O Asaas pausa a fila após 15 respostas não-2xx consecutivas
```

### 2.4 Variáveis de Ambiente (Secrets)

```bash
supabase secrets set ASAAS_API_KEY='$aas_sandbox_...'
supabase secrets set ASAAS_BASE_URL='https://sandbox.asaas.com/api/v3'
supabase secrets set ASAAS_WEBHOOK_TOKEN='gerar-uuid-v4-aqui'
```

---

## FASE 3 — FRONTEND CHECKOUT

### 3.1 Nova estrutura de arquivos

```
src/
  pages/
    CheckoutPage.tsx                    # NOVO — substitui CheckoutExample.tsx
    OrderConfirmationPage.tsx           # NOVO — pós-pagamento
  
  components/checkout/
    CheckoutStepper.tsx                 # Indicador visual dos steps
    CustomerInfoForm.tsx                # Step 1: nome, CPF, email, tel
    GuestOrLoginPrompt.tsx              # Toggle login/guest
    AddressSelector.tsx                 # Step 2: endereços salvos
    AddressForm.tsx                     # Step 2: novo endereço (+ ViaCEP)
    ShippingMethodSelector.tsx          # Step 2: opções Frenet
    PaymentMethodSelector.tsx           # Step 3: PIX ou Cartão
    CreditCardForm.tsx                  # Step 3: formulário do cartão
    InstallmentSelector.tsx             # Step 3: dropdown parcelas
    OrderReview.tsx                     # Step 4: resumo final
    PixPaymentView.tsx                  # Pós-submit: QR Code + polling
    CheckoutSummary.tsx                 # Sidebar: items + totais
  
  hooks/
    useCheckout.ts                      # State machine (steps + dados acumulados)
    useAsaasPayment.ts                  # Chama Edge Function
    usePixPolling.ts                    # Realtime + fallback polling
    useCpfValidation.ts                 # Validação CPF em tempo real
  
  lib/
    asaas.ts                            # REESCREVER — chama create-asaas-payment
    cpf.ts                              # Validação + formatação CPF
    credit-card.ts                      # Detecção bandeira + Luhn
```

### 3.2 Stack de componentes (reusar o que existe)

```
JÁ EXISTE — reusar sem modificar:
  - CouponInput.tsx (validação de cupom client-side)
  - CEPInput.tsx (input de CEP com máscara)
  - ShippingCalculator.tsx (chamada à Edge Function calculate-shipping)
  - ShippingOption.tsx (renderização de opção de frete)
  - LoginModal.tsx (modal de login)
  - PriceDisplay.tsx (formatação de preço)
  - OrderReservationTimer.tsx (timer de reserva)
  - CheckoutStockAlert.tsx (alerta de estoque)
  - MinOrderValueWarning.tsx (aviso de pedido mínimo)

JÁ EXISTE — adaptar:
  - useAddresses.ts → usar no AddressSelector
  - useCustomerProfile.ts → pré-preencher Step 1
  - useShipping.ts → usar no ShippingMethodSelector
  - useCoupons.ts → usar no CheckoutSummary
  - useOrders.ts → verificar ORDER_STATUS_CONFIG (adicionar 'refunded')
  - cartStore.ts → ler items para enviar ao checkout
  - useViaCep.ts → usar no AddressForm
```

### 3.3 Fluxo UX

```
CARRINHO → Botão "Finalizar Compra" → /#/brand/checkout

Step 1: IDENTIFICAÇÃO
┌──────────────────────────────────────────┐
│  ┌─ Logado? ──────────────────────────┐  │
│  │ Dados pré-preenchidos do perfil     │  │
│  │ Nome: [Beone]  CPF: [xxx.xxx.xxx]  │  │
│  │ Email: [x@x.com]  Tel: [21 9xxxx]  │  │
│  │         [Editar dados]              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Guest? ───────────────────────────┐  │
│  │ "Já tem conta? [Entrar]"           │  │
│  │ Nome: [________]                   │  │
│  │ CPF:  [___.___.___-__] ✓ válido    │  │
│  │ Email:[________@____]              │  │
│  │ Tel:  [(__)_____-____]             │  │
│  └────────────────────────────────────┘  │
│                       [Continuar →]      │
└──────────────────────────────────────────┘

Step 2: ENTREGA
┌──────────────────────────────────────────┐
│  ┌─ Endereços salvos (se logado) ─────┐  │
│  │ ○ Casa — Rua X, 123, Centro, RJ    │  │
│  │ ● Trabalho — Av Y, 456, Icaraí     │  │
│  │ ○ Novo endereço                     │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Frete ────────────────────────────┐  │
│  │ ○ SEDEX — R$ 23,50 (3 dias úteis)  │  │
│  │ ● PAC — R$ 15,90 (8 dias úteis)    │  │
│  │ ○ Grátis (pedido acima de R$ 200)  │  │
│  └────────────────────────────────────┘  │
│                       [Continuar →]      │
└──────────────────────────────────────────┘

Step 3: PAGAMENTO
┌──────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐ │
│  │ ● PIX (aprovação instantânea)       │ │
│  │ ○ Cartão de Crédito                 │ │
│  └─────────────────────────────────────┘ │
│                                          │
│  ┌─ Se Cartão ────────────────────────┐  │
│  │ Número: [____ ____ ____ ____] VISA  │  │
│  │ Nome:   [_______________________]   │  │
│  │ Val:    [MM/AA]     CVV: [___]      │  │
│  │ CPF:    [pré-preenchido do step 1]  │  │
│  │                                     │  │
│  │ Parcelas:                           │  │
│  │ [▼ 3x de R$ 53,30 sem juros      ] │  │
│  │   1x de R$ 159,90 (à vista)        │  │
│  │   2x de R$ 79,95 sem juros         │  │
│  │   3x de R$ 53,30 sem juros         │  │
│  │   ...até 12x                        │  │
│  └────────────────────────────────────┘  │
│                       [Continuar →]      │
└──────────────────────────────────────────┘

Step 4: REVISÃO
┌──────────────────────────────────────────┐
│  📦 Items:                               │
│  [img] Produto X — P / Azul — 2x R$59,90│
│  [img] Produto Y — M         — 1x R$40   │
│                                          │
│  📍 Entrega: Rua X, 123 — PAC (8 dias)  │
│  💳 Pagamento: Cartão — 3x R$ 53,30     │
│  🎟️ Cupom: PROMO10 (-R$ 15,98)          │
│                                          │
│  Subtotal:  R$ 159,80                    │
│  Frete:     R$ 15,90                     │
│  Desconto: -R$ 15,98                     │
│  ─────────────────────                   │
│  TOTAL:     R$ 159,72                    │
│                                          │
│           [🔒 Confirmar Pedido]          │
│         (com loading + disabled)         │
└──────────────────────────────────────────┘

PÓS-SUBMIT:

Se PIX:
┌──────────────────────────────────────────┐
│        Pedido #SESH-2026-0001            │
│                                          │
│        ┌─────────────────┐               │
│        │                 │               │
│        │   [QR CODE]     │               │
│        │                 │               │
│        └─────────────────┘               │
│                                          │
│     [📋 Copiar código PIX]              │
│                                          │
│     ⏱️ Expira em: 23:45:12              │
│     ● Aguardando pagamento...            │
│                                          │
│  (Realtime listener aguardando webhook)  │
│  (Quando pago → redirect p/ confirmação) │
└──────────────────────────────────────────┘

Se Cartão (sucesso):
┌──────────────────────────────────────────┐
│        ✅ Pagamento Aprovado!            │
│                                          │
│        Pedido #SESH-2026-0001            │
│        Cartão VISA •••• 8829             │
│        3x de R$ 53,30                    │
│                                          │
│     [Ver meus pedidos]                   │
│     [Continuar comprando]                │
└──────────────────────────────────────────┘
```

### 3.4 Ajuste em `useOrders.ts` — ORDER_STATUS_CONFIG

Adicionar `refunded` ao mapeamento de status para renderização:
```typescript
// Em src/hooks/useOrders.ts (~linha 49)
// Adicionar ao ORDER_STATUS_CONFIG:
refunded: { label: 'Reembolsado', color: 'red', icon: '↩️' }
```

### 3.5 Limpar dependências Stripe

```bash
npm uninstall @stripe/react-stripe-js @stripe/stripe-js
# Deletar src/lib/stripe.ts
```

---

## FASE 4 — SEGURANÇA

### Checklist Final

```
BACKEND:
✅ API Key só em Deno.env (secret da Edge Function)
✅ Recalcular preços server-side (buscar do Supabase)
✅ Frete aceito do frontend com sanity check (>= 0, < 500)
✅ Validar CPF server-side (algoritmo)
✅ Timeout 60s para requests de cartão
✅ Não logar número completo do cartão ou CVV
✅ remoteIp extraído do header (obrigatório para cartão)
✅ Webhook: validar asaas-access-token
✅ Webhook: idempotência via UNIQUE event_id
✅ Webhook: service_role key (não anon)
✅ Webhook: sempre retornar 200
✅ RPC com SECURITY DEFINER + FOR UPDATE (lock de row)

FRONTEND:
✅ Dados do cartão em state local do componente (nunca global)
✅ Limpar state do cartão após envio
✅ Mensagem genérica para erro de cartão
✅ Botão desabilitado durante request
✅ HTTPS garantido pela Vercel

SUPABASE:
✅ RLS em todas as tabelas
✅ webhook_logs sem policy pública
✅ CHECK constraints em orders.status e payment_status
✅ Trigger generate_order_number gera automaticamente
```

---

## SEQUÊNCIA DE EXECUÇÃO

```
SPRINT 1 — Schema + RPCs (BLOQUEANTE) — 1 dia
│
├── 1. REESCREVER create_order_with_reservation (10 bugs)
├── 2. CORRIGIR confirm_order_payment (falta payment_status, paid_at)
├── 3. CORRIGIR cancel_order_and_release_stock (não reverte stock confirmed)
├── 4. Atualizar CHECK constraint orders.status (+refunded, -paid)
├── 5. Adicionar CHECK constraint orders.payment_status
├── 6. Criar tabela asaas_customers
├── 7. Criar tabela webhook_logs
├── 8. Criar function process_asaas_webhook
├── 9. Adicionar 'refunded' ao ORDER_STATUS_CONFIG no frontend
└── 10. Remover Stripe (npm uninstall + deletar stripe.ts)

SPRINT 2 — Edge Functions — 2-3 dias
│
├── 1. Criar _shared/asaas-client.ts
├── 2. Criar _shared/validation.ts
├── 3. REESCREVER create-asaas-payment/index.ts (fluxo completo)
├── 4. CRIAR asaas-webhook/index.ts
├── 5. Configurar Sandbox (conta, PIX key, webhook URL)
├── 6. Setar secrets (ASAAS_API_KEY, ASAAS_BASE_URL, ASAAS_WEBHOOK_TOKEN)
└── 7. Testar via curl/Postman (criar pedido PIX, cartão 1x, cartão 3x)

SPRINT 3 — Frontend Checkout — 3-5 dias
│
├── 1. CheckoutPage.tsx + useCheckout.ts (state machine)
├── 2. Step 1: CustomerInfoForm + GuestOrLoginPrompt
├── 3. Step 2: AddressSelector + ShippingMethodSelector
├── 4. Step 3: PaymentMethodSelector + CreditCardForm + InstallmentSelector
├── 5. Step 4: OrderReview + CheckoutSummary
├── 6. PixPaymentView + usePixPolling (Realtime)
├── 7. OrderConfirmationPage
├── 8. Integrar useAsaasPayment.ts
├── 9. Reescrever src/lib/asaas.ts
└── 10. Criar src/lib/cpf.ts + src/lib/credit-card.ts

SPRINT 4 — Testes + Produção — 1-2 dias
│
├── 1. Testar todos os cenários em Sandbox (PIX, cartão 1x, parcelado, erro, reembolso)
├── 2. Testar guest checkout + logged checkout
├── 3. Testar idempotência do webhook (enviar 2x)
├── 4. Testar estoque (último item, estoque esgotado durante checkout)
├── 5. Testar cupom (válido, expirado, limite atingido)
├── 6. Code review de segurança
├── 7. Switch para produção (trocar secrets)
├── 8. Testar transação real R$ 1,00
└── 9. Deploy + monitorar webhooks 24h
```

---

## PROMPT PARA CLAUDE CODE — INICIAR SPRINT 1

```
Execute a Sprint 1 da integração Asaas. Todo o SQL está no plano.
A ORDEM IMPORTA — execute exatamente nesta sequência:

1. REESCREVER a function create_order_with_reservation (copiar SQL do plano — seção 1.1)
2. REESCREVER a function confirm_order_payment (seção 1.2)
3. REESCREVER a function cancel_order_and_release_stock (seção 1.3)
4. DROP e recriar CHECK constraint orders_status_check (seção 1.4)
5. Adicionar CHECK constraint orders_payment_status_check (seção 1.5)
6. Criar tabela asaas_customers (seção 1.6)
7. Criar tabela webhook_logs (seção 1.6)
8. Criar function process_asaas_webhook (seção 1.7)
9. No frontend: em src/hooks/useOrders.ts, adicionar 'refunded' ao ORDER_STATUS_CONFIG
10. Rodar: npm uninstall @stripe/react-stripe-js @stripe/stripe-js
11. Deletar src/lib/stripe.ts

Após executar, rode estas verificações:
- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('create_order_with_reservation', 'confirm_order_payment', 'cancel_order_and_release_stock', 'process_asaas_webhook');
- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND contype = 'c';
- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('asaas_customers', 'webhook_logs');
```
