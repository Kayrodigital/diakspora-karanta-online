import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Plus,
  School,
  Search,
  ShoppingBag,
  ShieldCheck,
  UserPlus,
  Users,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PortalSwitcher } from "@/components/PortalSwitcher";
import { supabase } from "@/integrations/supabase/client";
import type { OrganizationBrand, OrganizationRole } from "@/lib/auth/portal-access";
import { AdminSupport } from "./AdminSupport";
import { NotificationCenter } from "./NotificationCenter";
import {
  assignCourseToCohort,
  assignTeacherToCohort,
  loadAdminDashboard,
  runAdminMemberAction,
  type AdminDashboardData,
  type AdminMemberAction,
  type AdminRole,
} from "./admin-data";
import { PedagogicalAdmin } from "./PedagogicalAdmin";
import { createLearningItem } from "./pedagogical-data";
import { ShopAdmin } from "./ShopAdmin";

type Props = {
  organization: OrganizationBrand;
  role: OrganizationRole;
  userId: string;
};

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  technician: "Technicien",
  pedagogical_manager: "Responsable pédagogique",
  teacher: "Professeur",
  class_manager: "Responsable de classe",
  parent: "Parent",
  learner: "Élève",
};

const inviteRoles: Array<{ value: AdminRole; label: string }> = [
  { value: "learner", label: "Élève" },
  { value: "parent", label: "Parent" },
  { value: "teacher", label: "Professeur" },
  { value: "class_manager", label: "Responsable de classe" },
  { value: "pedagogical_manager", label: "Responsable pédagogique" },
  { value: "technician", label: "Technicien" },
  { value: "admin", label: "Administrateur" },
];

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  id,
  name,
  defaultValue,
  value,
  onChange,
  children,
}: {
  id: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      className="flex min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/25"
    >
      {children}
    </select>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function personName(member: AdminDashboardData["members"][number]) {
  return (
    member.profile?.preferred_name ||
    member.profile?.full_name ||
    member.profile?.email ||
    "Utilisateur"
  );
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
    <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-background text-primary shadow-sm">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function AdminWorkspace({ organization, role, userId }: Props) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managedLearnerOpen, setManagedLearnerOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [courseAssignOpen, setCourseAssignOpen] = useState(false);
  const [teacherAssignOpen, setTeacherAssignOpen] = useState(false);
  const [selectedCohortId, setSelectedCohortId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const queryKey = ["admin-dashboard", organization.id];
  const dashboardQuery = useQuery({
    queryKey,
    queryFn: () => loadAdminDashboard(organization.id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const actionMutation = useMutation({
    mutationFn: runAdminMemberAction,
    onSuccess: (_, variables) => {
      refresh();
      setInviteOpen(false);
      setManagedLearnerOpen(false);
      setAssignOpen(false);
      if (variables.action === "invite") toast.success("Invitation et accès enregistrés.");
      if (variables.action === "create_managed_learner")
        toast.success("Élève ajouté au compte du parent.");
      if (variables.action === "assign_learner") toast.success("Élève inscrit dans la classe.");
    },
    onError: (error) => toast.error(error.message),
  });

  const classMutation = useMutation({
    mutationFn: (input: {
      name: string;
      code?: string;
      level?: string;
      description?: string;
      maxStudents?: number;
    }) => createLearningItem(organization.id, userId, { kind: "cohort", ...input }),
    onSuccess: () => {
      refresh();
      setClassOpen(false);
      toast.success("Classe créée.");
    },
    onError: (error) => toast.error(error.message),
  });

  const courseAssignmentMutation = useMutation({
    mutationFn: (input: { courseId: string; cohortId: string }) =>
      assignCourseToCohort({ ...input, organizationId: organization.id, userId }),
    onSuccess: () => {
      refresh();
      setCourseAssignOpen(false);
      toast.success("Cours attribué à la classe.");
    },
    onError: (error) => toast.error(error.message),
  });

  const teacherAssignmentMutation = useMutation({
    mutationFn: (input: { cohortId: string; teacherId: string | null }) =>
      assignTeacherToCohort({ ...input, organizationId: organization.id }),
    onSuccess: () => {
      refresh();
      setTeacherAssignOpen(false);
      toast.success("Professeur responsable mis à jour.");
    },
    onError: (error) => toast.error(error.message),
  });

  const data = dashboardQuery.data;
  const activeLearners = data?.learners.filter((learner) => learner.status === "active") ?? [];
  const filteredMembers = useMemo(() => {
    if (!data) return [];
    const needle = search.trim().toLocaleLowerCase("fr");
    return data.members.filter((member) => {
      const haystack = `${personName(member)} ${member.profile?.email ?? ""}`.toLocaleLowerCase(
        "fr",
      );
      return (
        (roleFilter === "all" || member.role === roleFilter) &&
        (!needle || haystack.includes(needle))
      );
    });
  }, [data, roleFilter, search]);

  const selectedCohort = data?.cohorts.find((cohort) => cohort.id === selectedCohortId);
  const parentMembers =
    data?.members.filter((member) => member.role === "parent" && member.status === "active") ?? [];
  const teacherMembers =
    data?.members.filter((member) => member.role === "teacher" && member.status === "active") ?? [];

  const submitAction = (event: FormEvent<HTMLFormElement>, action: AdminMemberAction["action"]) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (action === "invite") {
      actionMutation.mutate({
        action,
        organizationId: organization.id,
        fullName: String(form.get("fullName") ?? ""),
        email: String(form.get("email") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        role: String(form.get("role") ?? "learner") as AdminRole,
        cohortId: String(form.get("cohortId") ?? "") || undefined,
      });
    }
    if (action === "create_managed_learner") {
      actionMutation.mutate({
        action,
        organizationId: organization.id,
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        guardianUserId: String(form.get("guardianUserId") ?? ""),
        cohortId: String(form.get("cohortId") ?? "") || undefined,
      });
    }
    if (action === "assign_learner") {
      actionMutation.mutate({
        action,
        organizationId: organization.id,
        learnerId: String(form.get("learnerId") ?? ""),
        cohortId: selectedCohortId,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_28rem)] bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-2xl bg-primary text-primary-foreground shadow-sm">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="" className="size-full object-contain p-1" />
              ) : (
                <School className="size-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{organization.name}</p>
              <p className="truncate text-xs text-muted-foreground">Centre de gestion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PortalSwitcher current="admin" role={role} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Se déconnecter"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign("/auth?portal=admin");
              }}
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full">
              Administration
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pilotez votre école
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Retrouvez les élèves, les inscriptions, les classes et les contenus depuis un seul
              espace.
            </p>
          </div>
          <Button onClick={() => setInviteOpen(true)} className="h-11 rounded-xl sm:w-auto">
            <UserPlus className="size-4" /> Inviter une personne
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-muted/70 p-1 sm:w-fit sm:min-w-[940px] sm:grid-cols-7">
            <TabsTrigger value="overview" className="min-h-11 rounded-xl px-2">
              <LayoutDashboard className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Vue d’ensemble</span>
              <span className="sm:hidden">Accueil</span>
            </TabsTrigger>
            <TabsTrigger value="people" className="min-h-11 rounded-xl px-2">
              <Users className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Utilisateurs</span>
              <span className="sm:hidden">Membres</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="min-h-11 rounded-xl px-2">
              <School className="size-4 sm:mr-2" />
              <span>Classes</span>
            </TabsTrigger>
            <TabsTrigger value="learning" className="min-h-11 rounded-xl px-2">
              <BookOpen className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Pédagogie</span>
              <span className="sm:hidden">Cours</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="min-h-11 rounded-xl px-2">
              <Bell className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alertes</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="min-h-11 rounded-xl px-2">
              <ShoppingBag className="size-4 sm:mr-2" />
              <span>Boutique</span>
            </TabsTrigger>
            <TabsTrigger value="support" className="min-h-11 rounded-xl px-2">
              <Headphones className="size-4 sm:mr-2" />
              <span>Support</span>
            </TabsTrigger>
          </TabsList>

          {dashboardQuery.isLoading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-40 rounded-2xl" />
              ))}
            </div>
          )}
          {dashboardQuery.isError && (
            <EmptyState
              icon={<ShieldCheck className="size-5" />}
              title="Impossible de charger l’administration"
              description={dashboardQuery.error.message}
            />
          )}

          {data && (
            <>
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={<GraduationCap className="size-5" />}
                    label="Élèves actifs"
                    value={activeLearners.length}
                    detail="Comptes individuels et profils rattachés"
                  />
                  <StatCard
                    icon={<School className="size-5" />}
                    label="Classes actives"
                    value={data.cohorts.filter((item) => item.status === "active").length}
                    detail="Groupes actuellement ouverts"
                  />
                  <StatCard
                    icon={<BookOpen className="size-5" />}
                    label="Cours publiés"
                    value={data.courses.filter((item) => item.status === "published").length}
                    detail={`${data.courses.length} cours au total`}
                  />
                  <StatCard
                    icon={<CalendarClock className="size-5" />}
                    label="Invitations"
                    value={data.invitations.filter((item) => item.status === "invited").length}
                    detail="En attente d’acceptation"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-5 flex items-center justify-between">
                        <div>
                          <p className="font-semibold">Classes</p>
                          <p className="text-sm text-muted-foreground">
                            Effectifs et contenus attribués
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setActiveTab("classes")}>
                          Tout voir <ArrowRight className="size-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {data.cohorts.slice(0, 4).map((cohort) => {
                          const count = activeLearners.filter((learner) =>
                            learner.cohorts.includes(cohort.id),
                          ).length;
                          return (
                            <button
                              key={cohort.id}
                              className="flex w-full items-center gap-3 rounded-2xl border border-border/70 p-4 text-left transition hover:border-primary/30 hover:bg-primary/[0.03]"
                              onClick={() => {
                                setSelectedCohortId(cohort.id);
                                setActiveTab("classes");
                              }}
                            >
                              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                                <School className="size-5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{cohort.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {count}
                                  {cohort.max_students ? ` / ${cohort.max_students}` : ""} élèves
                                </p>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </button>
                          );
                        })}
                        {data.cohorts.length === 0 && (
                          <EmptyState
                            icon={<School className="size-5" />}
                            title="Aucune classe"
                            description="Créez votre première classe pour y inscrire les élèves."
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 bg-primary text-primary-foreground shadow-sm">
                    <CardContent className="p-5 sm:p-6">
                      <p className="text-sm text-primary-foreground/75">Actions rapides</p>
                      <h2 className="mt-2 text-xl font-semibold">Que souhaitez-vous faire ?</h2>
                      <div className="mt-6 grid gap-2">
                        <Button
                          variant="secondary"
                          className="h-12 justify-start rounded-xl"
                          onClick={() => setInviteOpen(true)}
                        >
                          <UserPlus className="size-4" /> Inviter un élève ou un membre
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-12 justify-start rounded-xl"
                          onClick={() => setManagedLearnerOpen(true)}
                        >
                          <CircleUserRound className="size-4" /> Ajouter un enfant à un parent
                        </Button>
                        <Button
                          variant="secondary"
                          className="h-12 justify-start rounded-xl"
                          onClick={() => setClassOpen(true)}
                        >
                          <Plus className="size-4" /> Créer une classe
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="people" className="mt-0 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Utilisateurs et inscriptions</h2>
                    <p className="text-sm text-muted-foreground">
                      Gérez les accès, les rôles et les profils élèves.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button variant="outline" onClick={() => setManagedLearnerOpen(true)}>
                      <CircleUserRound className="size-4" /> Ajouter un enfant
                    </Button>
                    <Button onClick={() => setInviteOpen(true)}>
                      <UserPlus className="size-4" /> Inviter
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Rechercher par nom ou e-mail"
                      className="h-11 rounded-xl pl-10"
                    />
                  </div>
                  <NativeSelect id="roleFilter" value={roleFilter} onChange={setRoleFilter}>
                    <option value="all">Tous les rôles</option>
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredMembers.map((member) => {
                    const name = personName(member);
                    return (
                      <Card key={member.id} className="border-border/70 shadow-sm">
                        <CardContent className="flex items-center gap-4 p-4">
                          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                            {initials(name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{name}</p>
                            <p className="truncate text-sm text-muted-foreground">
                              {member.profile?.email ?? "Profil sans e-mail"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <Badge variant="secondary">
                                {roleLabels[member.role] ?? member.role}
                              </Badge>
                              <Badge
                                variant={member.status === "active" ? "outline" : "destructive"}
                              >
                                {member.status === "active"
                                  ? "Actif"
                                  : member.status === "invited"
                                    ? "Invité"
                                    : "Suspendu"}
                              </Badge>
                            </div>
                          </div>
                          {member.role !== "owner" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionMutation.isPending}
                              onClick={() =>
                                actionMutation.mutate({
                                  action: "set_member_status",
                                  organizationId: organization.id,
                                  userId: member.user_id,
                                  status: member.status === "active" ? "suspended" : "active",
                                })
                              }
                            >
                              {member.status === "active" ? "Suspendre" : "Réactiver"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {filteredMembers.length === 0 && (
                  <EmptyState
                    icon={<Users className="size-5" />}
                    title="Aucun utilisateur trouvé"
                    description="Modifiez les filtres ou invitez une nouvelle personne."
                  />
                )}

                {data.invitations.length > 0 && (
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="p-5 sm:p-6">
                      <div className="mb-4">
                        <h3 className="font-semibold">Inscriptions récentes</h3>
                        <p className="text-sm text-muted-foreground">
                          Suivez les invitations envoyées et déjà acceptées.
                        </p>
                      </div>
                      <div className="divide-y divide-border">
                        {data.invitations.slice(0, 8).map((invitation) => (
                          <div
                            key={invitation.id}
                            className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{invitation.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {invitation.email} · {roleLabels[invitation.role]}
                              </p>
                            </div>
                            <Badge
                              variant={invitation.status === "accepted" ? "secondary" : "outline"}
                              className="w-fit"
                            >
                              {invitation.status === "accepted" ? (
                                <CheckCircle2 className="mr-1 size-3" />
                              ) : null}
                              {invitation.status === "accepted" ? "Acceptée" : "En attente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-border/70 shadow-sm">
                  <CardContent className="p-5 sm:p-6">
                    <div className="mb-4">
                      <h3 className="font-semibold">Profils élèves</h3>
                      <p className="text-sm text-muted-foreground">
                        Inclut les enfants rattachés au compte d’un parent.
                      </p>
                    </div>
                    <div className="divide-y divide-border">
                      {data.learners.map((learner) => (
                        <div
                          key={learner.id}
                          className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-muted text-sm font-semibold">
                              {initials(learner.full_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{learner.full_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {learner.access_mode === "guardian_managed"
                                  ? "Accès via un parent"
                                  : (learner.email ?? "Compte individuel")}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {learner.cohorts.map((id) => (
                              <Badge key={id} variant="secondary">
                                {data.cohorts.find((cohort) => cohort.id === id)?.name ?? "Classe"}
                              </Badge>
                            ))}
                            {learner.cohorts.length === 0 && (
                              <Badge variant="outline">Sans classe</Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionMutation.isPending}
                            onClick={() =>
                              actionMutation.mutate({
                                action: "set_learner_status",
                                organizationId: organization.id,
                                learnerId: learner.id,
                                status: learner.status === "active" ? "suspended" : "active",
                              })
                            }
                          >
                            {learner.status === "active" ? "Suspendre" : "Réactiver"}
                          </Button>
                        </div>
                      ))}
                      {data.learners.length === 0 && (
                        <EmptyState
                          icon={<GraduationCap className="size-5" />}
                          title="Aucun élève"
                          description="Invitez un élève ou ajoutez un enfant au compte de son parent."
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="classes" className="mt-0 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">Classes</h2>
                    <p className="text-sm text-muted-foreground">
                      Inscrivez les élèves et attribuez les cours à chaque groupe.
                    </p>
                  </div>
                  <Button onClick={() => setClassOpen(true)}>
                    <Plus className="size-4" /> Créer une classe
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.cohorts.map((cohort) => {
                    const learners = activeLearners.filter((learner) =>
                      learner.cohorts.includes(cohort.id),
                    );
                    const courses = data.courseCohorts.filter(
                      (item) => item.cohort_id === cohort.id,
                    );
                    const responsibleTeacher = data.members.find(
                      (member) => member.user_id === cohort.teacher_id,
                    );
                    return (
                      <Card
                        key={cohort.id}
                        className={`border-border/70 shadow-sm transition ${selectedCohortId === cohort.id ? "ring-2 ring-primary/30" : ""}`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                              <School className="size-5" />
                            </div>
                            <Badge variant={cohort.status === "active" ? "secondary" : "outline"}>
                              {cohort.status === "active" ? "Active" : "Brouillon"}
                            </Badge>
                          </div>
                          <h3 className="mt-4 text-lg font-semibold">{cohort.name}</h3>
                          <p className="mt-1 text-xs font-medium text-primary">
                            {responsibleTeacher
                              ? `Professeur · ${personName(responsibleTeacher)}`
                              : "Aucun professeur responsable"}
                          </p>
                          <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                            {cohort.description ||
                              cohort.level ||
                              "Classe prête à accueillir ses élèves."}
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-xl bg-muted/60 p-3">
                              <p className="text-lg font-semibold">
                                {learners.length}
                                {cohort.max_students ? `/${cohort.max_students}` : ""}
                              </p>
                              <p className="text-xs text-muted-foreground">Élèves</p>
                            </div>
                            <div className="rounded-xl bg-muted/60 p-3">
                              <p className="text-lg font-semibold">{courses.length}</p>
                              <p className="text-xs text-muted-foreground">Cours</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button
                              className="w-full"
                              variant="outline"
                              onClick={() => {
                                setSelectedCohortId(cohort.id);
                                setAssignOpen(true);
                              }}
                            >
                              Inscrire
                            </Button>
                            <Button
                              className="flex-1"
                              onClick={() => {
                                setSelectedCohortId(cohort.id);
                                setCourseAssignOpen(true);
                              }}
                            >
                              Attribuer un cours
                            </Button>
                            <Button
                              className="col-span-2 w-full"
                              variant="secondary"
                              onClick={() => {
                                setSelectedCohortId(cohort.id);
                                setTeacherAssignOpen(true);
                              }}
                            >
                              <GraduationCap className="size-4" /> Choisir le professeur
                            </Button>
                          </div>
                          {learners.length > 0 && (
                            <div className="mt-4 border-t pt-4">
                              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                Élèves inscrits
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {learners.slice(0, 4).map((learner) => (
                                  <Badge variant="outline" key={learner.id}>
                                    {learner.full_name}
                                  </Badge>
                                ))}
                                {learners.length > 4 && (
                                  <Badge variant="secondary">+{learners.length - 4}</Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                {data.cohorts.length === 0 && (
                  <EmptyState
                    icon={<School className="size-5" />}
                    title="Créez votre première classe"
                    description="Une classe regroupe les élèves et contrôle les cours auxquels ils ont accès."
                  />
                )}
              </TabsContent>

              <TabsContent value="learning" className="mt-0">
                <PedagogicalAdmin organization={organization} userId={userId} embedded />
              </TabsContent>

              <TabsContent value="notifications" className="mt-0">
                <NotificationCenter organizationId={organization.id} />
              </TabsContent>

              <TabsContent value="shop" className="mt-0">
                <ShopAdmin organizationId={organization.id} userId={userId} />
              </TabsContent>

              <TabsContent value="support" className="mt-0 space-y-5">
                <div>
                  <h2 className="text-xl font-semibold">Demandes de support</h2>
                  <p className="text-sm text-muted-foreground">
                    Prenez en charge les problèmes techniques sans mélanger les échanges
                    pédagogiques.
                  </p>
                </div>
                <AdminSupport organizationId={organization.id} userId={userId} />
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-lg">
          <form onSubmit={(event) => submitAction(event, "invite")}>
            <DialogHeader>
              <DialogTitle>Inviter une personne</DialogTitle>
              <DialogDescription>
                Un compte et ses droits seront préparés. Si l’adresse est nouvelle, Supabase enverra
                l’e-mail d’invitation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <Field label="Nom complet" htmlFor="invite-name">
                <Input id="invite-name" name="fullName" required autoFocus />
              </Field>
              <Field label="Adresse e-mail" htmlFor="invite-email">
                <Input id="invite-email" name="email" type="email" required />
              </Field>
              <Field label="Téléphone (facultatif)" htmlFor="invite-phone">
                <Input id="invite-phone" name="phone" type="tel" />
              </Field>
              <Field label="Rôle" htmlFor="invite-role">
                <NativeSelect id="invite-role" name="role" defaultValue="learner">
                  {inviteRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Classe (facultatif)" htmlFor="invite-cohort">
                <NativeSelect id="invite-cohort" name="cohortId" defaultValue="">
                  <option value="">Aucune classe pour le moment</option>
                  {data?.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={actionMutation.isPending}>
                {actionMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}{" "}
                Envoyer l’invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={managedLearnerOpen} onOpenChange={setManagedLearnerOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <form onSubmit={(event) => submitAction(event, "create_managed_learner")}>
            <DialogHeader>
              <DialogTitle>Ajouter un enfant</DialogTitle>
              <DialogDescription>
                L’enfant n’a pas besoin d’adresse e-mail : son parent accédera à son suivi depuis le
                même compte.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <Field label="Nom complet de l’élève" htmlFor="child-name">
                <Input id="child-name" name="fullName" required autoFocus />
              </Field>
              <Field label="Responsable légal" htmlFor="guardian">
                <NativeSelect id="guardian" name="guardianUserId" defaultValue="">
                  <option value="" disabled>
                    Choisir un compte parent
                  </option>
                  {parentMembers.map((parent) => (
                    <option key={parent.user_id} value={parent.user_id}>
                      {personName(parent)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Classe (facultatif)" htmlFor="child-cohort">
                <NativeSelect id="child-cohort" name="cohortId" defaultValue="">
                  <option value="">Aucune classe</option>
                  {data?.cohorts.map((cohort) => (
                    <option key={cohort.id} value={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {parentMembers.length === 0 && (
              <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Invitez d’abord un utilisateur avec le rôle Parent.
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setManagedLearnerOpen(false)}>
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={actionMutation.isPending || parentMembers.length === 0}
              >
                {actionMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}{" "}
                Ajouter l’élève
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={classOpen} onOpenChange={setClassOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const capacity = Number(form.get("maxStudents"));
              classMutation.mutate({
                name: String(form.get("name") ?? ""),
                code: String(form.get("code") ?? "") || undefined,
                level: String(form.get("level") ?? "") || undefined,
                description: String(form.get("description") ?? "") || undefined,
                maxStudents: Number.isFinite(capacity) && capacity > 0 ? capacity : undefined,
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Créer une classe</DialogTitle>
              <DialogDescription>
                La classe pourra recevoir des élèves, des cours et des rendez-vous en direct.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5">
              <Field label="Nom de la classe" htmlFor="class-name">
                <Input
                  id="class-name"
                  name="name"
                  required
                  autoFocus
                  placeholder="Ex. Adultes — niveau 1"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Code" htmlFor="class-code">
                  <Input id="class-code" name="code" placeholder="ADU-N1" />
                </Field>
                <Field label="Capacité" htmlFor="class-capacity">
                  <Input
                    id="class-capacity"
                    name="maxStudents"
                    type="number"
                    min="1"
                    placeholder="25"
                  />
                </Field>
              </div>
              <Field label="Niveau" htmlFor="class-level">
                <Input id="class-level" name="level" />
              </Field>
              <Field label="Description" htmlFor="class-description">
                <Textarea id="class-description" name="description" rows={3} />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClassOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={classMutation.isPending}>
                {classMutation.isPending && <LoaderCircle className="size-4 animate-spin" />} Créer
                la classe
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <form onSubmit={(event) => submitAction(event, "assign_learner")}>
            <DialogHeader>
              <DialogTitle>Inscrire un élève</DialogTitle>
              <DialogDescription>
                Ajoutez un profil existant à « {selectedCohort?.name ?? "cette classe"} ».
              </DialogDescription>
            </DialogHeader>
            <div className="py-5">
              <Field label="Élève" htmlFor="assign-learner">
                <NativeSelect id="assign-learner" name="learnerId" defaultValue="">
                  <option value="" disabled>
                    Choisir un élève
                  </option>
                  {activeLearners
                    .filter((learner) => !learner.cohorts.includes(selectedCohortId))
                    .map((learner) => (
                      <option key={learner.id} value={learner.id}>
                        {learner.full_name}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={actionMutation.isPending}>
                {actionMutation.isPending && <LoaderCircle className="size-4 animate-spin" />}{" "}
                Confirmer l’inscription
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={courseAssignOpen} onOpenChange={setCourseAssignOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              courseAssignmentMutation.mutate({
                cohortId: selectedCohortId,
                courseId: String(form.get("courseId") ?? ""),
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Attribuer un cours</DialogTitle>
              <DialogDescription>
                Les élèves de « {selectedCohort?.name ?? "cette classe"} » pourront accéder à ce
                cours publié.
              </DialogDescription>
            </DialogHeader>
            <div className="py-5">
              <Field label="Cours" htmlFor="assign-course">
                <NativeSelect id="assign-course" name="courseId" defaultValue="">
                  <option value="" disabled>
                    Choisir un cours
                  </option>
                  {data?.courses
                    .filter(
                      (course) =>
                        !data.courseCohorts.some(
                          (item) =>
                            item.course_id === course.id && item.cohort_id === selectedCohortId,
                        ),
                    )
                    .map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                        {course.status !== "published" ? " — brouillon" : ""}
                      </option>
                    ))}
                </NativeSelect>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCourseAssignOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={courseAssignmentMutation.isPending}>
                {courseAssignmentMutation.isPending && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}{" "}
                Attribuer le cours
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={teacherAssignOpen} onOpenChange={setTeacherAssignOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              teacherAssignmentMutation.mutate({
                cohortId: selectedCohortId,
                teacherId: String(form.get("teacherId") ?? "") || null,
              });
            }}
          >
            <DialogHeader>
              <DialogTitle>Professeur responsable</DialogTitle>
              <DialogDescription>
                Le professeur choisi verra « {selectedCohort?.name ?? "cette classe"} », ses élèves,
                ses cours et leurs résultats dans son espace.
              </DialogDescription>
            </DialogHeader>
            <div className="py-5">
              <Field label="Professeur" htmlFor="assign-teacher">
                <NativeSelect
                  id="assign-teacher"
                  name="teacherId"
                  defaultValue={selectedCohort?.teacher_id ?? ""}
                >
                  <option value="">Aucun professeur</option>
                  {teacherMembers.map((teacher) => (
                    <option key={teacher.user_id} value={teacher.user_id}>
                      {personName(teacher)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            {teacherMembers.length === 0 ? (
              <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Invitez d’abord une personne avec le rôle Professeur.
              </p>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTeacherAssignOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={teacherAssignmentMutation.isPending}>
                {teacherAssignmentMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
