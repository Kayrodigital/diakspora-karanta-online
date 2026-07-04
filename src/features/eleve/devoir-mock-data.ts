export type DevoirHistoryStatus = "sent" | "graded";

export type DevoirHistoryItem = {
  id: string;
  title: string;
  date: string;
  kind: "photo" | "audio";
  status: DevoirHistoryStatus;
  note?: string;
};

export const mockDevoir = {
  id: "dev-1",
  title: "Devoir — Copie de la sourate Al-Ikhlas",
  subtitle: "À rendre en photo ou en audio",
};

export const mockDevoirHistory: DevoirHistoryItem[] = [
  {
    id: "h1",
    title: "Copie de la Fâtiha",
    date: "il y a 3 jours",
    kind: "photo",
    status: "graded",
    note: "Très bien 💛",
  },
  {
    id: "h2",
    title: "Récitation An-Nâs",
    date: "hier",
    kind: "audio",
    status: "sent",
  },
];
