import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  BookOpen,
  Boxes,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  Package,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  archiveShopProduct,
  formatPrice,
  loadShopAdmin,
  saveShopProduct,
  saveShopSettings,
  slugify,
  updateOrderFulfillment,
  type ShopOrder,
  type ShopOrderItem,
  type ShopProduct,
} from "@/features/shop/shop-data";

type Props = { organizationId: string; userId: string };

const orderLabels: Record<string, string> = {
  awaiting_payment: "Paiement en attente",
  paid: "Payée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  expired: "Expirée",
  refunded: "Remboursée",
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="flex min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/25"
    />
  );
}

function productDefaults(product?: ShopProduct | null) {
  return {
    title: product?.title ?? "",
    subtitle: product?.subtitle ?? "",
    author: product?.author ?? "",
    sku: product?.sku ?? "",
    description: product?.description ?? "",
    coverUrl: product?.cover_url ?? "",
    price: product ? String(product.price_cents / 100) : "",
    comparePrice: product?.compare_at_price_cents
      ? String(product.compare_at_price_cents / 100)
      : "",
    stock: String(product?.stock_quantity ?? 0),
    format: product?.format ?? "paperback",
    status: product?.status ?? "draft",
    featured: product?.featured ?? false,
    trackInventory: product?.track_inventory ?? true,
  };
}

