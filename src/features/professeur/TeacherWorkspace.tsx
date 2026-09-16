import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Award,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Radio,
  School,
  Users,
  Video,
  WandSparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PortalSwitcher } from "@/components/PortalSwitcher";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { TeacherAssessments } from "@/features/assessment/TeacherAssessments";
import type { OrganizationBrand, OrganizationRole } from "@/lib/auth/portal-access";
import { HomeworkReviewPanel, TeacherMessagesPanel } from "./TeacherInteractions";
import { TeacherLiveSessions } from "./TeacherLiveSessions";
import { loadTeacherDashboard, type TeacherCohort, type TeacherLearner } from "./teacher-data";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { makeT, type Lang } from "./i18n";
import { TeacherCourseAssistant } from "./TeacherCourseAssistant";

type Props = {
  organization: OrganizationBrand;
  role: OrganizationRole;
  userId: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Professeur";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLastActivity(value: string | null) {
  if (!value) return "Aucune activité enregistrée";
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return "Actif aujourd’hui";
  if (days === 1) return "Actif hier";
  return `Actif il y a ${days} jours`;
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-border bg-card/70 px-5 py-10 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <Card className="border-border/60 bg-card/90 shadow-sm">
      <CardContent className="flex items-center gap-3 p-4 sm:p-5">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressTone({ value }: { value: number }) {
  if (value >= 75)
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">À jour</Badge>;
  if (value >= 35)
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">À suivre</Badge>;
  return <Badge variant="outline">À accompagner</Badge>;
}

function LearnerRow({ learner }: { learner: TeacherLearner }) {
  return (
    <article className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--gold),var(--gold-soft))] text-sm font-bold text-[color:var(--anthracite)]">
          {initials(learner.fullName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="truncate font-semibold">{learner.preferredName || learner.fullName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatLastActivity(learner.lastActivityAt)}
              </p>
            </div>
            <ProgressTone value={learner.progressPercent} />
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progression</span>
              <span className="font-semibold">{learner.progressPercent}%</span>
            </div>
            <Progress value={learner.progressPercent} className="h-2" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/60 px-2 py-2">
              <p className="text-sm font-semibold">
                {learner.completedLessons}/{learner.totalLessons}
              </p>
              <p className="text-[10px] text-muted-foreground">Leçons</p>
            </div>
            <div className="rounded-xl bg-muted/60 px-2 py-2">
              <p className="text-sm font-semibold">
                {learner.averageQuizScore === null ? "—" : `${learner.averageQuizScore}%`}
              </p>
              <p className="text-[10px] text-muted-foreground">Quiz</p>
            </div>
            <div className="rounded-xl bg-muted/60 px-2 py-2">
              <p className="text-sm font-semibold">{learner.pendingHomework}</p>
              <p className="text-[10px] text-muted-foreground">À corriger</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function ClassPanel({ cohort }: { cohort: TeacherCohort }) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,var(--deep-green),var(--deep-green-hi))] text-[color:var(--cream)] shadow-[var(--shadow-elegant)]">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                {cohort.code ? (
                  <Badge className="bg-white/15 text-white hover:bg-white/15">{cohort.code}</Badge>
                ) : null}
                {cohort.level ? (
                  <Badge className="bg-white/15 text-white hover:bg-white/15">{cohort.level}</Badge>
                ) : null}
              </div>
              <h2 className="mt-3 font-serif text-2xl">{cohort.name}</h2>
              <p className="mt-1 text-sm text-white/70">
                {cohort.learners.length} élève{cohort.learners.length > 1 ? "s" : ""} ·{" "}
                {cohort.courses.length} cours
              </p>
            </div>
            <div className="min-w-28 rounded-2xl bg-white/10 p-4 text-center backdrop-blur">
              <p className="text-2xl font-semibold">{cohort.averageProgress}%</p>
              <p className="text-[11px] text-white/70">progression moyenne</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold">Élèves de la classe</h3>
            <p className="text-sm text-muted-foreground">
              Progression et résultats mis à jour automatiquement.
            </p>
          </div>
        </div>
        {cohort.learners.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {cohort.learners.map((learner) => (
              <LearnerRow key={learner.id} learner={learner} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Aucun élève inscrit"
            description="L’administrateur peut inscrire des élèves dans cette classe depuis son espace."
          />
        )}
      </div>
    </div>
  );
}

