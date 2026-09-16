import {
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  FileUp,
  Filter,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import type { OrganizationBrand, OrganizationRole } from "@/lib/auth/portal-access";
import {
  addAdmissionNote,
  admissionStages,
  csvEscape,
  interpolateTemplate,
  loadAdmissions,
  recommendClasses,
  runAdmissionAction,
  saveAdmissionFilter,
  savePayment,
  stageLabel,
  updateAdmission,
  whatsappUrl,
  type AdmissionApplication,
  type AdmissionData,
  type AdmissionEvent,
  type AdmissionPayment,
  type AdmissionStage,
} from "./admissions-data";

type Props = { organization: OrganizationBrand; role: OrganizationRole; userId: string };

const audienceLabels: Record<string, string> = {
  child: "Enfant · classe mixte",
  teen_female: "Adolescente · filles",
  teen_male: "Adolescent · garçons",
  adult_female: "Adulte · femmes",
  adult_male: "Adulte · hommes",
};
const objectiveLabels: Record<string, string> = {
  arabic_literacy: "Lecture et écriture arabe",
  arabic_language: "Langue arabe",
  quran_tajwid: "Coran et tajwid",
  islamic_studies: "Sciences islamiques",
  advanced_texts: "Textes avancés",
};
const levelLabels: Record<string, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
  unsure: "À évaluer",
};
const paymentLabels: Record<string, string> = {
  not_requested: "Non demandé",
  requested: "Demandé",
  partial: "Partiel",
  paid: "Payé",
  cancelled: "Annulé",
  refunded: "Remboursé",
};