export function ShopAdmin({ organizationId, userId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["shop-admin", organizationId];
  const query = useQuery({ queryKey, queryFn: () => loadShopAdmin(organizationId) });
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<(ShopOrder & { items: ShopOrderItem[] }) | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const productMutation = useMutation({
    mutationFn: saveShopProduct,
    onSuccess: () => {
      refresh();
      setProductOpen(false);
      setEditingProduct(null);
      toast.success("Livre enregistré.");
    },
    onError: (error) => toast.error(error.message),
  });
  const settingsMutation = useMutation({
    mutationFn: (input: Parameters<typeof saveShopSettings>[1]) =>
      saveShopSettings(query.data!.settings.id, input),
    onSuccess: () => {
      refresh();
      toast.success("Réglages de la boutique enregistrés.");
    },
    onError: (error) => toast.error(error.message),
  });
  const archiveMutation = useMutation({
    mutationFn: archiveShopProduct,
    onSuccess: () => {
      refresh();
      toast.success("Livre archivé.");
    },
    onError: (error) => toast.error(error.message),
  });
  const orderMutation = useMutation({
    mutationFn: updateOrderFulfillment,
    onSuccess: () => {
      refresh();
      setOrderOpen(false);
      setEditingOrder(null);
      toast.success("Commande mise à jour.");
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data?.products ?? []).filter(
      (product) =>
        !needle ||
        [product.title, product.author, product.sku].some((value) =>
          value?.toLowerCase().includes(needle),
        ),
    );
  }, [query.data?.products, search]);

  function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.data) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const status = String(form.get("status") ?? "draft");
    const data = {
      ...(editingProduct ? { id: editingProduct.id } : {}),
      organization_id: organizationId,
      shop_id: query.data.settings.id,
      created_by: editingProduct?.created_by ?? userId,
      title,
      slug: editingProduct?.slug ?? `${slugify(title)}-${Date.now().toString(36)}`,
      subtitle: String(form.get("subtitle") ?? "").trim() || null,
      author: String(form.get("author") ?? "").trim() || null,
      sku: String(form.get("sku") ?? "").trim() || null,
      description: String(form.get("description") ?? "").trim() || null,
      cover_url: String(form.get("coverUrl") ?? "").trim() || null,
      price_cents: Math.round(Number(form.get("price")) * 100),
      compare_at_price_cents: form.get("comparePrice")
        ? Math.round(Number(form.get("comparePrice")) * 100)
        : null,
      stock_quantity: Number(form.get("stock")),
      format: String(form.get("format") ?? "paperback"),
      status,
      featured: form.get("featured") === "on",
      track_inventory: form.get("trackInventory") === "on",
      published_at: editingProduct?.published_at,
    };
    productMutation.mutate(data);
  }

  if (query.isLoading)
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  if (query.isError || !query.data)
    return (
      <div className="rounded-2xl border border-dashed p-10 text-center">
        <ShoppingBag className="mx-auto size-8 text-primary" />
        <p className="mt-3 font-semibold">Impossible de charger la boutique.</p>
        <p className="mt-1 text-sm text-muted-foreground">{query.error?.message}</p>
      </div>
    );

  const { settings, products, orders } = query.data;
  const paidRevenue = orders
    .filter(
      (order) => !["awaiting_payment", "cancelled", "expired", "refunded"].includes(order.status),
    )
    .reduce((sum, order) => sum + order.total_cents, 0);
  const lowStock = products.filter(
    (product) =>
      product.track_inventory &&
      product.stock_quantity <= product.low_stock_threshold &&
      product.status !== "archived",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Librairie</h2>
          <p className="text-sm text-muted-foreground">
            Catalogue, stocks, commandes et livraison depuis un seul espace.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/boutique" target="_blank" rel="noreferrer">
              Voir la boutique <ExternalLink className="size-4" />
            </a>
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(null);
              setProductOpen(true);
            }}
          >
            <Plus className="size-4" /> Ajouter un livre
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: <BookOpen />,
            label: "Livres publiés",
            value: products.filter((p) => p.status === "published").length,
          },
          { icon: <ShoppingBag />, label: "Commandes", value: orders.length },
          { icon: <CreditCard />, label: "Chiffre d’affaires", value: formatPrice(paidRevenue) },
          { icon: <Boxes />, label: "Stocks faibles", value: lowStock },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/70">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                {stat.icon}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xl font-bold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="catalogue">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1 sm:w-fit">
          <TabsTrigger value="catalogue" className="min-h-11 rounded-xl">
            <BookOpen className="size-4" /> Catalogue
          </TabsTrigger>
          <TabsTrigger value="orders" className="min-h-11 rounded-xl">
            <Package className="size-4" /> Commandes
          </TabsTrigger>
          <TabsTrigger value="settings" className="min-h-11 rounded-xl">
            <Settings2 className="size-4" /> Réglages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="mt-5 space-y-4">
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un titre, un auteur ou un SKU"
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="border-border/70">
                <CardContent className="flex gap-4 p-4">
                  <div className="grid h-28 w-20 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {product.cover_url ? (
                      <img src={product.cover_url} alt="" className="size-full object-cover" />
                    ) : (
                      <BookOpen className="size-7 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="line-clamp-2 font-serif text-lg font-semibold leading-tight">
                          {product.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.author || "Auteur non renseigné"}
                        </p>
                      </div>
                      <Badge variant={product.status === "published" ? "secondary" : "outline"}>
                        {product.status === "published"
                          ? "Publié"
                          : product.status === "draft"
                            ? "Brouillon"
                            : "Archivé"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                      <strong className="text-primary">{formatPrice(product.price_cents)}</strong>
                      <span
                        className={
                          product.stock_quantity <= product.low_stock_threshold
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground"
                        }
                      >
                        {product.track_inventory
                          ? `${product.stock_quantity} en stock`
                          : "Stock illimité"}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingProduct(product);
                          setProductOpen(true);
                        }}
                      >
                        <Pencil className="size-3" /> Modifier
                      </Button>
                      {product.status !== "archived" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => archiveMutation.mutate(product.id)}
                          disabled={archiveMutation.isPending}
                        >
                          <Archive className="size-3" /> Archiver
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {!filteredProducts.length && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <BookOpen className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-semibold">Aucun livre dans le catalogue</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajoutez un premier ouvrage, son prix, sa couverture et son stock.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-5 space-y-3">
          {orders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => {
                setEditingOrder(order);
                setOrderOpen(true);
              }}
              className="flex w-full flex-col gap-3 rounded-2xl border bg-card p-4 text-left transition hover:border-primary/30 sm:flex-row sm:items-center"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <Package className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{order.order_number}</p>
                  <Badge
                    variant={
                      order.status === "paid" || order.status === "delivered"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {orderLabels[order.status] ?? order.status}
                  </Badge>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {order.customer_name} · {order.customer_email}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="font-bold text-primary">
                  {formatPrice(order.total_cents, order.currency)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </button>
          ))}
          {!orders.length && (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Package className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-semibold">Aucune commande</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Les nouvelles commandes apparaîtront ici après le paiement.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings" className="mt-5">
          <Card className="max-w-2xl border-border/70">
            <CardContent className="p-5 sm:p-6">
              <form
                className="grid gap-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  settingsMutation.mutate({
                    name: String(form.get("name")),
                    description: String(form.get("description")) || null,
                    flat_shipping_cents: Math.round(Number(form.get("shipping")) * 100),
                    free_shipping_threshold_cents: form.get("freeShipping")
                      ? Math.round(Number(form.get("freeShipping")) * 100)
                      : null,
                    payment_enabled: form.get("paymentEnabled") === "on",
                  });
                }}
              >
                <Field label="Nom de la boutique" htmlFor="shop-settings-name">
                  <Input
                    id="shop-settings-name"
                    name="name"
                    defaultValue={settings.name}
                    required
                  />
                </Field>
                <Field label="Description" htmlFor="shop-settings-description">
                  <Textarea
                    id="shop-settings-description"
                    name="description"
                    defaultValue={settings.description ?? ""}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Livraison France (€)" htmlFor="shop-settings-shipping">
                    <Input
                      id="shop-settings-shipping"
                      name="shipping"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={settings.flat_shipping_cents / 100}
                      required
                    />
                  </Field>
                  <Field label="Livraison offerte dès (€)" htmlFor="shop-settings-free">
                    <Input
                      id="shop-settings-free"
                      name="freeShipping"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        settings.free_shipping_threshold_cents
                          ? settings.free_shipping_threshold_cents / 100
                          : ""
                      }
                    />
                  </Field>
                </div>
                <div className="flex items-start justify-between gap-4 rounded-2xl border p-4">
                  <div>
                    <Label htmlFor="paymentEnabled">Paiement Stripe</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Activez seulement après avoir ajouté les deux secrets Stripe et le webhook.
                    </p>
                  </div>
                  <Switch
                    id="paymentEnabled"
                    name="paymentEnabled"
                    defaultChecked={settings.payment_enabled}
                  />
                </div>
                <Button className="h-11 rounded-xl sm:w-fit" disabled={settingsMutation.isPending}>
                  {settingsMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}{" "}
                  Enregistrer les réglages
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={productOpen}
        onOpenChange={(open) => {
          setProductOpen(open);
          if (!open) setEditingProduct(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">
              {editingProduct ? "Modifier le livre" : "Ajouter un livre"}
            </DialogTitle>
            <DialogDescription>
              Les champs prix et stock sont utilisés directement lors du paiement.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            key={editingProduct?.id ?? "new"}
            product={editingProduct}
            onSubmit={submitProduct}
            pending={productMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={orderOpen}
        onOpenChange={(open) => {
          setOrderOpen(open);
          if (!open) setEditingOrder(null);
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl">
          {editingOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  Commande {editingOrder.order_number}
                </DialogTitle>
                <DialogDescription>
                  {editingOrder.customer_name} · {editingOrder.customer_email}
                </DialogDescription>
              </DialogHeader>
              <form
                className="grid gap-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  orderMutation.mutate({
                    orderId: editingOrder.id,
                    status: String(form.get("status")),
                    trackingReference: String(form.get("tracking") ?? ""),
                    internalNotes: String(form.get("notes") ?? ""),
                  });
                }}
              >
                <Field label="Statut" htmlFor="order-status">
                  <NativeSelect id="order-status" name="status" defaultValue={editingOrder.status}>
                    {["paid", "preparing", "shipped", "delivered", "cancelled", "refunded"].map(
                      (status) => (
                        <option key={status} value={status}>
                          {orderLabels[status]}
                        </option>
                      ),
                    )}
                  </NativeSelect>
                </Field>
                <Field label="Référence de suivi" htmlFor="order-tracking">
                  <Input
                    id="order-tracking"
                    name="tracking"
                    defaultValue={editingOrder.tracking_reference ?? ""}
                    placeholder="Ex. 6A12345678901"
                  />
                </Field>
                <Field label="Note interne" htmlFor="order-notes">
                  <Textarea
                    id="order-notes"
                    name="notes"
                    defaultValue={editingOrder.internal_notes ?? ""}
                  />
                </Field>
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-sm font-semibold">
                    Total : {formatPrice(editingOrder.total_cents, editingOrder.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {editingOrder.customer_phone || "Téléphone non renseigné"}
                  </p>
                </div>
                <div className="rounded-2xl border p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Articles
                  </p>
                  <div className="mt-3 divide-y">
                    {editingOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                        <span>
                          {item.product_title} × {item.quantity}
                        </span>
                        <span className="shrink-0 font-semibold">
                          {formatPrice(item.line_total_cents, editingOrder.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={orderMutation.isPending}>
                    <Truck className="size-4" /> Mettre à jour
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductForm({
  product,
  onSubmit,
  pending,
}: {
  product: ShopProduct | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  pending: boolean;
}) {
  const values = productDefaults(product);
  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Titre" htmlFor="product-title">
          <Input
            id="product-title"
            name="title"
            defaultValue={values.title}
            required
            minLength={2}
          />
        </Field>
        <Field label="Auteur" htmlFor="product-author">
          <Input id="product-author" name="author" defaultValue={values.author} />
        </Field>
      </div>
      <Field label="Sous-titre" htmlFor="product-subtitle">
        <Input id="product-subtitle" name="subtitle" defaultValue={values.subtitle} />
      </Field>
      <Field label="Description" htmlFor="product-description">
        <Textarea
          id="product-description"
          name="description"
          defaultValue={values.description}
          rows={4}
        />
      </Field>
      <Field label="URL de la couverture" htmlFor="product-cover">
        <Input
          id="product-cover"
          name="coverUrl"
          type="url"
          defaultValue={values.coverUrl}
          placeholder="https://…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Prix (€)" htmlFor="product-price">
          <Input
            id="product-price"
            name="price"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={values.price}
            required
          />
        </Field>
        <Field label="Ancien prix (€)" htmlFor="product-compare">
          <Input
            id="product-compare"
            name="comparePrice"
            type="number"
            min="0"
            step="0.01"
            defaultValue={values.comparePrice}
          />
        </Field>
        <Field label="Stock" htmlFor="product-stock">
          <Input
            id="product-stock"
            name="stock"
            type="number"
            min="0"
            defaultValue={values.stock}
            required
          />
        </Field>
        <Field label="SKU" htmlFor="product-sku">
          <Input id="product-sku" name="sku" defaultValue={values.sku} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Format" htmlFor="product-format">
          <NativeSelect id="product-format" name="format" defaultValue={values.format}>
            <option value="paperback">Broché</option>
            <option value="hardcover">Relié</option>
          </NativeSelect>
        </Field>
        <Field label="Publication" htmlFor="product-status">
          <NativeSelect id="product-status" name="status" defaultValue={values.status}>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="archived">Archivé</option>
          </NativeSelect>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={values.featured}
            className="size-4 accent-[color:var(--deep-green)]"
          />{" "}
          Mettre en avant
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl border p-3 text-sm">
          <input
            type="checkbox"
            name="trackInventory"
            defaultChecked={values.trackInventory}
            className="size-4 accent-[color:var(--deep-green)]"
          />{" "}
          Suivre le stock
        </label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending && <LoaderCircle className="size-4 animate-spin" />}{" "}
          {product ? "Enregistrer" : "Créer le livre"}
        </Button>
      </DialogFooter>
    </form>
  );
}
