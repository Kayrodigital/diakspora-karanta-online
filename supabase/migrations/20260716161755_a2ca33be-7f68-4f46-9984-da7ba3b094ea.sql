ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS quiz_questions jsonb;

UPDATE public.lessons SET quiz_questions = '[
  {"id":"q1","question":"Combien de versets contient la sourate Al-Mulk ?","choices":["20","30","40"],"correctIndex":1,"explanation":"La sourate Al-Mulk (La Royauté) contient 30 versets."},
  {"id":"q2","question":"Que signifie « Al-Mulk » ?","choices":["La Lumière","La Royauté","La Miséricorde"],"correctIndex":1,"explanation":"« Al-Mulk » signifie « La Royauté » — la souveraineté appartient à Allah."},
  {"id":"q3","question":"Al-Mulk commence par : تَبَارَكَ الَّذِي بِيَدِهِ …","choices":["الْحَمْدُ","الْمُلْكُ","الرَّحْمَٰنُ"],"correctIndex":1,"explanation":"« تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ » — Béni soit Celui dans la main de qui est la royauté."},
  {"id":"q4","question":"Cette sourate est révélée à :","choices":["Médine","La Mecque","Taif"],"correctIndex":1,"explanation":"Al-Mulk est une sourate mecquoise (mekkiyya)."},
  {"id":"q5","question":"Elle protège celui qui la récite du châtiment de :","choices":["la faim","la tombe","la peur"],"correctIndex":1,"explanation":"Le Prophète ﷺ a enseigné qu''elle intercède pour son lecteur et le protège du châtiment de la tombe."}
]'::jsonb WHERE title ILIKE '%mulk%';

UPDATE public.lessons SET quiz_questions = '[
  {"id":"q1","question":"Combien de versets a la sourate Al-Fatiha ?","choices":["5","7","10"],"correctIndex":1,"explanation":"Al-Fatiha contient 7 versets."},
  {"id":"q2","question":"Que veut dire « Al-Fatiha » ?","choices":["La Fin","L''Ouverture","La Lumière"],"correctIndex":1,"explanation":"« Al-Fatiha » signifie « L''Ouverture » — c''est la première sourate du Coran."},
  {"id":"q3","question":"« الْحَمْدُ لِلَّهِ » veut dire :","choices":["Gloire à Allah","Louange à Allah","Merci Allah"],"correctIndex":1,"explanation":"« Louange à Allah, Seigneur de l''univers »."},
  {"id":"q4","question":"On la récite dans chaque :","choices":["journée","rakʿa de la prière","repas"],"correctIndex":1,"explanation":"Elle est récitée à chaque unité (rakʿa) de la prière."},
  {"id":"q5","question":"« اهْدِنَا الصِّرَاطَ … » — complète :","choices":["الْجَمِيلَ","الْمُسْتَقِيمَ","الْوَاسِعَ"],"correctIndex":1,"explanation":"« الصِّرَاطَ الْمُسْتَقِيمَ » — le droit chemin."}
]'::jsonb WHERE title ILIKE '%fatiha%';

UPDATE public.lessons SET quiz_questions = '[
  {"id":"q1","question":"Que veut dire أنا ?","choices":["Toi (garçon)","Moi / Je","Nous"],"correctIndex":1,"explanation":"أنا veut dire « moi » ou « je »."},
  {"id":"q2","question":"Que veut dire أنتَ ?","choices":["Moi","Toi (garçon)","Elle"],"correctIndex":1,"explanation":"أنتَ veut dire « toi » quand on parle à un garçon."},
  {"id":"q3","question":"Comment dit-on « Je suis un élève » ?","choices":["أنتَ طالب","أنا طالب","هو طالب"],"correctIndex":1,"explanation":"On dit أنا طالب : « Je suis un élève »."},
  {"id":"q4","question":"أنا commence par quelle lettre ?","choices":["ب","أ (alif)","ن"],"correctIndex":1,"explanation":"أنا commence par la lettre أ (alif)."},
  {"id":"q5","question":"Quel pronom utilises-tu pour parler de toi ?","choices":["أنا","أنتَ","هو"],"correctIndex":0,"explanation":"Pour parler de toi-même, tu dis أنا."}
]'::jsonb WHERE title ILIKE '%أنا%' OR title ILIKE '%pronom%';