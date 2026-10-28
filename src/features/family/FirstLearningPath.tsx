import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// This is a catalogue choice, never an enrollment or a premium entitlement.
export function FirstLearningPath({
  organizationId,
  childName,
}: {
  organizationId: string;
  childName: string;
}) {
  const [level, setLevel] = useState("");
  const [bookId, setBookId] = useState("");
  const query = useQuery({
    queryKey: ["family-start-books", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, level")
        .eq("organization_id", organizationId)
        .eq("status", "published")
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    retry: 1,
    staleTime: 60_000,
  });
  const books = query.data ?? [];
  const levels = [...new Set(books.map((book) => book.level).filter(Boolean))];
  const available = books.filter((book) => !level || book.level === level);
  const selected = available.find((book) => book.id === bookId);

  return (
    <section
      className="mt-6 rounded-2xl border bg-background p-5"
      aria-labelledby="first-path-title"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[color:var(--gold-dark)]">
        3 · Choisir un point de départ
      </p>
      <h3 id="first-path-title" className="mt-2 font-serif text-2xl">
        Un premier livre pour {childName}
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Choisissez selon ses connaissances. Vous pourrez changer de parcours à tout moment.
      </p>
      {query.isPending ? (
        <p role="status" className="mt-4 text-sm">
          Chargement des livres publiés…
        </p>
      ) : query.isError ? (
        <div role="alert" className="mt-4 text-sm">
          <p>Les livres ne sont pas disponibles pour le moment.</p>
          <button type="button" onClick={() => query.refetch()} className="mt-2 min-h-12 underline">
            Réessayer les livres
          </button>
        </div>
      ) : !books.length ? (
        <p className="mt-4 text-sm text-muted-foreground">
          L’équipe prépare les premiers livres. Vous pouvez déjà explorer les classes ci-dessous.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {levels.length > 0 && (
            <label className="grid gap-2 text-sm font-semibold">
              Niveau du parcours
              <select
                value={level}
                onChange={(event) => {
                  setLevel(event.target.value);
                  setBookId("");
                }}
                className="min-h-12 w-full min-w-0 rounded-xl border bg-card px-3"
              >
                <option value="">Tous les niveaux</option>
                {levels.map((item) => (
                  <option key={item} value={item!}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          )}
          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold">Livre ou méthode</legend>
            {available.map((book) => (
              <label
                key={book.id}
                className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 has-checked:border-primary has-checked:bg-primary/5"
              >
                <input
                  type="radio"
                  name="first-book"
                  value={book.id}
                  checked={selected?.id === book.id}
                  onChange={() => setBookId(book.id)}
                  className="mt-1 size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0 break-words">
                  <span className="block font-semibold">{book.title}</span>
                  {book.description && (
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {book.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          {selected ? (
            <Link
              to="/apprendre/livre/$bookId"
              params={{ bookId: selected.id }}
              className="inline-flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground"
            >
              <span>Découvrir le premier cours</span>
              <ArrowRight className="size-5 shrink-0" aria-hidden />
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="size-4 shrink-0" aria-hidden />
              Sélectionnez un livre pour découvrir ses séances.
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            Profil sélectionné : {childName}. Les accès aux cours et aux contenus premium sont
            vérifiés à l’ouverture de chaque séance.
          </p>
        </div>
      )}
    </section>
  );
}
