import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Minus,
  PackageCheck,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createCheckout,
  formatPrice,
  loadPublicShop,
  type ShopProduct,
} from "@/features/shop/shop-data";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Librairie — Diakspora Karanta" },
      {
        name: "description",
        content: "Achetez les livres étudiés dans les cours Diakspora Karanta.",
      },
    ],
  }),
  component: ShopPage,
});

type Cart = Record<string, number>;
const storageKey = "karanta-shop-cart";

function ShopPage() {
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selected, setSelected] = useState<ShopProduct | null>(null);
  const [paying, setPaying] = useState(false);
  const query = useQuery({
    queryKey: ["public-shop", "diakspora"],
    queryFn: () => loadPublicShop(),
  });

  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(storageKey) || "{}") as Cart);
    } catch {
      localStorage.removeItem(storageKey);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("commande") === "confirmee") {
      localStorage.removeItem(storageKey);
      setCart({});
      toast.success("Paiement confirmé. Merci pour votre commande !");
    }
    if (params.get("commande") === "annulee")
      toast.info("Paiement annulé. Votre panier est conservé.");
  }, []);

  const shop = query.data;
  const lines = useMemo(
    () =>
      (shop?.products ?? [])
        .filter((product) => cart[product.id])
        .map((product) => ({ product, quantity: cart[product.id] })),
    [cart, shop?.products],
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.product.price_cents * line.quantity, 0);
  const shipping = shop
    ? shop.settings.free_shipping_threshold_cents &&
      subtotal >= shop.settings.free_shipping_threshold_cents
      ? 0
      : shop.settings.flat_shipping_cents
    : 0;

  function saveCart(next: Cart) {
    setCart(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function change(product: ShopProduct, delta: number) {
    const max = product.track_inventory ? product.stock_quantity : 20;
    const nextQuantity = Math.max(0, Math.min(max, (cart[product.id] ?? 0) + delta));
    const next = { ...cart };
    if (nextQuantity) next[product.id] = nextQuantity;
    else delete next[product.id];
    saveCart(next);
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!shop?.settings.payment_enabled) {
      toast.info("Le paiement Stripe sera disponible très prochainement.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setPaying(true);
    try {
      const result = await createCheckout({
        customer: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
        },
        items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
      });
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer le paiement.");
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-[color:var(--cream)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Karanta</span>
          </Link>
          <div className="text-center">
            <p className="font-serif text-xl font-semibold text-[color:var(--deep-green)]">
              Diakspora
            </p>
            <p className="-mt-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[color:var(--gold-dark)]">
              Librairie
            </p>
          </div>
          <Button
            variant="outline"
            className="relative min-h-11 rounded-xl"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-4" />
            <span className="hidden sm:inline">Panier</span>
            {itemCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[color:var(--deep-green)] text-[color:var(--cream)]">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-[color:var(--gold)]/15 blur-2xl" />
          <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-20">
            <Badge className="rounded-full bg-white/10 text-[color:var(--gold-soft)] hover:bg-white/10">
              Livraison en France
            </Badge>
            <h1 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight sm:text-6xl">
              Les livres qui accompagnent votre apprentissage
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              Retrouvez les ouvrages étudiés en cours, sélectionnés par les professeurs de Diakspora
              Karanta.
            </p>
            <div className="mt-8 flex flex-wrap gap-5 text-xs text-white/75">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[color:var(--gold)]" /> Paiement sécurisé
              </span>
              <span className="flex items-center gap-2">
                <Truck className="size-4 text-[color:var(--gold)]" /> Expédition suivie
              </span>
              <span className="flex items-center gap-2">
                <PackageCheck className="size-4 text-[color:var(--gold)]" /> Stock réel
              </span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--gold-dark)]">
                Notre sélection
              </p>
              <h2 className="mt-1 font-serif text-3xl font-semibold">Les ouvrages disponibles</h2>
            </div>
            {shop && (
              <span className="text-sm text-muted-foreground">
                {shop.products.length} livre{shop.products.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {query.isLoading && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-96 rounded-3xl" />
              ))}
            </div>
          )}
          {query.isError && (
            <div className="rounded-3xl border border-dashed p-10 text-center">
              <BookOpen className="mx-auto size-9 text-primary" />
              <p className="mt-3 font-semibold">La librairie est momentanément indisponible.</p>
            </div>
          )}
          {shop && shop.products.length === 0 && (
            <div className="rounded-3xl border border-dashed border-[color:var(--gold)]/40 bg-card p-10 text-center sm:p-16">
              <BookOpen className="mx-auto size-10 text-[color:var(--deep-green)]" />
              <h3 className="mt-4 font-serif text-2xl font-semibold">
                Les premiers livres arrivent
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                L’équipe Diakspora prépare le catalogue. Revenez bientôt pour découvrir les ouvrages
                des cours.
              </p>
            </div>
          )}
          {shop && shop.products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {shop.products.map((product) => {
                const soldOut = product.track_inventory && product.stock_quantity === 0;
                return (
                  <article
                    key={product.id}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[var(--shadow-card)]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(product)}
                      className="relative aspect-[4/5] overflow-hidden bg-[color:var(--cream-2)] text-left"
                    >
                      {product.cover_url ? (
                        <img
                          src={product.cover_url}
                          alt={`Couverture de ${product.title}`}
                          className="size-full object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid size-full place-items-center bg-[linear-gradient(145deg,var(--deep-green),#123a1f)] text-[color:var(--gold)]">
                          <BookOpen className="size-12" />
                        </div>
                      )}
                      {product.featured && (
                        <Badge className="absolute left-3 top-3 rounded-full bg-[color:var(--gold)] text-[color:var(--anthracite)]">
                          Sélection
                        </Badge>
                      )}
                    </button>
                    <div className="flex flex-1 flex-col p-3 sm:p-4">
                      {product.author && (
                        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {product.author}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelected(product)}
                        className="mt-1 text-left"
                      >
                        <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-tight sm:text-xl">
                          {product.title}
                        </h3>
                      </button>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                        <div>
                          <p className="font-bold text-[color:var(--deep-green)]">
                            {formatPrice(product.price_cents)}
                          </p>
                          {product.compare_at_price_cents && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatPrice(product.compare_at_price_cents)}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          className="rounded-xl"
                          disabled={soldOut}
                          aria-label={`Ajouter ${product.title} au panier`}
                          onClick={() => change(product, 1)}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </div>
                      <p
                        className={`mt-2 text-[10px] font-medium ${soldOut ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {soldOut
                          ? "Rupture de stock"
                          : product.stock_quantity <= product.low_stock_threshold &&
                              product.track_inventory
                            ? `Plus que ${product.stock_quantity} en stock`
                            : "En stock"}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader className="border-b p-5 text-left">
            <SheetTitle className="font-serif text-2xl">Votre panier</SheetTitle>
            <SheetDescription>
              {itemCount
                ? `${itemCount} article${itemCount > 1 ? "s" : ""}`
                : "Votre panier est vide."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {lines.map(({ product, quantity }) => (
              <div key={product.id} className="flex gap-3 rounded-2xl border p-3">
                <div className="grid h-24 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                  {product.cover_url ? (
                    <img src={product.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <BookOpen className="size-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-serif font-semibold leading-tight">
                    {product.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {formatPrice(product.price_cents)}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => change(product, -1)}
                    >
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-5 text-center text-sm">{quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 rounded-lg"
                      onClick={() => change(product, 1)}
                    >
                      <Plus className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-auto size-8 text-destructive"
                      onClick={() =>
                        saveCart(
                          Object.fromEntries(
                            Object.entries(cart).filter(([id]) => id !== product.id),
                          ),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {lines.length > 0 && (
            <div className="space-y-3 border-t bg-background p-5">
              <div className="flex justify-between text-sm">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Livraison</span>
                <span>{shipping ? formatPrice(shipping) : "Offerte"}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>
              <Button
                className="h-12 w-full rounded-xl"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                Passer la commande
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl">Finaliser la commande</DialogTitle>
            <DialogDescription>
              Vos coordonnées de livraison seront confirmées sur la page de paiement sécurisée
              Stripe.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={checkout} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="shop-name">Nom complet</Label>
              <Input id="shop-name" name="name" required minLength={2} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-email">Adresse e-mail</Label>
              <Input id="shop-email" name="email" type="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shop-phone">Téléphone</Label>
              <Input id="shop-phone" name="phone" type="tel" />
            </div>
            <div className="rounded-2xl bg-muted/60 p-4 text-sm">
              <div className="flex justify-between font-semibold">
                <span>Total estimé</span>
                <span>{formatPrice(subtotal + shipping)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Livraison en France uniquement.</p>
            </div>
            {!shop?.settings.payment_enabled && (
              <p className="rounded-xl border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 p-3 text-xs">
                Le catalogue est prêt. L’administrateur doit encore activer la connexion Stripe pour
                accepter les paiements.
              </p>
            )}
            <Button
              type="submit"
              className="h-12 rounded-xl"
              disabled={paying || !shop?.settings.payment_enabled}
            >
              {paying
                ? "Redirection…"
                : shop?.settings.payment_enabled
                  ? "Payer avec Stripe"
                  : "Paiement bientôt disponible"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif text-3xl">{selected.title}</DialogTitle>
                <DialogDescription>
                  {selected.author || "Éditions Diakspora"} ·{" "}
                  {selected.format === "hardcover" ? "Relié" : "Broché"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
                <div className="grid aspect-[4/5] place-items-center overflow-hidden rounded-2xl bg-muted">
                  {selected.cover_url ? (
                    <img src={selected.cover_url} alt="" className="size-full object-cover" />
                  ) : (
                    <BookOpen className="size-10 text-primary" />
                  )}
                </div>
                <div>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {selected.description ||
                      "Cet ouvrage accompagne les enseignements proposés sur Karanta."}
                  </p>
                  <p className="mt-4 text-xl font-bold text-primary">
                    {formatPrice(selected.price_cents)}
                  </p>
                  <Button
                    className="mt-4 w-full rounded-xl"
                    disabled={selected.track_inventory && selected.stock_quantity === 0}
                    onClick={() => {
                      change(selected, 1);
                      setSelected(null);
                      setCartOpen(true);
                    }}
                  >
                    <ShoppingBag className="size-4" /> Ajouter au panier
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get(
        "commande",
      ) === "confirmee" && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-xl">
          <CheckCircle2 className="size-4" /> Commande confirmée
        </div>
      )}
    </div>
  );
}
