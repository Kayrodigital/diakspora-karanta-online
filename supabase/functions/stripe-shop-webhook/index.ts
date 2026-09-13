import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} n'est pas configuré.`);
  return value;
}

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts = header.split(",").map((part) => part.split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300)
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return signatures.some((signature) => safeEqual(expected, signature));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  if (!(await verifyStripeSignature(rawBody, signature, required("STRIPE_WEBHOOK_SECRET")))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    id: string;
    type: string;
    data: { object: Record<string, unknown> };
  };
  const supabase = createClient(required("SUPABASE_URL"), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing } = await supabase
    .from("shop_webhook_events")
    .select("status")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing?.status === "completed") return new Response("ok", { status: 200 });

  await supabase.from("shop_webhook_events").upsert({
    event_id: event.id,
    event_type: event.type,
    status: "processing",
    last_error: null,
    updated_at: new Date().toISOString(),
  });

  try {
    const object = event.data.object;
    const metadata = (object.metadata ?? {}) as Record<string, string>;
    const orderId = metadata.order_id;

    if (
      orderId &&
      (event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded") &&
      object.payment_status === "paid"
    ) {
      const collected = (object.collected_information ?? {}) as Record<string, unknown>;
      const shippingDetails = (collected.shipping_details ??
        object.shipping_details ??
        {}) as Record<string, unknown>;
      const customer = (object.customer_details ?? {}) as Record<string, unknown>;
      const { error } = await supabase.rpc("mark_shop_order_paid", {
        p_order_id: orderId,
        p_checkout_session_id: String(object.id ?? ""),
        p_payment_intent_id: object.payment_intent ? String(object.payment_intent) : null,
        p_shipping_address: shippingDetails.address ?? customer.address ?? null,
      });
      if (error) throw error;
    }

    if (
      orderId &&
      (event.type === "checkout.session.expired" ||
        event.type === "checkout.session.async_payment_failed")
    ) {
      const { error } = await supabase.rpc("release_shop_order", {
        p_order_id: orderId,
        p_status: "expired",
      });
      if (error) throw error;
    }

    await supabase
      .from("shop_webhook_events")
      .update({
        status: "completed",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);
    return new Response("ok", { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await supabase
      .from("shop_webhook_events")
      .update({
        status: "failed",
        last_error: message.slice(0, 1000),
        updated_at: new Date().toISOString(),
      })
      .eq("event_id", event.id);
    return new Response("Webhook processing failed", { status: 500 });
  }
});
