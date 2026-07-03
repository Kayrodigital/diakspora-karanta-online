// Mock data for the child student dashboard.
// Structure mirrors what will later come from the database
// (users, courses, lessons, reviews_schedule, progress, cohorts).

export type Student = {
  firstName: string;
  cohortName: string; // e.g. "Promotion Étoile"
  groupLabel: string; // e.g. "Groupe 2"
  unreadNotifications: number;
};

export type TodaysLesson = {
  id: string;
  title: string;
  subtitle: string;
  durationMin: number;
  thumbnailEmoji: string; // placeholder for video thumbnail
};

export type SurahNode = {
  id: string;
  name: string; // French/transliterated name
  arabicLetter: string; // first arabic letter shown in circle
  status: "done" | "current" | "upcoming";
};

export type ReviewItem = {
  id: string;
  title: string;
  spacing: "J+1" | "J+3" | "J+7" | "J+14" | "J+30";
};

export const mockStudent: Student = {
  firstName: "Yacoub",
  cohortName: "Promotion Étoile",
  groupLabel: "Groupe 2",
  unreadNotifications: 2,
};

export const mockTodaysLesson: TodaysLesson = {
  id: "lesson-al-mulk-1",
  title: "Sourate Al-Mulk",
  subtitle: "Versets 1-5",
  durationMin: 5,
  thumbnailEmoji: "🕌",
};

export const mockJuzAmmaPath: SurahNode[] = [
  { id: "s114", name: "An-Nas",     arabicLetter: "ن", status: "done" },
  { id: "s113", name: "Al-Falaq",   arabicLetter: "ف", status: "done" },
  { id: "s112", name: "Al-Ikhlas",  arabicLetter: "إ", status: "done" },
  { id: "s111", name: "Al-Masad",   arabicLetter: "ت", status: "done" },
  { id: "s110", name: "An-Nasr",    arabicLetter: "ن", status: "current" },
  { id: "s109", name: "Al-Kafirun", arabicLetter: "ك", status: "upcoming" },
  { id: "s108", name: "Al-Kawthar", arabicLetter: "ك", status: "upcoming" },
  { id: "s107", name: "Al-Maʿun",   arabicLetter: "م", status: "upcoming" },
];

export const mockReviews: ReviewItem[] = [
  { id: "r1", title: "Lettres ص ض ط ظ",       spacing: "J+3" },
  { id: "r2", title: "Sourate Al-Fatiha",     spacing: "J+7" },
  { id: "r3", title: "Les voyelles courtes",  spacing: "J+1" },
];
