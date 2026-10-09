import { useEffect, useMemo, useState, type DragEvent, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, GripVertical, LoaderCircle, Pencil, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  loadEditorialCatalog,
  saveEditorialOrder,
  stringList,
  updateEditorialChapter,
  updateEditorialLesson,
  updateEditorialSession,
  type EditorialCatalog,
  type EditorialChapter,
  type EditorialLesson,
  type EditorialSession,
  type EditorialStatus,
} from "./editorial-data";

type EditTarget =
  | { kind: "chapter"; item: EditorialChapter }
  | { kind: "lesson"; item: EditorialLesson }
  | { kind: "session"; item: EditorialSession }
  | null;
type DragItem = { kind: "chapter" | "lesson" | "session"; id: string; parentId: string };

const statusLabel: Record<string, string> = {
  draft: "Brouillon",
  review: "En révision",
  published: "Publié",
  archived: "Archivé",
};

function moveBefore(ids: string[], draggedId: string, targetId: string): string[] {
  if (draggedId === targetId) return ids;
  const next = ids.filter((id) => id !== draggedId);
  const index = next.indexOf(targetId);
  next.splice(index < 0 ? next.length : index, 0, draggedId);
  return next;
}

function SelectField({
  id,
  label,
  defaultValue,
  children,
  onChange,
}: {
  id: string;
  label: string;
  defaultValue: string;
  children: React.ReactNode;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        onChange={(event) => onChange?.(event.target.value)}
        className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
      >
        {children}
      </select>
    </div>
  );
}