function SelectField({
  id,
  value,
  onChange,
  children,
  label,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="grid gap-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
      >
        {children}
      </select>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  help,
}: {
  label: string;
  value: number | string;
  icon: ReactNode;
  help: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{help}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Non planifiée";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function AdmissionsWorkspace({ organization, role, userId }: Props) {
  const client = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const queryKey = ["admissions", organization.id, userId];
  const query = useQuery({ queryKey, queryFn: () => loadAdmissions(organization.id, userId) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("active");
  const [audience, setAudience] = useState("all");
  const [payment, setPayment] = useState("all");
  const [owner, setOwner] = useState("all");
  const [note, setNote] = useState("");
  const [messageOpen, setMessageOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [importName, setImportName] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = () => client.invalidateQueries({ queryKey });
  const mutation = useMutation({
    mutationFn: (job: () => Promise<unknown>) => job(),
    onSuccess: async () => {
      await refresh();
      toast.success("Modification enregistrée.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Action impossible."),
  });
  const data = query.data;
  const selected = data?.applications.find((item) => item.id === selectedId) ?? null;
  const selectedCohort = data?.cohorts.find((item) => item.id === selected?.proposed_cohort_id);

  const filtered = useMemo(
    () =>
      (data?.applications ?? []).filter((item) => {
        const haystack =
          `${item.applicant_name} ${item.learner_name} ${item.email} ${item.phone}`.toLowerCase();
        return (
          haystack.includes(search.toLowerCase()) &&
          (stage === "all" ||
            (stage === "active" ? item.status !== "closed" : item.status === stage)) &&
          (audience === "all" || item.audience === audience) &&
          (payment === "all" || item.payment_status === payment) &&
          (owner === "all" ||
            (owner === "unassigned" ? !item.assigned_to : item.assigned_to === owner))
        );
      }),
    [data, search, stage, audience, payment, owner],
  );

  const stats = useMemo(() => {
    const applications = data?.applications ?? [];
    const today = new Date().toDateString();
    const contacted = applications.filter((item) => item.first_contacted_at);
    const average = contacted.length
      ? Math.round(
          contacted.reduce(
            (sum, item) =>
              sum +
              (new Date(item.first_contacted_at!).getTime() - new Date(item.created_at).getTime()),
            0,
          ) /
            contacted.length /
            3600000,
        )
      : 0;
    return {
      new: applications.filter((item) => item.status === "new").length,
      due: applications.filter(
        (item) => item.follow_up_at && new Date(item.follow_up_at).toDateString() === today,
      ).length,
      unassigned: applications.filter((item) => !item.assigned_to && item.status !== "closed")
        .length,
      assessments: applications.filter((item) => item.status === "assessment_required").length,
      payments: applications.filter((item) =>
        ["requested", "partial"].includes(item.payment_status),
      ).length,
      firstLogin: applications.filter(
        (item) =>
          ["access_sent", "first_login_check"].includes(item.status) &&
          !item.first_login_verified_at,
      ).length,
      converted: applications.length
        ? Math.round(
            (applications.filter((item) =>
              ["confirmed", "access_sent", "first_login_check"].includes(item.status),
            ).length /
              applications.length) *
              100,
          )
        : 0,
      average,
    };
  }, [data]);

  const canFinance = ["owner", "admin", "accounting"].includes(role);
  const canConfirm = ["owner", "admin", "class_manager"].includes(role);
  const canExport = ["owner", "admin", "commercial"].includes(role);

  function exportCsv() {
    if (!data || !canExport) return;
    const header = [
      "demande",
      "élève",
      "email",
      "téléphone",
      "étape",
      "public",
      "paiement",
      "créée le",
    ];
    const rows = filtered.map((item) => [
      item.applicant_name,
      item.learner_name,
      item.email,
      item.phone,
      stageLabel[item.status as AdmissionStage],
      audienceLabels[item.audience],
      paymentLabels[item.payment_status],
      item.created_at,
    ]);
    const blob = new Blob(
      [[header, ...rows].map((row) => row.map(csvEscape).join(";")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function readCsv(file: File) {
    file
      .text()
      .then((text) => {
        const lines = text.split(/\r?\n/).filter(Boolean);
        const headers = (lines.shift() ?? "")
          .split(/[;,]/)
          .map((item) => item.trim().toLowerCase());
        const rows = lines.map((line) =>
          Object.fromEntries(
            line.split(/[;,]/).map((value, index) => [headers[index], value.trim()]),
          ),
        );
        setImportName(file.name);
        setImportRows(rows);
        setImportOpen(true);
      })
      .catch(() => toast.error("Ce fichier CSV ne peut pas être lu."));
  }

  if (query.isLoading)
    return (
      <div className="mx-auto max-w-7xl space-y-4 p-5">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (query.error || !data)
    return (
      <div className="mx-auto max-w-xl p-6">
        <Empty
          title="Impossible de charger les inscriptions"
          text="Vérifiez votre connexion et vos droits, puis réessayez."
        />
        <Button className="mt-4 w-full" onClick={() => query.refetch()}>
          <RefreshCw /> Réessayer
        </Button>
      </div>
    );

  const events = selected ? data.events.filter((item) => item.application_id === selected.id) : [];
  const existingPayment = selected
    ? data.payments.find((item) => item.application_id === selected.id)
    : undefined;
  const messageTemplate =
    data.templates.find((item) => item.id === templateId) ?? data.templates[0];
  const preparedMessage =
    selected && messageTemplate
      ? interpolateTemplate(messageTemplate.body, selected, selectedCohort)
      : "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild size="icon" variant="ghost">
              <Link to="/admin" aria-label="Retour à l’administration">
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <p className="truncate font-semibold">Inscriptions</p>
              <p className="text-xs text-muted-foreground">{organization.name}</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Se déconnecter"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/auth?portal=admissions");
            }}
          >
            <LogOut />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="secondary" className="rounded-full">
              Admission
            </Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Qui faut-il aider maintenant ?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Une vue simple, de la première demande à l’accès élève.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              className="hidden"
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => event.target.files?.[0] && readCsv(event.target.files[0])}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <FileUp /> Importer
            </Button>
            {canExport && (
              <Button variant="outline" onClick={exportCsv}>
                <Download /> Exporter
              </Button>
            )}
          </div>
        </div>
        <section
          className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8"
          aria-label="Indicateurs"
        >
          <Metric label="Nouvelles" value={stats.new} icon={<Users />} help="À prendre en charge" />
          <Metric label="Relances" value={stats.due} icon={<Clock3 />} help="À faire aujourd’hui" />
          <Metric
            label="Sans responsable"
            value={stats.unassigned}
            icon={<UserCheck />}
            help="À assigner"
          />
          <Metric
            label="Évaluations"
            value={stats.assessments}
            icon={<ClipboardCheck />}
            help="À programmer"
          />
          <Metric
            label="Paiements"
            value={stats.payments}
            icon={<CircleDollarSign />}
            help="En attente"
          />
          <Metric
            label="Accès"
            value={stats.firstLogin}
            icon={<Send />}
            help="Connexion à vérifier"
          />
          <Metric
            label="Conversion"
            value={`${stats.converted}%`}
            icon={<CheckCircle2 />}
            help="Demandes confirmées"
          />
          <Metric
            label="1er contact"
            value={`${stats.average} h`}
            icon={<CalendarClock />}
            help="Délai moyen"
          />
        </section>

        <Tabs defaultValue="inbox" className="mt-6">
          <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-2xl p-1 sm:w-fit">
            <TabsTrigger className="min-h-11 rounded-xl" value="inbox">
              Boîte de réception
            </TabsTrigger>
            <TabsTrigger className="min-h-11 rounded-xl" value="payments">
              Paiements
            </TabsTrigger>
            <TabsTrigger className="min-h-11 rounded-xl" value="capacity">
              Capacité des classes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="inbox" className="mt-4">
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="relative">
                    <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                    <Input
                      className="h-11 rounded-xl pl-9"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Nom, e-mail, téléphone…"
                    />
                  </div>
                  <SelectField id="stage" value={stage} onChange={setStage}>
                    <option value="active">Demandes actives</option>
                    <option value="all">Toutes les étapes</option>
                    {admissionStages.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField id="audience" value={audience} onChange={setAudience}>
                    <option value="all">Tous les publics</option>
                    {Object.entries(audienceLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField id="owner" value={owner} onChange={setOwner}>
                    <option value="all">Tous les responsables</option>
                    <option value="unassigned">Sans responsable</option>
                    {data.managers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField id="payment" value={payment} onChange={setPayment}>
                    <option value="all">Tous les paiements</option>
                    {Object.entries(paymentLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSearch("");
                      setStage("active");
                      setAudience("all");
                      setOwner("all");
                      setPayment("all");
                    }}
                  >
                    <Filter /> Réinitialiser
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      mutation.mutate(() =>
                        saveAdmissionFilter(
                          organization.id,
                          userId,
                          `Vue ${new Date().toLocaleDateString("fr-FR")}`,
                          { stage, audience, owner, payment },
                        ),
                      )
                    }
                  >
                    Enregistrer les filtres
                  </Button>
                  {data.savedFilters.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {data.savedFilters.length} vue(s) enregistrée(s)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {bulkIds.length > 0 && (
              <div className="sticky top-16 z-20 mt-3 flex flex-wrap items-center gap-2 rounded-2xl border bg-background p-3 shadow-lg">
                <Badge>{bulkIds.length} sélectionnée(s)</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutation.mutate(async () => {
                      if (!window.confirm(`Assigner ${bulkIds.length} demande(s) à vous-même ?`))
                        return;
                      await Promise.all(
                        bulkIds.map((id) => updateAdmission(id, { assigned_to: userId })),
                      );
                      setBulkIds([]);
                    })
                  }
                >
                  M’assigner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutation.mutate(async () => {
                      if (
                        !window.confirm(`Passer ${bulkIds.length} demande(s) à « À contacter » ?`)
                      )
                        return;
                      await Promise.all(
                        bulkIds.map((id) => updateAdmission(id, { status: "to_contact" })),
                      );
                      setBulkIds([]);
                    })
                  }
                >
                  Passer à « À contacter »
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBulkIds([])}>
                  Annuler
                </Button>
              </div>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Demandes ({filtered.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0">
                  {filtered.length === 0 ? (
                    <Empty
                      title="Aucune demande ici"
                      text="Modifiez les filtres ou attendez une nouvelle demande depuis le parcours public."
                    />
                  ) : (
                    filtered.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`flex min-h-20 w-full items-center gap-3 rounded-2xl border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30 ${selectedId === item.id ? "border-primary bg-primary/5" : "border-border/70"}`}
                      >
                        <Checkbox
                          checked={bulkIds.includes(item.id)}
                          onCheckedChange={(checked) =>
                            setBulkIds((current) =>
                              checked
                                ? [...current, item.id]
                                : current.filter((id) => id !== item.id),
                            )
                          }
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Sélectionner ${item.applicant_name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">
                              {item.learner_name || item.applicant_name}
                            </p>
                            {item.priority === "urgent" && (
                              <Badge variant="destructive">Urgent</Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.applicant_name} · {audienceLabels[item.audience] ?? item.audience}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            <Badge variant="outline">
                              {stageLabel[item.status as AdmissionStage] ?? item.status}
                            </Badge>
                            {!item.assigned_to && (
                              <Badge variant="secondary">Sans responsable</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/70">
                <CardContent className="p-4 sm:p-6">
                  {selected ? (
                    <RequestDetail
                      application={selected}
                      data={data}
                      events={events}
                      role={role}
                      userId={userId}
                      mutation={mutation}
                      setNote={setNote}
                      note={note}
                      onMessage={() => {
                        setTemplateId(data.templates[0]?.id ?? "");
                        setMessageOpen(true);
                      }}
                      onPayment={() => setPaymentOpen(true)}
                      onConfirm={() => setConfirmOpen(true)}
                    />
                  ) : (
                    <Empty
                      title="Choisissez une demande"
                      text="La fiche complète s’affichera ici sans vous faire perdre vos filtres."
                    />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {data.payments.length === 0 ? (
                  <Empty
                    title="Aucun paiement suivi"
                    text="Ajoutez un suivi depuis la fiche d’une demande. Aucun numéro de carte n’est stocké."
                  />
                ) : (
                  <div className="grid gap-2">
                    {data.payments.map((item) => {
                      const app = data.applications.find(
                        (application) => application.id === item.application_id,
                      );
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedId(item.application_id);
                            setPaymentOpen(true);
                          }}
                          className="flex min-h-16 items-center justify-between rounded-xl border p-3 text-left"
                        >
                          <div>
                            <p className="font-medium">
                              {app?.learner_name || app?.applicant_name || "Demande"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Échéance : {item.due_on || "non définie"}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={item.status === "paid" ? "default" : "secondary"}>
                              {paymentLabels[item.status]}
                            </Badge>
                            <p className="mt-1 text-sm">
                              {(item.received_amount_cents / 100).toFixed(2)} € /{" "}
                              {(item.expected_amount_cents / 100).toFixed(2)} €
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="capacity" className="mt-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {data.cohorts.length === 0 ? (
                <div className="md:col-span-2 lg:col-span-3">
                  <Empty
                    title="Aucune classe active"
                    text="Créez et ouvrez une classe dans « Classes et planning » avant de proposer une place."
                  />
                </div>
              ) : (
                data.cohorts.map((item) => {
                  const count = data.activeCounts[item.id] ?? 0;
                  const remaining =
                    item.max_students == null ? null : Math.max(item.max_students - count, 0);
                  return (
                    <Card key={item.id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between gap-2">
                          <p className="font-semibold">{item.name}</p>
                          <Badge variant={remaining === 0 ? "destructive" : "secondary"}>
                            {item.enrollment_status}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {audienceLabels[item.audience ?? ""] ?? "Public à confirmer"}
                        </p>
                        <p className="mt-4 text-2xl font-semibold">
                          {count}
                          {item.max_students ? ` / ${item.max_students}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {remaining == null
                            ? "Capacité non limitée"
                            : `${remaining} place(s) restante(s)`}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Préparer un message</DialogTitle>
            <DialogDescription>
              Le message n’est jamais envoyé automatiquement. Relisez-le avant d’ouvrir WhatsApp ou
              de le copier.
            </DialogDescription>
          </DialogHeader>
          <SelectField
            id="template"
            label="Modèle"
            value={messageTemplate?.id ?? ""}
            onChange={setTemplateId}
          >
            {data.templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </SelectField>
          <Textarea readOnly value={preparedMessage} className="min-h-40" />
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(preparedMessage);
                toast.success("Message copié.");
              }}
            >
              <Copy /> Copier
            </Button>
            {selected?.phone && (
              <Button asChild>
                <a
                  href={whatsappUrl(selected.phone, preparedMessage)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle /> Ouvrir WhatsApp
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        payment={existingPayment}
        disabled={!canFinance}
        onSave={(values: {
          expected: number;
          received: number;
          dueOn: string;
          method: string;
          reference: string;
          status: string;
        }) =>
          selected &&
          mutation.mutate(() =>
            savePayment(organization.id, userId, selected.id, selected.proposed_cohort_id, values),
          )
        }
      />
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer l’inscription</DialogTitle>
            <DialogDescription>
              Cette action vérifie les doublons, crée ou rattache le bon compte, inscrit l’élève
              dans la classe et enregistre l’opération. Pour un enfant, le compte du parent est
              utilisé.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <p>
                <strong>Élève :</strong> {selected.learner_name || selected.applicant_name}
              </p>
              <p>
                <strong>Classe :</strong> {selectedCohort?.name || "Aucune classe proposée"}
              </p>
              <p>
                <strong>Accès :</strong> envoyé par e-mail après votre confirmation
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={!canConfirm || !selected?.proposed_cohort_id}
              onClick={() =>
                selected &&
                mutation.mutate(async () => {
                  await runAdmissionAction({
                    action: "confirm_admission",
                    organizationId: organization.id,
                    applicationId: selected.id,
                    sendAccess: true,
                  });
                  setConfirmOpen(false);
                })
              }
            >
              <CheckCircle2 /> Confirmer et envoyer l’accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévisualiser l’import CSV</DialogTitle>
            <DialogDescription>
              {importName} · {importRows.length} ligne(s). Colonnes attendues : nom, élève, email,
              téléphone, public, objectif, niveau, disponibilité, langue.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="p-2 text-left">Nom</th>
                  <th className="p-2 text-left">E-mail</th>
                  <th className="p-2 text-left">Public</th>
                </tr>
              </thead>
              <tbody>
                {importRows.slice(0, 50).map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{row.nom || row.demandeur || "—"}</td>
                    <td className="p-2">{row.email || "—"}</td>
                    <td className="p-2">{row.public || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Les doublons récents sont écartés côté serveur. Aucune invitation ni communication ne
            part pendant l’import.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Annuler
            </Button>
            <Button
              disabled={importRows.length === 0}
              onClick={() =>
                mutation.mutate(async () => {
                  await runAdmissionAction({
                    action: "import_admissions",
                    organizationId: organization.id,
                    fileName: importName,
                    rows: importRows,
                  });
                  setImportOpen(false);
                  setImportRows([]);
                })
              }
            >
              <FileUp /> Confirmer l’import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type JobMutation = UseMutationResult<unknown, Error, () => Promise<unknown>, unknown>;

function RequestDetail({
  application,
  data,
  events,
  role,
  userId,
  mutation,
  note,
  setNote,
  onMessage,
  onPayment,
  onConfirm,
}: {
  application: AdmissionApplication;
  data: AdmissionData;
  events: AdmissionEvent[];
  role: OrganizationRole;
  userId: string;
  mutation: JobMutation;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  onMessage: () => void;
  onPayment: () => void;
  onConfirm: () => void;
}) {
  const matching = useQuery({
    queryKey: ["admission-matching", application.id],
    queryFn: () => recommendClasses(application.id),
  });
  const proposed = data.cohorts.find((item) => item.id === application.proposed_cohort_id);
  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Badge variant="outline">{stageLabel[application.status as AdmissionStage]}</Badge>
            <h2 className="mt-2 text-xl font-semibold">
              {application.learner_name || application.applicant_name}
            </h2>
            <p className="text-sm text-muted-foreground">Demande de {application.applicant_name}</p>
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal />
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a
            className="min-h-11 rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            href={`mailto:${application.email}`}
          >
            {application.email}
          </a>
          <a
            className="min-h-11 rounded-xl border px-3 py-2 text-sm hover:bg-muted"
            href={`tel:${application.phone}`}
          >
            {application.phone}
          </a>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          id="detail-stage"
          label="Étape actuelle"
          value={application.status}
          onChange={(value) => {
            if (value === "closed") {
              const reason = window.prompt(
                "Indiquez le motif du refus, de l’abandon ou du report :",
              );
              if (!reason?.trim()) return;
              const outcome = window.confirm(
                "S’agit-il d’un report ? Cliquez sur Annuler pour enregistrer un refus ou abandon.",
              )
                ? "postponed"
                : "withdrawn";
              mutation.mutate(() =>
                updateAdmission(application.id, {
                  status: value,
                  close_outcome: outcome,
                  close_reason: reason.trim(),
                }),
              );
              return;
            }
            mutation.mutate(() =>
              updateAdmission(application.id, {
                status: value,
                first_contacted_at:
                  value === "contacted" && !application.first_contacted_at
                    ? new Date().toISOString()
                    : application.first_contacted_at,
              }),
            );
          }}
        >
          {admissionStages.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          id="detail-owner"
          label="Responsable"
          value={application.assigned_to ?? ""}
          onChange={(value) =>
            mutation.mutate(() => updateAdmission(application.id, { assigned_to: value || null }))
          }
        >
          <option value="">Sans responsable</option>
          {data.managers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </SelectField>
        <div className="grid gap-1.5">
          <Label htmlFor="next-action">Prochaine action</Label>
          <Input
            id="next-action"
            defaultValue={application.next_action ?? ""}
            onBlur={(event) =>
              event.target.value !== (application.next_action ?? "") &&
              mutation.mutate(() =>
                updateAdmission(application.id, { next_action: event.target.value || null }),
              )
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="follow-up">Date de relance</Label>
          <Input
            id="follow-up"
            type="datetime-local"
            defaultValue={application.follow_up_at?.slice(0, 16) ?? ""}
            onBlur={(event) =>
              mutation.mutate(() =>
                updateAdmission(application.id, {
                  follow_up_at: event.target.value
                    ? new Date(event.target.value).toISOString()
                    : null,
                }),
              )
            }
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="birth-date">Date de naissance de l’élève</Label>
          <Input
            id="birth-date"
            type="date"
            defaultValue={application.learner_birth_date ?? ""}
            onBlur={(event) =>
              event.target.value !== (application.learner_birth_date ?? "") &&
              mutation.mutate(() =>
                updateAdmission(application.id, { learner_birth_date: event.target.value || null }),
              )
            }
          />
          <p className="text-xs text-muted-foreground">
            Nécessaire avant l’inscription pour vérifier l’âge et la non-mixité.
          </p>
        </div>
        <SelectField
          id="priority"
          label="Priorité"
          value={application.priority}
          onChange={(value) =>
            mutation.mutate(() => updateAdmission(application.id, { priority: value }))
          }
        >
          <option value="low">Basse</option>
          <option value="normal">Normale</option>
          <option value="high">Haute</option>
          <option value="urgent">Urgente</option>
        </SelectField>
      </div>
      <div className="rounded-2xl bg-muted/40 p-4">
        <h3 className="font-semibold">Profil et besoin</h3>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Public et mixité</dt>
            <dd className="font-medium">{audienceLabels[application.audience]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Objectif</dt>
            <dd className="font-medium">
              {objectiveLabels[application.objective] ?? application.objective}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Niveau</dt>
            <dd className="font-medium">{levelLabels[application.level] ?? application.level}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Disponibilité</dt>
            <dd className="font-medium">{application.availability}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Langue</dt>
            <dd className="font-medium">{application.accompaniment_language}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contact préféré</dt>
            <dd className="font-medium">{application.preferred_contact}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Consentement</dt>
            <dd className="font-medium">
              {application.privacy_consent
                ? `Recueilli le ${formatDate(application.consent_at || application.created_at)}`
                : "Non recueilli"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="font-medium">{application.source}</dd>
          </div>
        </dl>
        {application.notes && (
          <p className="mt-3 rounded-xl bg-background p-3 text-sm">{application.notes}</p>
        )}
      </div>
      <section>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">Classes compatibles</h3>
          {proposed && <Badge>Proposée : {proposed.name}</Badge>}
        </div>
        {matching.isLoading ? (
          <Skeleton className="mt-3 h-24" />
        ) : matching.data?.length ? (
          <div className="mt-3 grid gap-2">
            {matching.data.slice(0, 4).map((item) => (
              <div
                key={item.cohort_id}
                className={`rounded-xl border p-3 ${item.recommended ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{item.cohort_name}</p>
                  <Badge variant={item.recommended ? "default" : "secondary"}>
                    {item.score} points
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-emerald-700">{item.reasons.join(" · ")}</p>
                {item.exclusions.length > 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    À vérifier : {item.exclusions.join(" · ")}
                  </p>
                )}
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutation.mutate(() =>
                      updateAdmission(application.id, {
                        proposed_cohort_id: item.cohort_id,
                        status: "proposal_sent",
                        next_action: "Faire valider la proposition",
                      }),
                    )
                  }
                >
                  Proposer cette classe
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3">
            <Empty
              title="Aucune classe à proposer"
              text="Les classes fermées, complètes ou incompatibles restent expliquées lorsqu’elles existent. Créez une classe adaptée dans le planning si nécessaire."
            />
          </div>
        )}
      </section>
      <div className="grid grid-cols-2 gap-2">
        <Button className="min-h-11" variant="outline" onClick={onMessage}>
          <MessageCircle /> Préparer un message
        </Button>
        <Button className="min-h-11" variant="outline" onClick={onPayment}>
          <CircleDollarSign /> Suivre le paiement
        </Button>
        <Button
          className="col-span-2 min-h-11"
          disabled={
            !application.proposed_cohort_id || !["owner", "admin", "class_manager"].includes(role)
          }
          onClick={onConfirm}
        >
          <CheckCircle2 /> Confirmer l’inscription
        </Button>
      </div>
      <section>
        <h3 className="font-semibold">Note interne</h3>
        <div className="mt-2 flex gap-2">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Information utile à l’équipe…"
          />
          <Button
            className="self-end"
            onClick={() =>
              mutation.mutate(async () => {
                await addAdmissionNote(application, userId, note);
                setNote("");
              })
            }
          >
            Ajouter
          </Button>
        </div>
      </section>
      <section>
        <h3 className="font-semibold">Historique</h3>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Aucun changement enregistré.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {events.slice(0, 12).map((event) => (
              <li key={event.id} className="border-l-2 border-primary/20 pl-3">
                <p className="text-sm font-medium">{event.summary}</p>
                <p className="text-xs text-muted-foreground">{formatDate(event.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

type PaymentValues = {
  expected: number;
  received: number;
  dueOn: string;
  method: string;
  reference: string;
  status: string;
};

function PaymentDialog({
  open,
  onOpenChange,
  payment,
  disabled,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: AdmissionPayment;
  disabled: boolean;
  onSave: (values: PaymentValues) => void;
}) {
  const [expected, setExpected] = useState("");
  const [received, setReceived] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState("not_requested");
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value && payment) {
          setExpected(String(payment.expected_amount_cents / 100));
          setReceived(String(payment.received_amount_cents / 100));
          setDueOn(payment.due_on ?? "");
          setMethod(payment.payment_method ?? "");
          setReference(payment.payment_reference ?? "");
          setStatus(payment.status);
        }
        onOpenChange(value);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suivi administratif du paiement</DialogTitle>
          <DialogDescription>
            Aucune donnée de carte bancaire n’est demandée ni stockée.
          </DialogDescription>
        </DialogHeader>
        {disabled ? (
          <Empty
            title="Accès financier limité"
            text="Seuls la comptabilité, la direction et les administrateurs peuvent modifier ces informations."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="expected">Montant attendu (€)</Label>
              <Input
                id="expected"
                type="number"
                min="0"
                step="0.01"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="received">Montant reçu (€)</Label>
              <Input
                id="received"
                type="number"
                min="0"
                step="0.01"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="due">Échéance</Label>
              <Input
                id="due"
                type="date"
                value={dueOn}
                onChange={(e) => setDueOn(e.target.value)}
              />
            </div>
            <SelectField id="pay-status" label="Statut" value={status} onChange={setStatus}>
              {Object.entries(paymentLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField id="method" label="Moyen" value={method} onChange={setMethod}>
              <option value="">Non précisé</option>
              <option value="bank_transfer">Virement</option>
              <option value="cash">Espèces</option>
              <option value="cheque">Chèque</option>
              <option value="card_external">Carte via un service externe</option>
              <option value="other">Autre</option>
            </SelectField>
            <div>
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              onSave({
                expected: Number(expected || 0),
                received: Number(received || 0),
                dueOn,
                method,
                reference,
                status,
              });
              onOpenChange(false);
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
