export type Lang = "ar" | "fr" | "en";

export const LANG_META: Record<Lang, { label: string; dir: "ltr" | "rtl" }> = {
  ar: { label: "عربي", dir: "rtl" },
  fr: { label: "Français", dir: "ltr" },
  en: { label: "English", dir: "ltr" },
};

type Dict = Record<string, string>;

const ar: Dict = {
  eyebrow_teacher: "فضاء المعلم",
  greeting: "السلام عليكم، الأستاذ",
  cohort: "الفوج",
  language: "اللغة",

  overview_title: "نظرة عامة على الفوج",
  overview_students: "طالبًا",
  status_regular: "منتظم",
  status_watch: "يحتاج متابعة",
  status_risk: "خطر انقطاع",

  actions_title: "إجراءات موصى بها",
  action_inactive: "{count} طلاب لم يفتحوا درسًا منذ 5 أيام",
  action_pending_grading: "{count} واجبات بانتظار التصحيح منذ أكثر من 3 أيام",
  action_low_attendance: "{count} طلاب غابوا عن حصتين هذا الأسبوع",
  cta_view: "عرض",
  cta_grade: "تصحيح",
  cta_contact: "تواصل",

  students_title: "الطلاب",
  last_activity_today: "نشط اليوم",
  last_activity_days: "منذ {n} أيام",
  pending_homework: "{n} واجب بانتظار التصحيح",
  no_pending: "لا يوجد واجب معلق",
  contact_button: "تواصل",

  homework_title: "واجبات للتصحيح",
  submitted_days: "أُرسل منذ {n} أيام",
  grade_button: "تصحيح",

  next_session_title: "الحصة القادمة",
  session_recitation: "حصة تلاوة جماعية",
  session_tajwid: "مقدمة في التجويد",
  join_session: "بدء الحصة",
};

const fr: Dict = {
  eyebrow_teacher: "Espace Professeur",
  greeting: "As-salāmu ʿalaykum, Ustadh",
  cohort: "Cohorte",
  language: "Langue",

  overview_title: "Vue d'ensemble de la cohorte",
  overview_students: "élèves",
  status_regular: "Régulier",
  status_watch: "À surveiller",
  status_risk: "Risque",

  actions_title: "Actions recommandées",
  action_inactive: "{count} élèves n'ont pas ouvert de leçon depuis 5 jours",
  action_pending_grading: "{count} devoirs en attente de correction depuis plus de 3 jours",
  action_low_attendance: "{count} élèves ont manqué 2 séances cette semaine",
  cta_view: "Voir",
  cta_grade: "Corriger",
  cta_contact: "Contacter",

  students_title: "Élèves",
  last_activity_today: "Actif aujourd'hui",
  last_activity_days: "Actif il y a {n} j",
  pending_homework: "{n} devoir(s) à corriger",
  no_pending: "Aucun devoir en attente",
  contact_button: "Contacter",

  homework_title: "Devoirs à corriger",
  submitted_days: "Rendu il y a {n} j",
  grade_button: "Corriger",

  next_session_title: "Prochaine séance",
  session_recitation: "Séance de récitation collective",
  session_tajwid: "Introduction au Tajwid",
  join_session: "Démarrer la séance",
};

const en: Dict = {
  eyebrow_teacher: "Teacher Space",
  greeting: "As-salāmu ʿalaykum, Ustadh",
  cohort: "Cohort",
  language: "Language",

  overview_title: "Cohort overview",
  overview_students: "students",
  status_regular: "Regular",
  status_watch: "Watch",
  status_risk: "At risk",

  actions_title: "Recommended actions",
  action_inactive: "{count} students haven't opened a lesson in 5 days",
  action_pending_grading: "{count} homework awaiting grading for more than 3 days",
  action_low_attendance: "{count} students missed 2 sessions this week",
  cta_view: "View",
  cta_grade: "Grade",
  cta_contact: "Contact",

  students_title: "Students",
  last_activity_today: "Active today",
  last_activity_days: "Active {n} d ago",
  pending_homework: "{n} homework to grade",
  no_pending: "No pending homework",
  contact_button: "Contact",

  homework_title: "Homework to grade",
  submitted_days: "Submitted {n} d ago",
  grade_button: "Grade",

  next_session_title: "Next session",
  session_recitation: "Group recitation session",
  session_tajwid: "Intro to Tajwid",
  join_session: "Start session",
};

const DICTS: Record<Lang, Dict> = { ar, fr, en };

export function makeT(lang: Lang) {
  const dict = DICTS[lang];
  return (key: string, vars?: Record<string, string | number>) => {
    let s = dict[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };
}
