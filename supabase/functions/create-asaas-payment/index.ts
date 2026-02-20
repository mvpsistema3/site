import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { findOrCreateCustomer, createPayment, getPixQrCode } from "../_shared/asaas-client.ts";
import { validateCPF, sanitize, validateItems, validatePaymentMethod, formatDateForAsaas } from "../_shared/validation.ts";

/**
 * Edge Function: create-asaas-payment
 * Complete 10-step checkout flow as defined in Sprint 2.
 *
 * INPUT:
 * {
 *   brand_slug, auth_token?, guest_info?,
 *   items: [{ product_id, variant_id?, quantity }],
 *   shipping_address: { recipient_name, cep, street, number, complement?, neighborhood, city, state },
 *   shipping: { service_name, cost, delivery_days },
 *   coupon_code?,
 *   payment: { method: "pix"|"credit_card", credit_card?, credit_card_holder_info?, installments? },
 *   customer_notes?
 * }
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Parse request body ──────────────────────────────────────────────
    const body = await req.json();
    const {
      brand_slug,
      items,
      shipping_address,
      shipping,
      coupon_code,
      payment,
      customer_notes,
      // Legacy fields for backwards compatibility
      guest_info,
    } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Auth client (optional - for logged-in users)
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // ════════════════════════════════════════════════════════════════════
    // STEP 1: VALIDATE INPUT
    // ════════════════════════════════════════════════════════════════════

    // 1a. Validate brand
    if (!brand_slug) {
      return errorResponse(400, "MISSING_BRAND", "brand_slug é obrigatório");
    }

    const { data: brand, error: brandError } = await supabaseAdmin
      .from("brands")
      .select("id, slug, name, settings, features, active")
      .eq("slug", brand_slug)
      .eq("active", true)
      .single();

    if (brandError || !brand) {
      return errorResponse(400, "INVALID_BRAND", "Marca não encontrada ou inativa");
    }

    // 1b. Validate items
    const itemsValidation = validateItems(items);
    if (!itemsValidation.valid) {
      return errorResponse(400, "INVALID_ITEMS", itemsValidation.error!);
    }

    // 1c. Validate payment method
    if (!payment?.method || !validatePaymentMethod(payment.method)) {
      return errorResponse(400, "INVALID_PAYMENT_METHOD", "Método de pagamento deve ser 'pix' ou 'credit_card'");
    }

    // 1d. Validate installments for credit card
    const installments = payment.method === "credit_card" ? (payment.installments || 1) : 1;
    const maxInstallments = brand.settings?.maxInstallments || 12;
    if (installments > maxInstallments) {
      return errorResponse(400, "INVALID_INSTALLMENTS", `Máximo de ${maxInstallments}x parcelas`);
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 2: IDENTIFY CUSTOMER
    // ════════════════════════════════════════════════════════════════════

    let userId: string | null = null;
    let customerName = "";
    let customerEmail = "";
    let customerCpf = "";
    let customerPhone = "";

    if (authHeader) {
      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        userId = user.id;

        // Fetch customer profile
        const { data: profile } = await supabaseAdmin
          .from("customer_profiles")
          .select("display_name, email, phone, cpf")
          .eq("id", userId)
          .single();

        if (profile) {
          customerName = profile.display_name || "";
          customerEmail = profile.email || user.email || "";
          customerCpf = profile.cpf || "";
          customerPhone = profile.phone || "";
        } else {
          customerEmail = user.email || "";
        }
      }
    }

    // Override with guest_info if provided (guest checkout or form overrides)
    if (guest_info) {
      customerName = sanitize(guest_info.name) || customerName;
      customerEmail = sanitize(guest_info.email) || customerEmail;
      customerCpf = guest_info.cpf?.replace(/\D/g, "") || customerCpf;
      customerPhone = guest_info.phone?.replace(/\D/g, "") || customerPhone;
    }

    // Validate CPF
    if (!validateCPF(customerCpf)) {
      return errorResponse(400, "INVALID_CPF", "CPF inválido. Por favor, verifique o CPF informado.");
    }

    if (!customerEmail) {
      return errorResponse(400, "MISSING_EMAIL", "Email é obrigatório");
    }

    if (!customerPhone || customerPhone.length < 10) {
      return errorResponse(400, "INVALID_PHONE", "Telefone inválido. Informe DDD + número.");
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 3: RECALCULATE PRICES SERVER-SIDE
    // ════════════════════════════════════════════════════════════════════

    let subtotal = 0;
    const enrichedItems: any[] = [];

    for (const item of items) {
      // Fetch the product + variant to get the real price
      let price: number;
      let productName = "";
      let variantName = "";
      let sku = "";
      let productImageUrl = "";
      let productBrandId = "";

      if (item.variant_id) {
        const { data: variant, error: variantError } = await supabaseAdmin
          .from("product_variants")
          .select("id, price, color, size, sku, image_url, product_id, products(id, name, price, brand_id, active)")
          .eq("id", item.variant_id)
          .eq("active", true)
          .single();

        if (variantError || !variant) {
          return errorResponse(400, "INVALID_VARIANT", `Variante ${item.variant_id} não encontrada ou inativa`);
        }

        const product = (variant as any).products;
        if (!product?.active) {
          return errorResponse(400, "INACTIVE_PRODUCT", `Produto ${product?.name || item.product_id} está inativo`);
        }

        productBrandId = product.brand_id;
        price = variant.price ?? product.price;
        productName = product.name;
        variantName = [variant.color, variant.size].filter(Boolean).join(" / ");
        sku = variant.sku || "";
        productImageUrl = variant.image_url || "";
      } else {
        const { data: product, error: productError } = await supabaseAdmin
          .from("products")
          .select("id, name, price, brand_id, active")
          .eq("id", item.product_id)
          .eq("active", true)
          .single();

        if (productError || !product) {
          return errorResponse(400, "INVALID_PRODUCT", `Produto ${item.product_id} não encontrado ou inativo`);
        }

        productBrandId = product.brand_id;
        price = product.price;
        productName = product.name;
      }

      // Validate item belongs to the same brand
      if (productBrandId !== brand.id) {
        return errorResponse(400, "BRAND_MISMATCH", `Produto ${productName} não pertence à marca ${brand.name}`);
      }

      const itemSubtotal = Number(price) * item.quantity;
      subtotal += itemSubtotal;

      enrichedItems.push({
        product_id: item.product_id,
        variant_id: item.variant_id || null,
        quantity: item.quantity,
        price: Number(price),
        product_name: productName,
        variant_name: variantName,
        sku,
        product_image_url: productImageUrl,
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    // ════════════════════════════════════════════════════════════════════
    // STEP 4: VALIDATE COUPON SERVER-SIDE
    // ════════════════════════════════════════════════════════════════════

    let discount = 0;
    let couponCodeUsed: string | null = null;

    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .eq("code", coupon_code.toUpperCase())
        .eq("brand_id", brand.id)
        .eq("active", true)
        .single();

      if (coupon) {
        const now = new Date();
        const validFrom = new Date(coupon.valid_from);
        const validUntil = coupon.valid_until ? new Date(coupon.valid_until) : null;

        const isValid =
          now >= validFrom &&
          (!validUntil || now <= validUntil) &&
          (!coupon.usage_limit || coupon.usage_count < coupon.usage_limit) &&
          (!coupon.minimum_purchase || subtotal >= Number(coupon.minimum_purchase));

        if (isValid) {
          if (coupon.discount_type === "percentage") {
            discount = subtotal * (Number(coupon.discount_value) / 100);
          } else {
            discount = Number(coupon.discount_value);
          }

          // Apply maximum_discount cap
          if (coupon.maximum_discount && discount > Number(coupon.maximum_discount)) {
            discount = Number(coupon.maximum_discount);
          }

          discount = Number(discount.toFixed(2));
          couponCodeUsed = coupon.code;
        }
      }
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 5: CALCULATE TOTAL
    // ════════════════════════════════════════════════════════════════════

    const shippingCost = Number(shipping?.cost || 0);
    const freeShippingThreshold = brand.settings?.freeShippingThreshold;
    const effectiveShipping = (freeShippingThreshold && subtotal >= freeShippingThreshold) ? 0 : shippingCost;

    let total = subtotal + effectiveShipping - discount;
    total = Number(total.toFixed(2));

    if (total <= 0) {
      return errorResponse(400, "INVALID_TOTAL", "Valor total do pedido deve ser maior que zero");
    }

    const minOrderValue = brand.settings?.minOrderValue;
    if (minOrderValue && total < minOrderValue) {
      return errorResponse(400, "MIN_ORDER_VALUE", `Pedido mínimo de R$ ${minOrderValue.toFixed(2)}`);
    }

    console.log(`Order: subtotal=${subtotal}, shipping=${effectiveShipping}, discount=${discount}, total=${total}`);

    // ════════════════════════════════════════════════════════════════════
    // STEP 6: FIND OR CREATE CUSTOMER IN ASAAS
    // ════════════════════════════════════════════════════════════════════

    const asaasCustomerId = await findOrCreateCustomer(supabaseAdmin, {
      cpfCnpj: customerCpf,
      name: customerName || customerEmail.split("@")[0],
      email: customerEmail,
      mobilePhone: customerPhone,
      userId,
    });

    // ════════════════════════════════════════════════════════════════════
    // STEP 7: CREATE ORDER + RESERVE STOCK (via RPC)
    // ════════════════════════════════════════════════════════════════════

    const { data: orderId, error: orderError } = await supabaseAdmin.rpc(
      "create_order_with_reservation",
      {
        p_brand_id: brand.id,
        p_user_id: userId,
        p_customer_name: customerName || customerEmail.split("@")[0],
        p_customer_email: customerEmail,
        p_customer_phone: customerPhone,
        p_customer_cpf: customerCpf,
        p_items: enrichedItems,
        p_shipping_address: shipping_address || {},
        p_subtotal: subtotal,
        p_shipping_cost: effectiveShipping,
        p_discount: discount,
        p_total: total,
        p_coupon_code: couponCodeUsed,
        p_discount_amount: discount,
        p_payment_method: payment.method,
        p_installments: installments,
        p_customer_notes: customer_notes || null,
        p_reservation_minutes: 15,
      }
    );

    if (orderError) {
      console.error("RPC create_order_with_reservation failed:", orderError);
      if (orderError.message?.includes("Estoque insuficiente")) {
        return errorResponse(400, "OUT_OF_STOCK", orderError.message);
      }
      return errorResponse(500, "ORDER_CREATION_FAILED", "Falha ao criar pedido");
    }

    // Fetch the order to get the generated order_number
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number")
      .eq("id", orderId)
      .single();

    if (!order) {
      return errorResponse(500, "ORDER_NOT_FOUND", "Pedido criado mas não encontrado");
    }

    console.log(`Order created: ${order.id} (${order.order_number})`);

    // ════════════════════════════════════════════════════════════════════
    // STEP 8: CREATE PAYMENT IN ASAAS
    // ════════════════════════════════════════════════════════════════════

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (payment.method === "pix" ? 1 : 0));

    let asaasPayment;
    try {
      const paymentParams: any = {
        customer: asaasCustomerId,
        billingType: payment.method === "pix" ? "PIX" : "CREDIT_CARD",
        value: total,
        dueDate: formatDateForAsaas(dueDate),
        description: `Pedido #${order.order_number} — ${brand.name}`,
        externalReference: order.id,
      };

      if (payment.method === "credit_card") {
        if (installments >= 2) {
          paymentParams.installmentCount = installments;
          paymentParams.installmentValue = Number((total / installments).toFixed(2));
        }

        if (payment.credit_card) {
          paymentParams.creditCard = payment.credit_card;
        }
        if (payment.credit_card_holder_info) {
          paymentParams.creditCardHolderInfo = payment.credit_card_holder_info;
        }

        // Extract remoteIp from request headers
        paymentParams.remoteIp =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          req.headers.get("x-real-ip") ??
          "unknown";
      }

      asaasPayment = await createPayment(paymentParams);
    } catch (paymentError: any) {
      // ROLLBACK: Cancel order and release stock
      console.error("Asaas payment failed, rolling back order:", paymentError);
      await supabaseAdmin.rpc("cancel_order_and_release_stock", {
        p_order_id: order.id,
      });

      return errorResponse(
        400,
        "PAYMENT_FAILED",
        paymentError.message || "Erro ao processar pagamento",
        { asaasError: paymentError.asaasError }
      );
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 9: UPDATE ORDER WITH ASAAS DATA
    // ════════════════════════════════════════════════════════════════════

    const paymentMetadata: any = {
      asaas_billing_type: asaasPayment.billingType,
      asaas_status: asaasPayment.status,
    };

    // For PIX: get QR code
    let pixData: AsaasPixQrCode | null = null;
    if (payment.method === "pix") {
      try {
        pixData = await getPixQrCode(asaasPayment.id);
        paymentMetadata.pix_qr_code_base64 = pixData.encodedImage;
        paymentMetadata.pix_payload = pixData.payload;
        paymentMetadata.pix_expiration = pixData.expirationDate;
      } catch (pixError) {
        console.error("Failed to get PIX QR code:", pixError);
        // Don't fail the order - the invoiceUrl can be used as fallback
      }
    }

    // For credit card: extract card info
    if (payment.method === "credit_card" && payment.credit_card) {
      const cardNumber = payment.credit_card.number?.replace(/\D/g, "") || "";
      paymentMetadata.credit_card_last4 = cardNumber.slice(-4);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        asaas_payment_id: asaasPayment.id,
        asaas_invoice_url: asaasPayment.invoiceUrl,
        payment_metadata: paymentMetadata,
      })
      .eq("id", order.id);

    // For credit card: if Asaas returned success (authorized), confirm payment immediately
    if (payment.method === "credit_card" && asaasPayment.status === "CONFIRMED") {
      console.log("Credit card authorized immediately, confirming payment...");
      await supabaseAdmin.rpc("confirm_order_payment", {
        p_order_id: order.id,
        p_payment_metadata: {
          ...paymentMetadata,
          confirmed_at: new Date().toISOString(),
          confirmed_by: "edge_function",
        },
      });
    }

    // ════════════════════════════════════════════════════════════════════
    // STEP 10: RETURN RESPONSE
    // ════════════════════════════════════════════════════════════════════

    const responseData: any = {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
    };

    if (payment.method === "pix") {
      responseData.pix = {
        qr_code: pixData?.encodedImage || null,
        payload: pixData?.payload || null,
        expiration: pixData?.expirationDate || null,
      };
      responseData.invoice_url = asaasPayment.invoiceUrl;
    } else {
      responseData.status = asaasPayment.status === "CONFIRMED" ? "CONFIRMED" : "PENDING";
    }

    console.log(`Payment created successfully: ${asaasPayment.id} (${payment.method})`);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Unhandled error in create-asaas-payment:", error);
    return errorResponse(500, "INTERNAL_ERROR", error.message || "Erro interno do servidor");
  }
});

// ── Helper: PIX QR code type ─────────────────────────────────────────────────
interface AsaasPixQrCode {
  encodedImage: string;
  payload: string;
  expirationDate: string;
}

// ── Helper: Error response builder ───────────────────────────────────────────
function errorResponse(
  status: number,
  code: string,
  message: string,
  extra?: Record<string, any>
): Response {
  return new Response(
    JSON.stringify({ error: { code, message, ...extra } }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
