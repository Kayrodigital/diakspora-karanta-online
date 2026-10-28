import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Headphones, ArrowRight } from "lucide-react";
import { LearningShell } from "@/features/learning/LearningUi";
import { loadPublicTeacherCatalog } from "@/features/majliss/majliss-data";

// Explicit publication filters also protect previews viewed by privileged users.
function publishedTeachers(catalog: Awaited<ReturnType<typeof loadPublicTeacherCatalog>>) {
  return catalog.teachers.filter((teacher) => teacher.status === "published");
}

export function PublicTeachers({ teacherSlug }: { teacherSlug?: string }) {
  const query = useQuery({
    queryKey: ["public-teacher-directory"],
    retry: 1,
    queryFn: loadPublicTeacherCatalog,
    staleTime: 60_000,
  });
  const teachers = query.data ? publishedTeachers(query.data) : [];
  const teacher = teacherSlug ? teachers.find((item) => item.slug === teacherSlug) : undefined;
  const recordings =
    teacher && query.data
      ? query.data.recordings.filter(
          (item) =>
            item.teacher_id === teacher.id &&
            item.status === "published" &&
            item.review_status === "approved",
        )
      : [];
  const languages = [...new Set(recordings.map((item) => item.language).filter(Boolean))];
  return (
    <LearningShell active="Professeurs">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <nav aria-label="Fil d’Ariane" className="mb-6 text-sm text-muted-foreground">
          <Link to="/">Accueil</Link> / <Link to="/enseignants">Professeurs</Link>
          {teacher && <> / {teacher.display_name}</>}
        </nav>
        {query.isPending ? (
          <p role="status">Chargement des professeurs…</p>
        ) : query.isError ? (
          <div role="alert" className="rounded-2xl border bg-card p-6">
            <h1 className="font-serif text-2xl">Les présentations sont indisponibles</h1>
            <p className="mt-2 text-muted-foreground">Vérifiez votre connexion et réessayez.</p>
            <button
              className="mt-4 min-h-12 rounded-xl bg-primary px-5 text-primary-foreground"
              onClick={() => query.refetch()}
            >
              Réessayer
            </button>
          </div>
        ) : teacherSlug ? (
          teacher ? (
            <>
              <header className="flex flex-col gap-6 rounded-3xl border bg-card p-6 sm:flex-row sm:p-8">
                {teacher.photo_url ? (
                  <img
                    src={teacher.photo_url}
                    alt={`Portrait de ${teacher.display_name}`}
                    width={160}
                    height={160}
                    className="size-32 rounded-2xl object-cover sm:size-40"
                  />
                ) : (
                  <span className="grid size-24 shrink-0 place-items-center rounded-2xl bg-primary/10">
                    <GraduationCap className="size-10 text-primary" aria-hidden />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Professeur · Présentation publique
                  </p>
                  <h1 className="mt-3 break-words font-serif text-3xl sm:text-4xl">
                    {teacher.display_name}
                  </h1>
                  <p className="mt-4 whitespace-pre-line leading-7 text-muted-foreground">
                    {teacher.biography ||
                      "La biographie de ce professeur n’est pas encore publiée."}
                  </p>
                </div>
              </header>
              {languages.length > 0 && (
                <p className="mt-5 text-sm text-muted-foreground">
                  Langues des enregistrements publiés : {languages.join(" · ")}
                </p>
              )}
              <section className="mt-10" aria-labelledby="teacher-teachings">
                <h2 id="teacher-teachings" className="font-serif text-2xl">
                  Ses enseignements Majliss
                </h2>
                {recordings.length ? (
                  <div className="mt-5 grid gap-3">
                    {recordings.map((recording) => (
                      <Link
                        key={recording.id}
                        to="/majliss/ecouter/$recordingId"
                        params={{ recordingId: recording.id }}
                        className="flex min-h-20 items-center gap-4 rounded-2xl border bg-card p-4"
                      >
                        <Headphones className="size-5 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0 flex-1 break-words">
                          <span className="block font-semibold">{recording.title}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {recording.access_tier === "premium"
                              ? "Accès premium"
                              : "Écoute gratuite"}
                          </span>
                        </span>
                        <ArrowRight className="size-4 shrink-0" aria-hidden />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-2xl border p-5 text-muted-foreground">
                    Aucun enseignement publié pour le moment.
                  </p>
                )}
              </section>
              <section className="mt-8 rounded-2xl bg-primary/5 p-6">
                <h2 className="font-serif text-2xl">Poursuivre votre apprentissage</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Consultez les parcours et les classes disponibles. Les formations, références et
                  cours de ce professeur seront présentés ici lorsqu’ils auront été documentés et
                  publiés par l’équipe.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    to="/apprendre"
                    className="inline-flex min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground"
                  >
                    Explorer les cours
                  </Link>
                  <Link
                    to="/parcours"
                    className="inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold"
                  >
                    Trouver une classe
                  </Link>
                </div>
              </section>
            </>
          ) : (
            <div className="rounded-2xl border p-8">
              <h1 className="font-serif text-3xl">Professeur introuvable</h1>
              <p className="mt-3 text-muted-foreground">Cette présentation n’est pas publiée.</p>
              <Link to="/enseignants" className="mt-4 inline-flex min-h-12 items-center underline">
                Voir les professeurs
              </Link>
            </div>
          )
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Rencontrer ceux qui transmettent
            </p>
            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Nos professeurs</h1>
            <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
              Découvrez leurs présentations et retrouvez leurs enseignements publiés.
            </p>
            {teachers.length ? (
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                {teachers.map((item) => (
                  <Link
                    key={item.id}
                    to="/enseignants/$teacherSlug"
                    params={{ teacherSlug: item.slug }}
                    className="group flex min-h-36 items-start gap-4 rounded-2xl border bg-card p-5 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {item.photo_url ? (
                      <img
                        src={item.photo_url}
                        alt=""
                        width={80}
                        height={80}
                        loading="lazy"
                        className="size-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <GraduationCap className="size-10 shrink-0 text-primary" aria-hidden />
                    )}
                    <div className="min-w-0">
                      <h2 className="break-words font-serif text-2xl group-hover:underline">
                        {item.display_name}
                      </h2>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {item.biography || "Découvrir ses enseignements"}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        Voir la présentation
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-8 rounded-2xl border bg-card p-6">
                Les présentations des professeurs seront disponibles après leur publication par
                l’équipe.
              </p>
            )}
          </>
        )}
      </div>
    </LearningShell>
  );
}
