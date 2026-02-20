import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

/**
 * Edge Function: asaas-webhook
 * Handles webhook events from Asaas payment gateway.
 *
 * Flow:
 * 1. Validate POST method
 * 2. Validate asaas-access-token header
 * 3. Parse JSON body
 * 4. Extract event data
 * 5. INSERT into webhook_logs (idempotency via unique event_id)
 * 6. Call RPC process_asaas_webhook()
 * 7. Update webhook_logs with result
 * 8. ALWAYS return 200
 */

const ASAAS_WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Always return 200 to Asaas (they pause after 15 consecutive non-2xx)
  try {
    // ── Step 1: Validate POST method ──────────────────────────────────
    if (req.method !== "POST") {
      console.warn("Webhook received non-POST request:", req.method);
      return ok({ received: false, reason: "method_not_allowed" });
    }

    // ── Step 2: Validate webhook token ────────────────────────────────
    const accessToken = req.headers.get("asaas-access-token");

    if (ASAAS_WEBHOOK_TOKEN && accessToken !== ASAAS_WEBHOOK_TOKEN) {
      console.warn("Invalid webhook token received");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Step 3: Parse JSON body ───────────────────────────────────────
    const event = await req.json();

    // ── Step 4: Extract event data ────────────────────────────────────
    const eventId = event.id;
    const eventType = event.event;
    const paymentData = event.payment;

    if (!eventId || !eventType || !paymentData?.id) {
      console.warn("Malformed webhook event:", JSON.stringify(event));
      return ok({ received: false, reason: "malformed_event" });
    }

    const asaasPaymentId = paymentData.id;
    const netValue = paymentData.netValue || paymentData.value || 0;

    console.log(`Webhook received: ${eventType} for payment ${asaasPaymentId} (event ${eventId})`);

    // ── Supabase client (service role - bypass RLS) ───────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Step 5: INSERT into webhook_logs (idempotency) ────────────────
    const { error: insertError } = await supabaseAdmin
      .from("webhook_logs")
      .insert({
        event_id: eventId,
        event_type: eventType,
        asaas_payment_id: asaasPaymentId,
        payload: event,
        processed: false,
      });

    if (insertError) {
      // UNIQUE violation = already processed (idempotency)
      if (insertError.code === "23505") {
        console.log(`Event ${eventId} already processed (idempotent skip)`);
        return ok({ received: true, already_processed: true });
      }
      console.error("Error inserting webhook_log:", insertError);
      // Continue anyway - we don't want to miss processing
    }

    // ── Step 6: Call RPC process_asaas_webhook ────────────────────────
    let processingError: string | null = null;
    let result: any = null;

    try {
      const { data, error: rpcError } = await supabaseAdmin.rpc(
        "process_asaas_webhook",
        {
          p_asaas_payment_id: asaasPaymentId,
          p_event_type: eventType,
          p_net_value: netValue,
        }
      );

      if (rpcError) {
        processingError = rpcError.message;
        console.error("RPC process_asaas_webhook error:", rpcError);
      } else {
        result = data;
        console.log("Webhook processed successfully:", JSON.stringify(result));
      }
    } catch (rpcErr: any) {
      processingError = rpcErr.message || "Unknown RPC error";
      console.error("RPC exception:", rpcErr);
    }

    // ── Step 7: Update webhook_logs with result ───────────────────────
    await supabaseAdmin
      .from("webhook_logs")
      .update({
        processed: !processingError,
        processed_at: new Date().toISOString(),
        processing_error: processingError,
      })
      .eq("event_id", eventId);

    // ── Step 8: Always return 200 ─────────────────────────────────────
    return ok({
      received: true,
      processed: !processingError,
      event_type: eventType,
      ...(processingError ? { error: processingError } : {}),
    });
  } catch (error: any) {
    console.error("Unhandled webhook error:", error);
    // ALWAYS return 200 even on unhandled errors
    return ok({ received: true, error: error.message || "Internal error" });
  }
});

function ok(data: Record<string, any>): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
