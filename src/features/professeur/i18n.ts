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
  dashboard: "لوحة المتابعة",
  teacher_space: "فضاء المعلم",
  welcome: "السلام عليكم",
  welcome_help: "دروسك وطلابك ومواعيدك في مكان واحد.",
  tab_home: "الرئيسية",
  tab_classes: "الأفواج",
  tab_courses: "الدورات",
  tab_lives: "المباشر",
  tab_homework: "الواجبات",
  tab_messages: "الرسائل",
  tab_assessments: "التقييم",
  assigned_classes: "الأفواج المسندة",
  followed_students: "الطلاب المتابعون",
  associated_courses: "الدورات المرتبطة",
  corrections_waiting: "واجبات للتصحيح",
  quick_actions: "ماذا تريد أن تفعل؟",
  create_course: "إنشاء دورة",
  create_course_help: "أنشئ مسودة بسيطة بمساعدة الذكاء الاصطناعي.",
  grade_homework: "تصحيح الواجبات",
  grade_homework_help: "استمع إلى أعمال الطلاب وأرسل ملاحظاتك.",
  schedule_live: "برمجة درس مباشر",
  schedule_live_help: "أضف موعدًا ورابط الاجتماع للفوج.",
  answer_messages: "الرد على الرسائل",
  answer_messages_help: "أجب عن أسئلة الطلاب في مساحة خاصة.",
  my_classes: "أفواجي",
  my_classes_help: "تعرّف بسرعة على الأفواج التي تحتاج إلى متابعة.",
  students: "طلاب",
  courses: "دورات",
  next_live: "الدرس المباشر القادم",
  open_room: "فتح القاعة",
  no_session: "لا توجد حصة مبرمجة.",
  questions_messages: "الأسئلة والرسائل",
  questions_messages_help: "أجب عن أسئلة طلابك في مساحة آمنة.",
  course_list_title: "دورات أفواجي",
  course_list_help: "استعرض المحتويات المسندة إلى أفواجك وأنشئ مسوداتك.",
  published: "منشور",
  draft: "مسودة",
  all_levels: "جميع المستويات",
  lessons: "دروس",
  edit: "تعديل",
  logout: "تسجيل الخروج",
};

const fr: Dict = {
  eyebrow_teacher: "Espace Professeur",
  greeting: "As-salāmu ʿalaykum, Ustadh",
  cohort: "Classe",
  language: "Langue",

  overview_title: "Vue d'ensemble de la classe",
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
  dashboard: "Tableau de bord",
  teacher_space: "Espace professeur",
  welcome: "As-salāmu ʿalaykum",
  welcome_help: "Vos cours, vos élèves et vos rendez-vous au même endroit.",
  tab_home: "Accueil",
  tab_classes: "Classes",
  tab_courses: "Cours",
  tab_lives: "Directs",
  tab_homework: "Devoirs",
  tab_messages: "Messages",
  tab_assessments: "Évaluer",
  assigned_classes: "Classes attribuées",
  followed_students: "Élèves suivis",
  associated_courses: "Cours associés",
  corrections_waiting: "Corrections en attente",
  quick_actions: "Que souhaitez-vous faire ?",
  create_course: "Créer un cours",
  create_course_help: "Préparez simplement un brouillon avec l’aide de l’IA.",
  grade_homework: "Corriger les devoirs",
  grade_homework_help: "Écoutez les travaux et transmettez votre retour.",
  schedule_live: "Programmer un direct",
  schedule_live_help: "Ajoutez un rendez-vous et le lien de réunion.",
  answer_messages: "Répondre aux messages",
  answer_messages_help: "Répondez aux questions privées des élèves.",
  my_classes: "Mes classes",
  my_classes_help: "Repérez rapidement les groupes à accompagner.",
  students: "élèves",
  courses: "cours",
  next_live: "Prochain direct",
  open_room: "Ouvrir la salle",
  no_session: "Aucune séance planifiée.",
  questions_messages: "Questions et messages",
  questions_messages_help: "Répondez aux questions de vos élèves dans un espace sécurisé.",
  course_list_title: "Cours de mes classes",
  course_list_help: "Consultez les contenus attribués et créez vos propres brouillons.",
  published: "Publié",
  draft: "Brouillon",
  all_levels: "Tous niveaux",
  lessons: "leçons",
  edit: "Modifier",
  logout: "Se déconnecter",
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
