import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { Check, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { rememberActiveProfile, type AccessibleProfile } from "@/lib/identity/profile-identity";
import type { OrganizationBrand } from "@/lib/auth/portal-access";

export function FamilyOnboarding({
  organization,
  ownProfileId,
  profiles,
  activeProfileId,
}: {
  organization: OrganizationBrand;
  ownProfileId: string;
  profiles: AccessibleProfile[];
  activeProfileId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const children = profiles.filter((profile) => profile.id !== ownProfileId);
  const flags = organization.feature_flags;
  const enabled = Boolean(
    flags &&
    typeof flags === "object" &&
    !Array.isArray(flags) &&
    flags.family_onboarding_v1 === true &&
    flags.profile_identity_v2 === true,
  );
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [created, setCreated] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      // The RPC checks the authenticated parent and organization on the server.
      // No client-provided parent ID, role, entitlement or Auth account for the child.
      const { data, error } = await supabase.rpc("create_my_child_profile", {
        p_organization_id: organization.id,
        p_name: name.trim(),
        p_request_id: requestId,
        p_guardian_consent: consent,
      });
      if (error) throw error;
      if (!data) throw new Error("Le profil n’a pas pu être confirmé. Réessayez.");
      return data;
    },
    onSuccess: async (profileId) => {
      rememberActiveProfile(organization.id, profileId);
      setCreated(true);
      setRequestId(crypto.randomUUID());
      setOpen(false);
      setName("");
      setConsent(false);
      await queryClient.invalidateQueries();
      await router.invalidate();
    },
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!mutation.isPending) mutation.mutate();
  }
  return (
    <section
      className="mt-8 rounded-3xl border border-border bg-card p-5 sm:p-7"
      aria-labelledby="family-start-title"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Les premiers pas en famille
      </p>
      <h2 id="family-start-title" className="mt-2 font-serif text-2xl">
        Un enfant, un parcours, à son rythme.
      </h2>
      <ol className="mt-5 grid gap-3 text-sm sm:grid-cols-3" aria-label="Votre parcours">
        {[
          ["Compte parent connecté", true],
          ["Ajouter un enfant", children.length > 0],
          ["Choisir un premier parcours", false],
        ].map(([label, done], i) => (
          <li key={String(label)} className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
              {done ? <Check className="size-4" aria-label="Terminé" /> : i + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {created && (
        <p role="status" className="mt-4 rounded-xl bg-primary/10 p-3 text-sm">
          Le profil de votre enfant est créé et sélectionné. Vous pouvez maintenant découvrir les
          parcours accessibles. Les classes et contenus premium restent soumis à autorisation.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-3" aria-label="Mes enfants">
        {children.map((child) => (
          <button
            type="button"
            key={child.id}
            aria-pressed={child.id === activeProfileId}
            className="min-h-12 rounded-xl border px-4 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary/10"
            onClick={async () => {
              rememberActiveProfile(organization.id, child.id);
              await queryClient.invalidateQueries();
              await router.invalidate();
            }}
          >
            {child.preferred_name || child.full_name || "Mon enfant"}
          </button>
        ))}
        {enabled && (
          <button
            type="button"
            aria-expanded={open}
            aria-controls="child-profile-form"
            disabled={mutation.isPending}
            onClick={() => {
              mutation.reset();
              setOpen(!open);
            }}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-4" />
            Ajouter un enfant
          </button>
        )}
      </div>
      {!enabled && (
        <p className="mt-4 text-sm text-muted-foreground">
          Pour rattacher un enfant à votre compte, contactez l’équipe pédagogique. Vos profils déjà
          rattachés restent disponibles.
        </p>
      )}
      {open && (
        <form
          id="child-profile-form"
          onSubmit={submit}
          className="mt-5 max-w-lg space-y-4 rounded-2xl bg-muted/40 p-4"
        >
          <label className="grid gap-2 text-sm font-semibold">
            Prénom ou nom d’usage de l’enfant
            <input
              autoFocus
              required
              minLength={2}
              maxLength={80}
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-h-12 rounded-xl border bg-background px-3"
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Pas d’adresse email ni de mot de passe pour votre enfant.
          </p>
          <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 size-5 shrink-0"
            />
            Je suis le parent ou responsable légal de cet enfant et j’autorise la création de son
            profil. Je reste responsable de l’activation et du suivi de ses parcours, notamment
            avant 15 ans.
          </label>
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message.includes("function")
                ? "L’ajout de profil n’est pas encore disponible. Contactez l’équipe pédagogique."
                : "Impossible d’ajouter cet enfant. Vos informations sont conservées ; réessayez ou contactez l’équipe pédagogique."}
            </p>
          )}
          <button
            type="submit"
            disabled={!name.trim() || !consent || mutation.isPending}
            className="min-h-12 rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {mutation.isPending ? "Création en cours…" : "Créer le profil de mon enfant"}
          </button>
        </form>
      )}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/apprendre"
          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-4 font-semibold"
        >
          Découvrir les livres et méthodes
          <ArrowRight className="size-4 shrink-0" />
        </Link>
        <Link
          to="/parcours"
          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-4 font-semibold"
        >
          Trouver une classe adaptée
          <ArrowRight className="size-4 shrink-0" />
        </Link>
      </div>
    </section>
  );
}