function EditDialog({
  target,
  catalog,
  pending,
  onClose,
  onSubmit,
}: {
  target: EditTarget;
  catalog: EditorialCatalog;
  pending: boolean;
  onClose: () => void;
  onSubmit: (target: NonNullable<EditTarget>, form: FormData) => void;
}) {
  const initialChapterId =
    target?.kind === "session"
      ? (catalog.lessons.find((lesson) => lesson.id === target.item.lesson_id)?.chapter_id ?? "")
      : "";
  const [chapterId, setChapterId] = useState(initialChapterId);
  useEffect(() => setChapterId(initialChapterId), [initialChapterId, target]);
  if (!target) return null;
  const item = target.item;
  const lessons = catalog.lessons.filter((lesson) => lesson.chapter_id === chapterId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(target as NonNullable<EditTarget>, new FormData(event.currentTarget));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              Modifier{" "}
              {target.kind === "session"
                ? "la séance"
                : target.kind === "lesson"
                  ? "la leçon"
                  : "le chapitre"}
            </DialogTitle>
            <DialogDescription>
              Les identifiants, ressources, quiz et progressions restent protégés.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            {target.kind === "session" && target.item.source_title ? (
              <div className="rounded-xl bg-muted p-3 text-sm">
                <span className="font-semibold">Titre source :</span> {target.item.source_title}
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="title">Titre public</Label>
              <Input id="title" name="title" required defaultValue={item.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={
                  target.kind === "chapter"
                    ? (target.item.description ?? "")
                    : (target.item.summary ?? "")
                }
              />
            </div>
            {target.kind === "session" ? (
              <>
                <SelectField
                  id="chapter_id"
                  label="Chapitre"
                  defaultValue={chapterId}
                  onChange={setChapterId}
                >
                  {catalog.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </SelectField>
                <SelectField id="lesson_id" label="Leçon" defaultValue={target.item.lesson_id}>
                  {lessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.title}
                    </option>
                  ))}
                </SelectField>
                <div className="grid gap-2">
                  <Label htmlFor="learning_points">Points à retenir (un par ligne)</Label>
                  <Textarea
                    id="learning_points"
                    name="learning_points"
                    rows={5}
                    defaultValue={stringList(target.item.learning_points).join("\n")}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reflection_questions">Questions à se poser (une par ligne)</Label>
                  <Textarea
                    id="reflection_questions"
                    name="reflection_questions"
                    rows={5}
                    defaultValue={stringList(target.item.reflection_questions).join("\n")}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="duration_minutes">Durée (minutes)</Label>
                    <Input
                      id="duration_minutes"
                      name="duration_minutes"
                      type="number"
                      min="1"
                      defaultValue={target.item.duration_minutes ?? ""}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="order_index">Ordre</Label>
                    <Input
                      id="order_index"
                      name="order_index"
                      type="number"
                      min="0"
                      required
                      defaultValue={target.item.order_index}
                    />
                  </div>
                </div>
              </>
            ) : target.kind === "lesson" ? (
              <>
                <SelectField
                  id="chapter_id"
                  label="Chapitre"
                  defaultValue={target.item.chapter_id ?? ""}
                >
                  {catalog.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </SelectField>
                <div className="grid gap-2">
                  <Label htmlFor="order_index">Ordre</Label>
                  <Input
                    id="order_index"
                    name="order_index"
                    type="number"
                    min="0"
                    required
                    defaultValue={target.item.order_index ?? 0}
                  />
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="order_index">Ordre</Label>
                <Input
                  id="order_index"
                  name="order_index"
                  type="number"
                  min="0"
                  required
                  defaultValue={target.item.order_index}
                />
              </div>
            )}
            <SelectField id="status" label="Publication" defaultValue={item.status}>
              <option value="draft">Brouillon</option>
              <option value="published">Publié</option>
              <option value="archived">Archivé</option>
            </SelectField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DragRow({
  item,
  title,
  subtitle,
  status,
  number,
  onDragStart,
  onDrop,
  onEdit,
}: {
  item: DragItem;
  title: string;
  subtitle?: string;
  status: string;
  number: number;
  onDragStart: (item: DragItem) => void;
  onDrop: (item: DragItem) => void;
  onEdit: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item)}
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={() => onDrop(item)}
      className="flex min-h-14 items-center gap-3 rounded-xl border bg-background px-3 py-2 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground"
        aria-label={`Déplacer ${title}`}
      >
        <GripVertical className="size-5" />
      </button>
      <span className="w-16 shrink-0 text-xs font-bold tabular-nums text-primary">
        {item.kind === "session"
          ? `Cours ${String(number).padStart(2, "0")}`
          : String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <Badge variant={status === "published" ? "default" : "secondary"}>
        {statusLabel[status] ?? status}
      </Badge>
      <Button type="button" size="sm" variant="outline" onClick={onEdit}>
        <Pencil className="size-4" /> <span className="hidden sm:inline">Modifier</span>
      </Button>
    </div>
  );
}

export function EditorialBookEditor({ organizationId }: { organizationId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ["editorial-catalog", organizationId] as const;
  const query = useQuery({ queryKey, queryFn: () => loadEditorialCatalog(organizationId) });
  const [bookId, setBookId] = useState("");
  const [chapterOrder, setChapterOrder] = useState<string[]>([]);
  const [lessonOrders, setLessonOrders] = useState<Record<string, string[]>>({});
  const [sessionOrder, setSessionOrder] = useState<string[]>([]);
  const [dragged, setDragged] = useState<DragItem | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);

  const catalog = query.data;
  const selectedBookId = bookId || catalog?.books[0]?.id || "";
  const bookChapters = useMemo(
    () => (catalog?.chapters ?? []).filter((chapter) => chapter.book_id === selectedBookId),
    [catalog, selectedBookId],
  );
  const bookChapterIds = useMemo(
    () => new Set(bookChapters.map((chapter) => chapter.id)),
    [bookChapters],
  );
  const bookLessons = useMemo(
    () =>
      (catalog?.lessons ?? []).filter((lesson) =>
        Boolean(lesson.chapter_id && bookChapterIds.has(lesson.chapter_id)),
      ),
    [catalog, bookChapterIds],
  );
  const bookLessonIds = useMemo(
    () => new Set(bookLessons.map((lesson) => lesson.id)),
    [bookLessons],
  );
  const bookSessions = useMemo(
    () => (catalog?.sessions ?? []).filter((session) => bookLessonIds.has(session.lesson_id)),
    [catalog, bookLessonIds],
  );

  useEffect(() => {
    setChapterOrder(
      [...bookChapters].sort((a, b) => a.order_index - b.order_index).map((item) => item.id),
    );
    setLessonOrders(
      Object.fromEntries(
        bookChapters.map((chapter) => [
          chapter.id,
          bookLessons
            .filter((lesson) => lesson.chapter_id === chapter.id)
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((item) => item.id),
        ]),
      ),
    );
    setSessionOrder(
      [...bookSessions].sort((a, b) => a.order_index - b.order_index).map((item) => item.id),
    );
  }, [selectedBookId, bookChapters, bookLessons, bookSessions]);

  const refresh = async () => queryClient.invalidateQueries({ queryKey });
  const saveOrder = useMutation({
    mutationFn: async (kind: "chapters" | "lessons" | "sessions") => {
      if (kind === "chapters") return saveEditorialOrder(kind, chapterOrder);
      if (kind === "sessions") return saveEditorialOrder(kind, sessionOrder);
      await Promise.all(Object.values(lessonOrders).map((ids) => saveEditorialOrder(kind, ids)));
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Ordre éditorial enregistré.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Ordre non enregistré."),
  });
  const edit = useMutation({
    mutationFn: async ({ target, form }: { target: NonNullable<EditTarget>; form: FormData }) => {
      const title = String(form.get("title") ?? "").trim();
      const description = String(form.get("description") ?? "").trim() || null;
      const status = String(form.get("status")) as EditorialStatus;
      const order_index = Number(form.get("order_index")) || 0;
      if (target.kind === "chapter")
        return updateEditorialChapter(target.item.id, { title, description, status, order_index });
      if (target.kind === "lesson")
        return updateEditorialLesson(target.item.id, {
          title,
          summary: description,
          status,
          order_index,
          chapter_id: String(form.get("chapter_id")),
        });
      const lines = (name: string) =>
        String(form.get(name) ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
      const duration = Number(form.get("duration_minutes"));
      return updateEditorialSession(target.item.id, {
        title,
        summary: description,
        status,
        order_index,
        lesson_id: String(form.get("lesson_id")),
        duration_minutes: Number.isFinite(duration) && duration > 0 ? duration : null,
        learning_points: lines("learning_points"),
        reflection_questions: lines("reflection_questions"),
      });
    },
    onSuccess: async () => {
      setEditTarget(null);
      await refresh();
      toast.success("Contenu éditorial enregistré.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Modification impossible."),
  });

  function drop(target: DragItem) {
    if (!dragged || dragged.kind !== target.kind) return;
    if (target.kind === "chapter" && dragged.parentId === target.parentId)
      setChapterOrder((ids) => moveBefore(ids, dragged.id, target.id));
    if (target.kind === "lesson" && dragged.parentId === target.parentId)
      setLessonOrders((orders) => ({
        ...orders,
        [target.parentId]: moveBefore(orders[target.parentId] ?? [], dragged.id, target.id),
      }));
    if (target.kind === "session") setSessionOrder((ids) => moveBefore(ids, dragged.id, target.id));
    setDragged(null);
  }

  if (query.isPending) return <div className="h-72 animate-pulse rounded-2xl bg-muted" />;
  if (query.isError || !catalog)
    return (
      <p className="rounded-xl border border-destructive/30 p-4">
        Impossible de charger l’éditeur.
      </p>
    );
  const chapterMap = new Map(catalog.chapters.map((item) => [item.id, item]));
  const lessonMap = new Map(catalog.lessons.map((item) => [item.id, item]));
  const sessionMap = new Map(catalog.sessions.map((item) => [item.id, item]));

  return (
    <div className="space-y-5" data-testid="editorial-book-editor">
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="editorial-book">Livre / méthode</Label>
            <select
              id="editorial-book"
              value={selectedBookId}
              onChange={(event) => setBookId(event.target.value)}
              className="min-h-11 rounded-md border bg-background px-3"
            >
              {catalog.books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => saveOrder.mutate("chapters")}>
              <Save /> Chapitres
            </Button>
            <Button variant="outline" onClick={() => saveOrder.mutate("lessons")}>
              <Save /> Leçons
            </Button>
            <Button onClick={() => saveOrder.mutate("sessions")}>
              <Save /> Séances
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="rounded-2xl border bg-muted/25 p-3 text-sm text-muted-foreground">
        <BookOpen className="mr-2 inline size-4" /> Glissez, puis enregistrez. Seules les positions
        sont modifiées.
      </div>
      {chapterOrder.map((chapterId, chapterIndex) => {
        const chapter = chapterMap.get(chapterId);
        if (!chapter) return null;
        const lessons = (lessonOrders[chapter.id] ?? [])
          .map((id) => lessonMap.get(id))
          .filter(Boolean) as EditorialLesson[];
        const lessonIds = new Set(lessons.map((lesson) => lesson.id));
        const sessions = sessionOrder
          .map((id) => sessionMap.get(id))
          .filter((session): session is EditorialSession =>
            Boolean(session && lessonIds.has(session.lesson_id)),
          );
        return (
          <section key={chapter.id} className="rounded-2xl border bg-card p-4 sm:p-5">
            <DragRow
              item={{ kind: "chapter", id: chapter.id, parentId: selectedBookId }}
              title={chapter.title}
              status={chapter.status}
              number={chapterIndex + 1}
              onDragStart={setDragged}
              onDrop={drop}
              onEdit={() => setEditTarget({ kind: "chapter", item: chapter })}
            />
            <div className="ml-3 mt-4 border-l pl-3 sm:ml-6 sm:pl-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Leçons
              </p>
              <div className="space-y-2">
                {lessons.map((lesson, lessonIndex) => (
                  <DragRow
                    key={lesson.id}
                    item={{ kind: "lesson", id: lesson.id, parentId: chapter.id }}
                    title={lesson.title}
                    status={lesson.status}
                    number={lessonIndex + 1}
                    onDragStart={setDragged}
                    onDrop={drop}
                    onEdit={() => setEditTarget({ kind: "lesson", item: lesson })}
                  />
                ))}
              </div>
              <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Séances
              </p>
              <div className="space-y-2">
                {sessions.map((session) => {
                  const lesson = lessonMap.get(session.lesson_id);
                  const number = sessionOrder.indexOf(session.id) + 1;
                  return (
                    <DragRow
                      key={session.id}
                      item={{ kind: "session", id: session.id, parentId: selectedBookId }}
                      title={session.title.replace(/^\d{1,3}\s*[—-]\s*/, "")}
                      subtitle={lesson?.title}
                      status={session.status}
                      number={number}
                      onDragStart={setDragged}
                      onDrop={drop}
                      onEdit={() => setEditTarget({ kind: "session", item: session })}
                    />
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
      <EditDialog
        target={editTarget}
        catalog={catalog}
        pending={edit.isPending}
        onClose={() => setEditTarget(null)}
        onSubmit={(target, form) => edit.mutate({ target, form })}
      />
    </div>
  );
}