export function TeacherWorkspace({ organization, role, userId }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "fr";
    return window.localStorage.getItem("karanta-teacher-language") === "ar" ? "ar" : "fr";
  });
  const t = makeT(lang);
  const isRtl = lang === "ar";
  const changeLanguage = (next: Lang) => {
    setLang(next);
    window.localStorage.setItem("karanta-teacher-language", next);
  };
  const dashboard = useQuery({
    queryKey: ["teacher-dashboard", organization.id, userId],
    queryFn: () => loadTeacherDashboard(organization.id, userId, role),
  });
  const data = dashboard.data;
  const allLearners = useMemo(
    () =>
      new Set(
        data?.cohorts.flatMap((cohort) => cohort.learners.map((learner) => learner.id)) ?? [],
      ),
    [data],
  );
  const selectedCohort =
    data?.cohorts.find((cohort) => cohort.id === selectedCohortId) ?? data?.cohorts[0];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      lang={isRtl ? "ar" : "fr"}
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.1),transparent_30rem)] bg-background"
    >
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-sm">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="" className="size-full object-contain p-1" />
              ) : (
                <GraduationCap className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{organization.name}</p>
              <p className="text-xs text-muted-foreground">{t("teacher_space")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher lang={lang} onChange={changeLanguage} />
            <PortalSwitcher current="teacher" role={role} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("logout")}
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign("/auth?portal=teacher");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full">
              {t("dashboard")}
            </Badge>
            <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">
              {t("welcome")}
              {data ? `, ${firstName(data.teacherName)}` : ""}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t("welcome_help")}</p>
          </div>
          <Button asChild className="min-h-11 shrink-0">
            <a href="/planning">
              <CalendarClock className="size-4" /> {lang === "ar" ? "جدولي" : "Voir mon planning"}
            </a>
          </Button>
        </div>

        {dashboard.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : null}
        {dashboard.isError ? (
          <EmptyState
            icon={<BarChart3 className="size-5" />}
            title="Impossible de charger votre espace"
            description={dashboard.error.message}
          />
        ) : null}

        {data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1 sm:w-fit sm:min-w-[900px] sm:grid-cols-7">
              <TabsTrigger value="overview" className="min-h-11 rounded-xl">
                <LayoutDashboard className="size-4 sm:mr-2" />
                <span>{t("tab_home")}</span>
              </TabsTrigger>
              <TabsTrigger value="classes" className="min-h-11 rounded-xl">
                <School className="size-4 sm:mr-2" />
                <span>{t("tab_classes")}</span>
              </TabsTrigger>
              <TabsTrigger value="courses" className="min-h-11 rounded-xl">
                <BookOpen className="size-4 sm:mr-2" />
                <span>{t("tab_courses")}</span>
              </TabsTrigger>
              <TabsTrigger value="lives" className="min-h-11 rounded-xl">
                <Radio className="size-4 sm:mr-2" />
                <span>{t("tab_lives")}</span>
              </TabsTrigger>
              <TabsTrigger value="homework" className="min-h-11 rounded-xl">
                <ClipboardCheck className="size-4 sm:mr-2" />
                <span>{t("tab_homework")}</span>
              </TabsTrigger>
              <TabsTrigger value="messages" className="min-h-11 rounded-xl">
                <MessageCircle className="size-4 sm:mr-2" />
                <span>{t("tab_messages")}</span>
              </TabsTrigger>
              <TabsTrigger value="assessments" className="min-h-11 rounded-xl">
                <Award className="size-4 sm:mr-2" />
                <span>{t("tab_assessments")}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat
                  icon={<School className="size-5" />}
                  value={data.cohorts.length}
                  label={t("assigned_classes")}
                />
                <Stat
                  icon={<Users className="size-5" />}
                  value={allLearners.size}
                  label={t("followed_students")}
                />
                <Stat
                  icon={<BookOpen className="size-5" />}
                  value={data.courses.length}
                  label={t("associated_courses")}
                />
                <Stat
                  icon={<ClipboardCheck className="size-5" />}
                  value={data.homework.filter((item) => item.status !== "graded").length}
                  label={t("corrections_waiting")}
                />
              </div>

              <section>
                <h2 className="mb-3 font-serif text-xl font-semibold">{t("quick_actions")}</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(true)}
                    className="text-start"
                  >
                    <Card className="h-full border-primary/25 bg-primary/[0.04] shadow-sm transition hover:-translate-y-0.5 hover:border-primary/45">
                      <CardContent className="p-5">
                        <div className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                          <WandSparkles className="size-5" />
                        </div>
                        <h3 className="mt-4 font-semibold">{t("create_course")}</h3>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {t("create_course_help")}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                  {[
                    ["homework", ClipboardCheck, "grade_homework", "grade_homework_help"],
                    ["lives", Radio, "schedule_live", "schedule_live_help"],
                    ["messages", MessageCircle, "answer_messages", "answer_messages_help"],
                  ].map(([tab, Icon, titleKey, helpKey]) => (
                    <button
                      key={String(tab)}
                      type="button"
                      onClick={() => setActiveTab(String(tab))}
                      className="text-start"
                    >
                      <Card className="h-full border-border/60 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30">
                        <CardContent className="p-5">
                          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="size-5" />
                          </div>
                          <h3 className="mt-4 font-semibold">{t(String(titleKey))}</h3>
                          <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            {t(String(helpKey))}
                          </p>
                        </CardContent>
                      </Card>
                    </button>
                  ))}
                </div>
              </section>

              {data.cohorts.length === 0 ? (
                <EmptyState
                  icon={<School className="size-5" />}
                  title="Aucune classe ne vous est encore attribuée"
                  description="Votre compte professeur est actif. Un administrateur doit maintenant vous affecter à une classe pour faire apparaître les élèves, cours et séances."
                />
              ) : (
                <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                  <Card className="border-border/60 shadow-sm">
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-4">
                        <h2 className="font-semibold">{t("my_classes")}</h2>
                        <p className="text-sm text-muted-foreground">{t("my_classes_help")}</p>
                      </div>
                      <div className="space-y-3">
                        {data.cohorts.map((cohort) => (
                          <button
                            key={cohort.id}
                            type="button"
                            onClick={() => {
                              setSelectedCohortId(cohort.id);
                              setActiveTab("classes");
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl border border-border/70 p-4 text-left transition hover:border-primary/30 hover:bg-primary/[0.03]"
                          >
                            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                              <School className="size-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{cohort.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cohort.learners.length} {t("students")} · {cohort.courses.length}{" "}
                                {t("courses")}
                              </p>
                              <Progress value={cohort.averageProgress} className="mt-2 h-1.5" />
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold">{cohort.averageProgress}%</p>
                              <ChevronRight className="ml-auto mt-1 size-4 text-muted-foreground" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="border-0 bg-[linear-gradient(135deg,var(--deep-green),var(--deep-green-hi))] text-[color:var(--cream)] shadow-[var(--shadow-elegant)]">
                      <CardContent className="p-5 sm:p-6">
                        <div className="flex items-center gap-2 text-sm text-white/70">
                          <CalendarClock className="size-4" /> {t("next_live")}
                        </div>
                        {data.upcomingLives[0] ? (
                          <>
                            <h2 className="mt-4 font-serif text-xl">
                              {data.upcomingLives[0].title}
                            </h2>
                            <p className="mt-1 text-sm text-white/75">
                              {formatDateTime(data.upcomingLives[0].starts_at)}
                            </p>
                            {data.upcomingLives[0].join_url ? (
                              <Button
                                asChild
                                className="mt-5 h-11 w-full rounded-xl bg-[color:var(--gold)] text-[color:var(--anthracite)] hover:bg-[color:var(--gold-soft)]"
                              >
                                <a
                                  href={data.upcomingLives[0].join_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Video className="size-4" /> {t("open_room")}
                                </a>
                              </Button>
                            ) : (
                              <p className="mt-4 text-xs text-white/60">
                                Lien de réunion à compléter.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-4 text-sm text-white/75">{t("no_session")}</p>
                        )}
                      </CardContent>
                    </Card>
                    <button
                      type="button"
                      onClick={() => setActiveTab("messages")}
                      className="w-full text-left"
                    >
                      <Card className="border-border/60 shadow-sm transition hover:border-primary/30">
                        <CardContent className="p-5">
                          <div className="flex items-start gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold-dark)]">
                              <MessageCircle className="size-5" />
                            </div>
                            <div>
                              <p className="font-semibold">{t("questions_messages")}</p>
                              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                {t("questions_messages_help")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="classes" className="mt-0 space-y-5">
              {data.cohorts.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {data.cohorts.map((cohort) => (
                    <Button
                      key={cohort.id}
                      variant={selectedCohort?.id === cohort.id ? "default" : "outline"}
                      className="shrink-0 rounded-full"
                      onClick={() => setSelectedCohortId(cohort.id)}
                    >
                      {cohort.name}
                    </Button>
                  ))}
                </div>
              ) : null}
              {selectedCohort ? (
                <ClassPanel cohort={selectedCohort} />
              ) : (
                <EmptyState
                  icon={<School className="size-5" />}
                  title="Aucune classe"
                  description="Une classe doit vous être attribuée par un administrateur."
                />
              )}
            </TabsContent>

            <TabsContent value="courses" className="mt-0 space-y-5">
              <div>
                <h2 className="text-xl font-semibold">{t("course_list_title")}</h2>
                <p className="text-sm text-muted-foreground">{t("course_list_help")}</p>
                <Button className="mt-4 min-h-11 rounded-xl" onClick={() => setAssistantOpen(true)}>
                  <WandSparkles /> {t("create_course")}
                </Button>
              </div>
              {data.courses.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.courses.map((course) => (
                    <Card key={course.id} className="border-border/60 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                            <BookOpen className="size-5" />
                          </div>
                          <Badge variant={course.status === "published" ? "secondary" : "outline"}>
                            {course.status === "published" ? t("published") : t("draft")}
                          </Badge>
                        </div>
                        <h3 className="mt-4 font-serif text-lg">{course.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {course.level || t("all_levels")}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="size-4 text-primary" /> {course.lessonCount}{" "}
                          {t("lessons")}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                          {course.cohortNames.map((name) => (
                            <Badge key={name} variant="outline">
                              {name}
                            </Badge>
                          ))}
                        </div>
                        {course.createdBy === userId ? (
                          <Button
                            variant="outline"
                            className="mt-4 min-h-11 w-full rounded-xl"
                            onClick={() => window.location.assign(`/cours/${course.id}`)}
                          >
                            <BookOpen className="size-4" /> {t("edit")}
                          </Button>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<BookOpen className="size-5" />}
                  title="Aucun cours attribué"
                  description="Les cours associés à vos classes apparaîtront ici."
                />
              )}

              {data.upcomingLives.length > 0 ? (
                <div className="pt-3">
                  <h2 className="mb-3 flex items-center gap-2 font-semibold">
                    <Clock3 className="size-4" /> Directs à venir
                  </h2>
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.upcomingLives.map((session) => (
                      <Card key={session.id} className="border-border/60 shadow-sm">
                        <CardContent className="flex items-center gap-3 p-4">
                          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-red-50 text-red-700">
                            <Video className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold">{session.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(session.starts_at)}
                            </p>
                          </div>
                          {session.join_url ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={session.join_url} target="_blank" rel="noreferrer">
                                Ouvrir
                              </a>
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="homework" className="mt-0 space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Corrections vocales</h2>
                <p className="text-sm text-muted-foreground">
                  Écoutez les récitations, écrivez votre retour et validez le devoir.
                </p>
              </div>
              <HomeworkReviewPanel organizationId={organization.id} userId={userId} data={data} />
            </TabsContent>

            <TabsContent value="lives" className="mt-0 space-y-5">
              <TeacherLiveSessions organizationId={organization.id} userId={userId} data={data} />
            </TabsContent>

            <TabsContent value="messages" className="mt-0 space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Questions des élèves</h2>
                <p className="text-sm text-muted-foreground">
                  Une conversation privée reste visible uniquement par l’élève, sa famille et son
                  professeur.
                </p>
              </div>
              <TeacherMessagesPanel organizationId={organization.id} userId={userId} data={data} />
            </TabsContent>

            <TabsContent value="assessments" className="mt-0 space-y-5">
              <TeacherAssessments
                organizationId={organization.id}
                userId={userId}
                cohorts={data.cohorts}
              />
            </TabsContent>
          </Tabs>
        ) : null}
      </main>
      {data ? (
        <TeacherCourseAssistant
          open={assistantOpen}
          onOpenChange={setAssistantOpen}
          organizationId={organization.id}
          userId={userId}
          cohorts={data.cohorts}
          lang={lang}
          onCreated={(courseId) => window.location.assign(`/cours/${courseId}`)}
        />
      ) : null}
    </div>
  );
}
