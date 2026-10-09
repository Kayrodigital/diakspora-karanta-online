/* eslint-disable react-refresh/only-export-components */
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Headphones,
  MapPin,
  Mic2,
  Play,
  Radio,
  UserRound,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { EmptyState, LearningShell, PageHeader } from "@/features/learning/LearningUi";
import {
  loadMajlissCatalog,
  saveMediaProgress,
  type MajlissCatalog,
  type MajlissRecording,
} from "./majliss-data";

export const majlissQueryKey = ["public-majliss-catalog", "diakspora"] as const;

export function useMajlissCatalog() {
  return useQuery({
    queryKey: majlissQueryKey,
    queryFn: loadMajlissCatalog,
    staleTime: 60_000,
  });
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "Durée non renseignée";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function MajlissBreadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="mx-auto max-w-7xl overflow-x-auto px-4 pt-6 sm:px-8 lg:px-12"
    >
      <ol className="flex min-w-max items-center gap-2 text-sm text-[#6A6F68]">
        <li>
          <Link to="/majliss" className="rounded px-1 py-2 font-semibold hover:text-[#173F2B]">
            Majliss
          </Link>
        </li>
        {items.map((item) => (
          <li key={`${item.label}-${item.href ?? "current"}`} className="flex items-center gap-2">
            <ChevronRight className="size-4 text-[#B8AC96]" aria-hidden="true" />
            {item.href ? (
              <a href={item.href} className="rounded px-1 py-2 font-semibold hover:text-[#173F2B]">
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="max-w-60 truncate px-1 py-2">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function MajlissState({ children }: { children: (catalog: MajlissCatalog) => ReactNode }) {
  const query = useMajlissCatalog();
  if (query.isPending)
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
        <div className="h-8 w-48 animate-pulse rounded-full bg-[#E8DECC]" />
        <div className="mt-5 h-44 animate-pulse rounded-3xl bg-[#EFE7D8]" />
      </div>
    );
  if (query.isError)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <EmptyState
          title="Le Majliss ne peut pas être chargé"
          description="Réessayez dans quelques instants."
        />
      </div>
    );
  if (!query.data.enabled)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <EmptyState
          title="Le Majliss arrive bientôt"
          description="Le premier village est en cours de préparation."
        />
      </div>
    );
  return children(query.data);
}

type PlayerContextValue = {
  current: MajlissRecording | null;
  play: (recording: MajlissRecording, catalog: MajlissCatalog) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function MajlissLayout({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<MajlissRecording | null>(null);
  const [catalog, setCatalog] = useState<MajlissCatalog | null>(null);
  const play = useCallback((recording: MajlissRecording, nextCatalog: MajlissCatalog) => {
    setCurrent(recording);
    setCatalog(nextCatalog);
  }, []);
  return (
    <PlayerContext.Provider value={{ current, play }}>
      <LearningShell active="Majliss">
        {children}
        {current && catalog ? (
          <MajlissPlayer recording={current} catalog={catalog} onSelect={setCurrent} />
        ) : null}
      </LearningShell>
    </PlayerContext.Provider>
  );
}

export function useMajlissPlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("Majliss player must be used inside MajlissLayout.");
  return context;
}

function MajlissPlayer({
  recording,
  catalog,
  onSelect,
}: {
  recording: MajlissRecording;
  catalog: MajlissCatalog;
  onSelect: (recording: MajlissRecording) => void;
}) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const lastSavedRef = useRef(0);
  const queryClient = useQueryClient();
  const ordered = useMemo(
    () =>
      catalog.recordings
        .filter((item) => item.teacher_id === recording.teacher_id)
        .slice()
        .sort((a, b) => a.order_index - b.order_index),
    [catalog.recordings, recording.teacher_id],
  );
  const index = ordered.findIndex((item) => item.id === recording.id);
  const previous = index > 0 ? ordered[index - 1] : null;
  const next = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;
  const progress = catalog.progress.find((item) => item.recording_id === recording.id);

  const persist = useCallback(
    async (completed = false) => {
      const media = mediaRef.current;
      if (!media || !catalog.activeProfileId || !catalog.userId) return;
      await saveMediaProgress({
        organizationId: catalog.organizationId,
        profileId: catalog.activeProfileId,
        recordingId: recording.id,
        actorUserId: catalog.userId,
        positionSeconds: media.currentTime,
        durationSeconds: Number.isFinite(media.duration)
          ? media.duration
          : recording.duration_seconds,
        completed,
      });
      await queryClient.invalidateQueries({ queryKey: majlissQueryKey });
    },
    [catalog, queryClient, recording.duration_seconds, recording.id],
  );

  const commonProps = {
    ref: (node: HTMLMediaElement | null) => {
      mediaRef.current = node;
    },
    controls: true,
    preload: "metadata" as const,
    className: "w-full",
    onLoadedMetadata: () => {
      if (mediaRef.current && progress && progress.position_seconds > 0)
        mediaRef.current.currentTime = progress.position_seconds;
    },
    onPause: () => void persist(false),
    onTimeUpdate: () => {
      const currentTime = mediaRef.current?.currentTime ?? 0;
      if (currentTime - lastSavedRef.current >= 15) {
        lastSavedRef.current = currentTime;
        void persist(false);
      }
    },
    onEnded: () => {
      void persist(true);
      if (next) onSelect(next);
    },
  };

  const teacher = catalog.teachers.find((item) => item.id === recording.teacher_id);
  const village = catalog.villages.find((item) => item.id === recording.village_id);
  return (
    <aside
      className="fixed inset-x-0 bottom-16 z-40 border-t border-[#D8C8A8] bg-[#173F2B] text-white shadow-2xl md:bottom-0"
      aria-label="Lecteur Majliss"
    >
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:px-8 lg:grid-cols-[1fr_minmax(280px,560px)_auto] lg:items-center lg:px-12">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{recording.title}</p>
          <p className="truncate text-xs text-white/70">
            {teacher?.display_name} · {village?.name}, {village?.country}
          </p>
        </div>
        {recording.media_type === "youtube" ? (
          <div className="rounded-xl bg-white/10 px-4 py-3 text-sm">
            <a
              href={`/majliss/ecouter/${recording.id}`}
              className="inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline"
            >
              <Play className="size-4" aria-hidden="true" /> Ouvrir le lecteur vidéo
            </a>
          </div>
        ) : recording.media_type === "video" ? (
          <video {...commonProps} src={recording.media_url} playsInline />
        ) : (
          <audio {...commonProps} src={recording.media_url} />
        )}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={!previous}
            onClick={() => previous && onSelect(previous)}
            className="grid size-11 place-items-center rounded-full border border-white/30 disabled:opacity-40"
            aria-label="Enregistrement précédent"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && onSelect(next)}
            className="grid size-11 place-items-center rounded-full border border-white/30 disabled:opacity-40"
            aria-label="Enregistrement suivant"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export function MajlissHome() {
  return (
    <MajlissState>
      {(catalog) => {
        const recent = catalog.progress
          .filter((item) => !item.completed_at)
          .map((item) => ({
            progress: item,
            recording: catalog.recordings.find((recording) => recording.id === item.recording_id),
          }))
          .filter((item): item is { progress: typeof item.progress; recording: MajlissRecording } =>
            Boolean(item.recording),
          )
          .slice(0, 4);
        return (
          <>
            <PageHeader
              eyebrow="Écouter · apprendre · transmettre"
              title="Majliss"
              description="Retrouvez les enseignements par village et par professeur, dans une interface pensée pour l’écoute mobile."
            />
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:px-12">
              {recent.length ? (
                <section aria-labelledby="continue-title" className="mb-10">
                  <h2
                    id="continue-title"
                    className="font-serif text-2xl font-semibold text-[#173F2B]"
                  >
                    Continuer l’écoute
                  </h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {recent.map(({ recording, progress }) => (
                      <Link
                        key={recording.id}
                        to="/majliss/ecouter/$recordingId"
                        params={{ recordingId: recording.id }}
                        className="rounded-2xl border border-[#D8C8A8] bg-white p-4"
                      >
                        <p className="font-semibold text-[#173F2B]">{recording.title}</p>
                        <p className="mt-1 text-sm text-[#686D65]">
                          Reprendre à {formatDuration(progress.position_seconds)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
              <section aria-labelledby="villages-title">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B56E26]">
                      Explorer
                    </p>
                    <h2
                      id="villages-title"
                      className="mt-2 font-serif text-3xl font-semibold text-[#173F2B]"
                    >
                      Villages
                    </h2>
                  </div>
                  <p className="text-sm text-[#686D65]">
                    {catalog.villages.length} disponible{catalog.villages.length > 1 ? "s" : ""}
                  </p>
                </div>
                {catalog.villages.length ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {catalog.villages.map((village) => {
                      const teacherCount = catalog.teacherVillages.filter(
                        (item) => item.village_id === village.id,
                      ).length;
                      return (
                        <Link
                          key={village.id}
                          to="/majliss/$villageSlug"
                          params={{ villageSlug: village.slug }}
                          className="group min-h-44 rounded-[28px] border border-[#D8C8A8] bg-[#FFFDF7] p-6 shadow-[0_12px_32px_rgba(63,48,25,0.07)] transition hover:-translate-y-0.5"
                        >
                          <MapPin className="size-7 text-[#B56E26]" aria-hidden="true" />
                          <h3 className="mt-5 font-serif text-3xl font-semibold text-[#173F2B]">
                            {village.name}, {village.country}
                          </h3>
                          <p className="mt-2 text-sm text-[#686D65]">
                            {teacherCount} professeur{teacherCount > 1 ? "s" : ""}
                          </p>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5">
                    <EmptyState
                      title="Aucun village publié"
                      description="Les premiers Majliss apparaîtront ici."
                    />
                  </div>
                )}
              </section>
            </div>
          </>
        );
      }}
    </MajlissState>
  );
}

export function VillagePage({ slug }: { slug: string }) {
  return (
    <MajlissState>
      {(catalog) => {
        const village = catalog.villages.find((item) => item.slug === slug);
        if (!village)
          return (
            <div className="mx-auto max-w-3xl px-4 py-16">
              <EmptyState title="Village introuvable" description="Ce village n’est pas publié." />
            </div>
          );
        const links = catalog.teacherVillages.filter((item) => item.village_id === village.id);
        const teachers = links
          .map((link) => catalog.teachers.find((teacher) => teacher.id === link.teacher_id))
          .filter((teacher): teacher is NonNullable<typeof teacher> => Boolean(teacher));
        return (
          <>
            <MajlissBreadcrumb items={[{ label: `${village.name}, ${village.country}` }]} />
            <PageHeader
              eyebrow="Village"
              title={`${village.name}, ${village.country}`}
              description={village.description}
            />
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 lg:px-12">
              <h2 className="font-serif text-3xl font-semibold text-[#173F2B]">Professeurs</h2>
              {teachers.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {teachers.map((teacher) => (
                    <Link
                      key={teacher.id}
                      to="/majliss/$villageSlug/$teacherSlug"
                      params={{ villageSlug: village.slug, teacherSlug: teacher.slug }}
                      className="rounded-[28px] border border-[#D8C8A8] bg-white p-6"
                    >
                      <UserRound className="size-8 text-[#B56E26]" />
                      <h3 className="mt-5 font-serif text-2xl font-semibold text-[#173F2B]">
                        {teacher.display_name}
                      </h3>
                      <p className="mt-2 text-sm text-[#686D65]">Voir les enregistrements</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState
                    title="Aucun professeur"
                    description="Les professeurs associés à ce village apparaîtront ici."
                  />
                </div>
              )}
            </div>
          </>
        );
      }}
    </MajlissState>
  );
}

export function TeacherPage({
  villageSlug,
  teacherSlug,
}: {
  villageSlug: string;
  teacherSlug: string;
}) {
  return (
    <MajlissState>
      {(catalog) => {
        const village = catalog.villages.find((item) => item.slug === villageSlug);
        const teacher = catalog.teachers.find((item) => item.slug === teacherSlug);
        if (!village || !teacher)
          return (
            <div className="mx-auto max-w-3xl px-4 py-16">
              <EmptyState
                title="Professeur introuvable"
                description="Ce profil n’est pas publié."
              />
            </div>
          );
        const recordings = catalog.recordings.filter(
          (item) => item.village_id === village.id && item.teacher_id === teacher.id,
        );
        return (
          <>
            <MajlissBreadcrumb
              items={[
                { label: `${village.name}, ${village.country}`, href: `/majliss/${village.slug}` },
                { label: teacher.display_name },
              ]}
            />
            <PageHeader
              eyebrow="Professeur"
              title={teacher.display_name}
              description={teacher.biography}
            />
            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-3xl font-semibold text-[#173F2B]">
                  Enregistrements
                </h2>
                <span className="text-sm text-[#686D65]">{recordings.length}</span>
              </div>
              {recordings.length ? (
                <div className="mt-5 grid gap-3">
                  {recordings.map((recording, index) => (
                    <Link
                      key={recording.id}
                      to="/majliss/ecouter/$recordingId"
                      params={{ recordingId: recording.id }}
                      className="flex min-h-20 items-center gap-4 rounded-2xl border border-[#D8C8A8] bg-white p-4"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#E6F0E8] text-[#173F2B]">
                        <Play className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-[#173F2B]">
                          {recording.title}
                        </span>
                        <span className="mt-1 block text-sm text-[#686D65]">
                          {formatDuration(recording.duration_seconds)} · Gratuit
                        </span>
                      </span>
                      <span className="text-sm text-[#8A7650]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState
                    title="Aucun enregistrement pour le moment"
                    description={`Les enregistrements de ${teacher.display_name} à ${village.name}, Guinée seront publiés ici dès qu’une source réelle sera fournie.`}
                  />
                </div>
              )}
            </div>
          </>
        );
      }}
    </MajlissState>
  );
}

export function RecordingPage({ recordingId }: { recordingId: string }) {
  return (
    <MajlissState>
      {(catalog) => {
        const recording = catalog.recordings.find((item) => item.id === recordingId);
        if (!recording)
          return (
            <div className="mx-auto max-w-3xl px-4 py-16">
              <EmptyState
                title="Enregistrement indisponible"
                description="Ce média n’est pas publié ou n’existe plus."
              />
            </div>
          );
        return <ResolvedRecordingPage catalog={catalog} recording={recording} />;
      }}
    </MajlissState>
  );
}

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.searchParams.get("v") ||
      (parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : null)
    );
  } catch {
    return null;
  }
}

function ResolvedRecordingPage({
  catalog,
  recording,
}: {
  catalog: MajlissCatalog;
  recording: MajlissRecording;
}) {
  const { play } = useMajlissPlayer();
  useEffect(() => {
    play(recording, catalog);
  }, [catalog, play, recording]);
  const teacher = catalog.teachers.find((item) => item.id === recording.teacher_id);
  const village = catalog.villages.find((item) => item.id === recording.village_id);
  const videoId = recording.media_type === "youtube" ? youtubeVideoId(recording.media_url) : null;
  return (
    <>
      <MajlissBreadcrumb
        items={[
          {
            label: `${village?.name}, ${village?.country}`,
            href: village ? `/majliss/${village.slug}` : undefined,
          },
          {
            label: teacher?.display_name ?? "Professeur",
            href: village && teacher ? `/majliss/${village.slug}/${teacher.slug}` : undefined,
          },
          { label: recording.title },
        ]}
      />
      <PageHeader
        eyebrow="Enregistrement"
        title={recording.title}
        description={recording.description}
      />
      <div className="mx-auto max-w-4xl px-4 py-10 pb-48 sm:px-8">
        <div className="rounded-[28px] border border-[#D8C8A8] bg-white p-5 sm:p-7">
          <div className="flex flex-wrap gap-3 text-sm text-[#686D65]">
            <span className="inline-flex items-center gap-2">
              <Mic2 className="size-4" />
              {teacher?.display_name}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" />
              {village?.name}, {village?.country}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" />
              {formatDuration(recording.duration_seconds)}
            </span>
          </div>
          {recording.media_type === "youtube" && videoId ? (
            <div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                title={`Lecteur ${recording.title}`}
                className="size-full"
                loading="lazy"
                allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-2xl bg-[#F3E8D3] p-6 text-center">
              <Headphones className="mx-auto size-10 text-[#B56E26]" />
              <p className="mt-3 text-sm text-[#686D65]">
                Utilisez le lecteur persistant en bas de l’écran.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export const majlissIcons = { Radio, Headphones };
