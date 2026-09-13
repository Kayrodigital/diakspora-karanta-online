import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutPayload = {
  shopSlug?: string;
  customer?: { email?: string; name?: string; phone?: string };
  items?: Array<{ productId?: string; quantity?: number }>;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

async function fingerprint(request: Request) {
  const source = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
    request.headers.get("user-agent"),
  ]
    .filter(Boolean)
    .join("|");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  const supabase = createClient(required("SUPABASE_URL"), secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let orderId: string | null = null;

  try {
    const payload = (await request.json()) as CheckoutPayload;
    const shopSlug = payload.shopSlug?.trim();
    const email = payload.customer?.email?.trim().toLowerCase();
    const name = payload.customer?.name?.trim();
    const phone = payload.customer?.phone?.trim() ?? "";
    const items = (payload.items ?? []).map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    }));

    if (!shopSlug || !email || !name || !items.length) {
      return json({ error: "Les informations de commande sont incomplètes." }, 400);
    }

    const { data: allowed, error: rateError } = await supabase.rpc(
      "check_shop_checkout_rate_limit",
      { p_fingerprint: await fingerprint(request) },
    );
    if (rateError) throw rateError;
    if (!allowed)
      return json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, 429);

    const { data: shop, error: shopError } = await supabase
      .from("shop_settings")
      .select("id, currency, payment_enabled")
      .eq("slug", shopSlug)
      .eq("status", "active")
      .maybeSingle();
    if (shopError) throw shopError;
    if (!shop?.payment_enabled)
      return json({ error: "Le paiement en ligne est en cours de configuration." }, 503);

    let userId: string | null = null;
    const authorization = request.headers.get("Authorization");
    if (authorization?.startsWith("Bearer ")) {
      const { data } = await supabase.auth.getUser(authorization.slice(7));
      userId = data.user?.id ?? null;
    }

    const { data: order, error: orderError } = await supabase.rpc("create_shop_order", {
      p_shop_id: shop.id,
      p_customer_email: email,
      p_customer_name: name,
      p_customer_phone: phone,
      p_items: items,
      p_user_id: userId,
    });
    if (orderError) throw orderError;
    orderId = String(order.id);

    const { data: orderItems, error: itemsError } = await supabase
      .from("shop_order_items")
      .select("product_title, unit_price_cents, quantity")
      .eq("order_id", orderId);
    if (itemsError) throw itemsError;

    const appUrl =
      Deno.env.get("APP_URL")?.replace(/\/$/, "") || "https://diakspora-karanta-online.vercel.app";
    const form = new URLSearchParams({
      mode: "payment",
      success_url: `${appUrl}/boutique?commande=confirmee&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/boutique?commande=annulee`,
      customer_email: email,
      "shipping_address_collection[allowed_countries][0]": "FR",
      "phone_number_collection[enabled]": "true",
      "metadata[order_id]": orderId,
      "metadata[order_number]": String(order.order_number),
      "payment_intent_data[metadata][order_id]": orderId,
      "payment_intent_data[metadata][order_number]": String(order.order_number),
      locale: "fr",
      allow_promotion_codes: "true",
    });

    (orderItems ?? []).forEach((item, index) => {
      form.set(`line_items[${index}][price_data][currency]`, String(order.currency));
      form.set(`line_items[${index}][price_data][unit_amount]`, String(item.unit_price_cents));
      form.set(`line_items[${index}][price_data][product_data][name]`, item.product_title);
      form.set(`line_items[${index}][quantity]`, String(item.quantity));
    });
    if (Number(order.shipping_cents) > 0) {
      const index = orderItems?.length ?? 0;
      form.set(`line_items[${index}][price_data][currency]`, String(order.currency));
      form.set(`line_items[${index}][price_data][unit_amount]`, String(order.shipping_cents));
      form.set(`line_items[${index}][price_data][product_data][name]`, "Livraison en France");
      form.set(`line_items[${index}][quantity]`, "1");
    }

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${required("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const stripeSession = (await stripeResponse.json()) as {
      id?: string;
      url?: string;
      error?: { message?: string };
    };
    if (!stripeResponse.ok || !stripeSession.id || !stripeSession.url) {
      throw new Error(stripeSession.error?.message || "Stripe n’a pas pu créer le paiement.");
    }

    const { error: updateError } = await supabase
      .from("shop_orders")
      .update({
        stripe_checkout_session_id: stripeSession.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (updateError) throw updateError;

    return json({ url: stripeSession.url, orderNumber: order.order_number });
  } catch (error) {
    if (orderId)
      await supabase.rpc("release_shop_order", { p_order_id: orderId, p_status: "cancelled" });
    const message = error instanceof Error ? error.message : "Impossible de préparer le paiement.";
    return json({ error: message }, 400);
  }
});
