import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ShopSettings = Tables<"shop_settings">;
export type ShopProduct = Tables<"shop_products">;
export type ShopOrder = Tables<"shop_orders">;
export type ShopOrderItem = Tables<"shop_order_items">;

export type ShopAdminData = {
  settings: ShopSettings;
  products: ShopProduct[];
  orders: Array<ShopOrder & { items: ShopOrderItem[] }>;
};

export type ShopProductInput = TablesInsert<"shop_products"> & { id?: string };

export async function loadPublicShop(slug = "diakspora") {
  const { data: settings, error: settingsError } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (!settings) return null;

  const { data: products, error: productsError } = await supabase
    .from("shop_products")
    .select("*")
    .eq("shop_id", settings.id)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("published_at", { ascending: false });
  if (productsError) throw productsError;
  return { settings, products: products ?? [] };
}

export async function loadShopAdmin(organizationId: string): Promise<ShopAdminData> {
  const { data: settings, error: settingsError } = await supabase
    .from("shop_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();
  if (settingsError) throw settingsError;

  const [productsResult, ordersResult, orderItemsResult] = await Promise.all([
    supabase
      .from("shop_products")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("shop_orders")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("shop_order_items").select("*").eq("organization_id", organizationId),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (orderItemsResult.error) throw orderItemsResult.error;

  return {
    settings,
    products: productsResult.data ?? [],
    orders: (ordersResult.data ?? []).map((order) => ({
      ...order,
      items: (orderItemsResult.data ?? []).filter((item) => item.order_id === order.id),
    })),
  };
}

export async function saveShopSettings(id: string, input: TablesUpdate<"shop_settings">) {
  const { error } = await supabase
    .from("shop_settings")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function saveShopProduct(input: ShopProductInput) {
  const now = new Date().toISOString();
  const productId = input.id;
  const payload = {
    ...input,
    published_at: input.status === "published" ? input.published_at || now : null,
    updated_at: now,
  };
  if (productId) {
    const { id, ...changes } = payload;
    const { error } = await supabase.from("shop_products").update(changes).eq("id", productId);
    if (error) throw error;
    return;
  }
  const { id: _id, ...insertPayload } = payload;
  const { error } = await supabase.from("shop_products").insert(insertPayload);
  if (error) throw error;
}

export async function archiveShopProduct(id: string) {
  const { error } = await supabase
    .from("shop_products")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updateOrderFulfillment(input: {
  orderId: string;
  status: string;
  trackingReference?: string;
  internalNotes?: string;
}) {
  const { error } = await supabase.rpc("update_shop_order_fulfillment", {
    p_order_id: input.orderId,
    p_status: input.status,
    p_tracking_reference: input.trackingReference,
    p_internal_notes: input.internalNotes,
  });
  if (error) throw error;
}

export async function createCheckout(input: {
  customer: { email: string; name: string; phone?: string };
  items: Array<{ productId: string; quantity: number }>;
}) {
  const { data, error } = await supabase.functions.invoke("create-shop-checkout", {
    body: { shopSlug: "diakspora", ...input },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Le lien de paiement n’a pas été généré.");
  return data as { url: string; orderNumber: string };
}

export function formatPrice(cents: number, currency = "eur") {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
