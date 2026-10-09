import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const csvPath = resolve(import.meta.dirname, "akhdari_catalog.csv");
const manifestPath = resolve(import.meta.dirname, "akhdari_import_manifest.json");
const migrationPath = resolve(
  root,
  "supabase/migrations/20261009103810_import_akhdari_curriculum.sql",
);
// The supplied file uses CRLF line endings. The checked-in catalog is the same
// semantic CSV normalized to LF, so pin both hashes for traceability.
const officialSourceSha256 = "c67d35ed04d8d0ab650d7eb7ad4971e709cc1f6640f4ed32f6c541caf4d6e084";
const expectedCatalogSha256 = "a729a1d1a5d776dbaceafab7eb6df978f1f5a6d5d68e9bee5a49f986c63cbc2e";

const csv = readFileSync(csvPath, "utf8").replace(/\r/g, "");
const csvHash = createHash("sha256")
  .update(csv.replace(/\n$/, "") + "\n")
  .digest("hex");
if (csvHash !== expectedCatalogSha256) throw new Error(`CSV hash mismatch: ${csvHash}`);

const [header, ...lines] = csv.trim().split("\n");
if (header !== "numero,title,video_id,url,duration")
  throw new Error(`Unexpected CSV header: ${header}`);
const catalog = lines.map((line) => {
  const [numero, sourceTitle, videoId, url, duration] = line.split(",");
  return { number: Number(numero), sourceTitle, videoId, url, duration };
});
if (catalog.length !== 57 || catalog.some((row, index) => row.number !== index + 1)) {
  throw new Error("The Akhdari catalog must contain exactly the ordered numbers 1..57.");
}
if (new Set(catalog.map((row) => row.videoId)).size !== 57) throw new Error("Duplicate Video ID.");

const titles = [
  "Les obligations du musulman légalement responsable (Moukallaf)",
  "Les conditions du repentir (Tawba)",
  "Les interdits pour le Moukallaf — Partie 1",
  "Les interdits pour le Moukallaf — Partie 2",
  "Les interdits pour le Moukallaf — Partie 3 et fin",
  "La purification rituelle : les deux types de purification",
  "La purification des impuretés (Najâsa)",
  "Les 7 obligations des ablutions (Wudû)",
  "Les actes recommandés (Sunan) des ablutions",
  "Les oublis pendant les ablutions et leurs corrections",
  "Les actes méritoires des ablutions (Fadâ'il)",
  "Les règles complémentaires des ablutions : doigts, orteils et barbe",
  "Les actes qui annulent les ablutions",
  "Les actes interdits sans ablutions",
  "Les situations qui rendent le grand lavage obligatoire (Ghusl)",
  "Les 4 obligations du grand lavage",
  "Les actes recommandés du grand lavage",
  "Les actes méritoires et les étapes du grand lavage",
  "Que faire lorsqu'on oublie une partie du corps pendant le Ghusl ?",
  "Les interdictions en état d'impureté majeure (Janâba)",
  "Le Tayammum : qui peut pratiquer la purification sèche ?",
  "Le Tayammum : les matières autorisées",
  "Le Tayammum : les matières et supports utilisables, interdictions et exceptions",
  "Les 3 actes recommandés (Sunan) du Tayammum",
  "Les actes méritoires (Fadâ'il) du Tayammum",
  "Le Tayammum : les règles d'utilisation et de validité",
  "Les menstruations (Hayd) : catégories et durées",
  "Les menstruations : interdictions religieuses et obligations",
  "Les lochies (Nifâs) : les saignements après l'accouchement",
  "Les horaires des cinq prières obligatoires",
  "Les moments où les prières surérogatoires sont interdites",
  "Les conditions de validité de la prière (Salât)",
  "La prière en cas d'impossibilité de se purifier ou de se couvrir",
  "Les obligations de la prière (Farâ'id) — Partie 1",
  "Les actes recommandés de la prière (Sunan)",
  "Les actes méritoires de la prière (Fadâ'il)",
  "Les actes déconseillés pendant la prière",
  "Le recueillement et l'humilité dans la prière (Khushû')",
  "La prière du malade : les différentes positions autorisées",
  "La prière surérogatoire : prier assis ou debout",
  "Le rattrapage des prières manquées (Qadâ') : les règles et l'ordre",
  "Le rattrapage des prières : horaires autorisés et restrictions",
  "Les prosternations de réparation (Sujûd as-Sahw) : avant ou après le Salâm",
  "Les oublis dans la prière : obligations et actes recommandés",
  "Les doutes fréquents et les règles de réparation",
  "Les erreurs de récitation et les invocations pendant la prière",
  "Les erreurs de récitation à voix haute ou basse",
  "Le rire pendant la prière et l'importance du recueillement",
  "Les gestes involontaires pendant la prière",
  "Les erreurs dans la récitation du Coran pendant la prière",
  "L'oubli de versets et les erreurs dans la récitation de la Fâtiha",
  "Les erreurs du fidèle qui prie derrière l'imam",
  "Le fidèle arrivé en retard : les règles de réparation",
  "L'oubli de l'inclination ou des prosternations",
  "Les erreurs dans les prières surérogatoires",
  "Les erreurs dans la prière : ajout d'une unité et oubli d'un pilier",
  "Les erreurs de l'imam et la correction de la prière collective",
];

const chapters = [
  {
    number: 1,
    title: "Obligations et comportement du musulman",
    range: [1, 5],
    page: "PDF p. 5–9 (pages imprimées 4–8)",
  },
  {
    number: 2,
    title: "La purification et les ablutions",
    range: [6, 14],
    page: "PDF p. 9–15 (pages imprimées 8–14)",
  },
  {
    number: 3,
    title: "Le grand lavage et la purification sèche",
    range: [15, 26],
    page: "PDF p. 15–23 (pages imprimées 14–22)",
  },
  {
    number: 4,
    title: "Les règles relatives à la purification des femmes",
    range: [27, 29],
    page: "PDF p. 17–19 (pages imprimées 16–18)",
  },
  {
    number: 5,
    title: "Les règles et l'accomplissement de la prière",
    range: [30, 40],
    page: "PDF p. 25–35 (pages imprimées 24–34)",
  },
  {
    number: 6,
    title: "Le rattrapage et les erreurs dans la prière",
    range: [41, 57],
    page: "PDF p. 27–47 (pages imprimées 26–46)",
  },
];

const pageRefs = [
  "PDF p. 5 (page imprimée 4)",
  "PDF p. 7 (page imprimée 6)",
  "PDF p. 5–7 (pages imprimées 4–6)",
  "PDF p. 7 (page imprimée 6)",
  "PDF p. 7–9 (pages imprimées 6–8)",
  "PDF p. 9 (page imprimée 8)",
  "PDF p. 9–11 (pages imprimées 8–10)",
  "PDF p. 13 (page imprimée 12)",
  "PDF p. 13–15 (pages imprimées 12–14)",
  "PDF p. 15 (page imprimée 14)",
  "PDF p. 15 (page imprimée 14)",
  "PDF p. 15 (page imprimée 14)",
  "PDF p. 11–13 (pages imprimées 10–12)",
  "PDF p. 13 (page imprimée 12)",
  "PDF p. 15–17 (pages imprimées 14–16)",
  "PDF p. 21 (page imprimée 20)",
  "PDF p. 21 (page imprimée 20)",
  "PDF p. 21 (page imprimée 20)",
  "PDF p. 21 (page imprimée 20)",
  "PDF p. 19–21 (pages imprimées 18–20)",
  "PDF p. 21–23 (pages imprimées 20–22)",
  "PDF p. 23 (page imprimée 22)",
  "PDF p. 23 (page imprimée 22)",
  "PDF p. 23 (page imprimée 22)",
  "PDF p. 23 (page imprimée 22)",
  "PDF p. 23 (page imprimée 22)",
  "PDF p. 17–19 (pages imprimées 16–18)",
  "PDF p. 17–19 (pages imprimées 16–18)",
  "PDF p. 17–19 (pages imprimées 16–18)",
  "PDF p. 25–27 (pages imprimées 24–26)",
  "PDF p. 27 (page imprimée 26)",
  "PDF p. 25–27 (pages imprimées 24–26)",
  "PDF p. 25–27 (pages imprimées 24–26)",
  "PDF p. 29 (page imprimée 28)",
  "PDF p. 31 (page imprimée 30)",
  "PDF p. 31–33 (pages imprimées 30–32)",
  "PDF p. 33 (page imprimée 32)",
  "PDF p. 35 (page imprimée 34)",
  "PDF p. 33–35 (pages imprimées 32–34)",
  "PDF p. 35 (page imprimée 34)",
  "PDF p. 27–29 (pages imprimées 26–28)",
  "PDF p. 27–29 (pages imprimées 26–28)",
  "PDF p. 37 (page imprimée 36)",
  "PDF p. 37 (page imprimée 36)",
  "PDF p. 41–43 (pages imprimées 40–42)",
  "PDF p. 37–39 (pages imprimées 36–38)",
  "PDF p. 37 (page imprimée 36)",
  "PDF p. 41 (page imprimée 40)",
  "PDF p. 41 (page imprimée 40)",
  "PDF p. 37–39 (pages imprimées 36–38)",
  "PDF p. 37–39 (pages imprimées 36–38)",
  "PDF p. 45 (page imprimée 44)",
  "PDF p. 45–47 (pages imprimées 44–46)",
  "PDF p. 45–47 (pages imprimées 44–46)",
  "PDF p. 37–45 (pages imprimées 36–44)",
  "PDF p. 37–43 (pages imprimées 36–42)",
  "PDF p. 47 (page imprimée 46)",
];

const provisional = new Set([33, 40, 52, 53, 54, 55, 56, 57]);
const existing = {
  6: {
    lessonId: "3a4023ae-8833-428c-ab39-29ac8ec389e5",
    sessionId: "3a4023ae-8833-428c-ab39-29ac8ec389e5",
    resourceId: "d06fdb43-b96a-481b-80e5-5a80f5c18fe3",
  },
  7: {
    lessonId: "2ac5821e-f89f-45d2-aa00-2bd6819363cf",
    sessionId: "2ac5821e-f89f-45d2-aa00-2bd6819363cf",
    resourceId: "66f90cd1-a358-4d1f-ae6a-d7e0bfca1e24",
  },
};

const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
function uuidV5(name) {
  const ns = Buffer.from(namespace.replaceAll("-", ""), "hex");
  const hash = createHash("sha1").update(ns).update(name).digest().subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function chapterFor(number) {
  return chapters.find((chapter) => number >= chapter.range[0] && number <= chapter.range[1]);
}
function durationSeconds(duration) {
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + seconds;
}
function q(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

const chapterIds = Object.fromEntries(
  chapters.map((chapter) => [
    chapter.number,
    chapter.number === 2
      ? "0d951659-45ba-45a2-9f1b-9831f2066686"
      : uuidV5(`diakspora-akhdari:chapter:${chapter.number}`),
  ]),
);
const chapterOffsets = Object.fromEntries(
  chapters.map((chapter) => [chapter.number, chapter.range[0] - 1]),
);
const sessions = catalog.map((row) => {
  const chapter = chapterFor(row.number);
  const ids = existing[row.number] ?? {
    lessonId: uuidV5(`diakspora-akhdari:lesson:${row.number}`),
    sessionId: uuidV5(`diakspora-akhdari:session:${row.number}`),
    resourceId: uuidV5(`diakspora-akhdari:youtube:${row.videoId}`),
  };
  const displayTitle = provisional.has(row.number)
    ? `Cours ${String(row.number).padStart(2, "0")} — Akhdari`
    : titles[row.number - 1];
  return {
    ...row,
    ...ids,
    chapterNumber: chapter.number,
    chapterId: chapterIds[chapter.number],
    orderInChapter: row.number - chapterOffsets[chapter.number] - 1,
    pedagogicalTitle: titles[row.number - 1],
    displayTitle,
    pageReference: pageRefs[row.number - 1],
    mappingStatus: provisional.has(row.number)
      ? "provisional_requires_thumbnail_review"
      : "pdf_sequence_verified",
    durationSeconds: durationSeconds(row.duration),
    durationMinutes: Math.max(1, Math.ceil(durationSeconds(row.duration) / 60)),
    quizId: uuidV5(`diakspora-akhdari:quiz:${row.number}`),
  };
});

const quizPools = {
  1: [
    [
      "Qui est le moukallaf dans le commentaire étudié ?",
      [
        "Le pubère sain d’esprit",
        "Toute personne mineure",
        "Uniquement le savant",
        "Toute personne malade",
      ],
      0,
      "Le commentaire définit le moukallaf comme le pubère sain d’esprit.",
    ],
    [
      "Quelle attitude fait partie des conditions du repentir ?",
      [
        "Regretter le péché et décider de ne pas y revenir",
        "Différer le repentir",
        "Raconter le péché",
        "Attendre un signe",
      ],
      0,
      "Le repentir implique regret, abandon immédiat et ferme décision de ne pas recommencer.",
    ],
    [
      "Qu’est-ce que la médisance selon le commentaire ?",
      [
        "Dire en l’absence d’une personne ce qu’elle réprouverait",
        "Donner un conseil discret",
        "Corriger une erreur publique",
        "Garder le silence",
      ],
      0,
      "La médisance est définie comme l’évocation, en son absence, de ce que son frère réprouverait.",
    ],
    [
      "Que désigne l’ostentation ?",
      [
        "Agir pour être vu des gens",
        "Cacher une bonne œuvre",
        "Demander un conseil",
        "Réparer une injustice",
      ],
      0,
      "L’ostentation consiste à agir afin d’être vu et considéré par les gens.",
    ],
    [
      "Avant d’agir, que doit connaître le musulman selon le texte ?",
      [
        "Le statut religieux de l’acte",
        "L’opinion la plus populaire",
        "Le coût de l’acte",
        "L’avis de ses proches uniquement",
      ],
      0,
      "Le texte demande de connaître le statut attribué à l’acte et de questionner les savants.",
    ],
  ],
  2: [
    [
      "Quelles sont les deux grandes catégories de purification étudiées ?",
      [
        "Purification du khabath et purification du hadath",
        "Jeûne et aumône",
        "Voyage et résidence",
        "Obligatoire et facultative uniquement",
      ],
      0,
      "Le livre distingue la purification de l’impureté matérielle et celle de l’état d’impureté rituelle.",
    ],
    [
      "Que fait celui qui doute d’avoir annulé ses ablutions, hors doute obsessionnel ?",
      [
        "Il refait ses ablutions",
        "Il ignore toujours le doute",
        "Il refait uniquement la prière",
        "Il attend le lendemain",
      ],
      0,
      "Le commentaire prescrit de refaire l’ablution, sauf en cas de doute obsessionnel.",
    ],
    [
      "Quel acte est interdit sans ablutions selon le texte ?",
      ["Accomplir la prière", "Étudier une langue", "Dormir", "Marcher"],
      0,
      "La prière fait partie des actes interdits au non-ablutionné.",
    ],
    [
      "Le frottement fait-il partie des obligations de l’ablution dans l’avis présenté ?",
      ["Oui", "Non, il est toujours déconseillé", "Seulement en voyage", "Seulement le vendredi"],
      0,
      "Le commentaire malikite compte le frottement parmi les obligations de l’ablution.",
    ],
    [
      "Quelle règle s’applique à l’ordre des obligations de l’ablution dans le commentaire ?",
      [
        "Il est distingué des actes recommandés et méritoires",
        "Toutes les catégories sont identiques",
        "L’ordre n’a jamais d’importance",
        "Il annule automatiquement toute ablution",
      ],
      0,
      "Le texte distingue obligations, sunan et actes méritoires, avec leurs règles propres.",
    ],
  ],
  3: [
    [
      "Combien d’obligations du grand lavage le commentaire énumère-t-il ?",
      ["Quatre", "Deux", "Cinq", "Sept"],
      0,
      "Le commentaire énumère quatre obligations du lavage complet.",
    ],
    [
      "Quelle action est une obligation du grand lavage ?",
      [
        "Faire parvenir l’eau sur tout l’extérieur du corps",
        "Laver uniquement les mains",
        "Réciter à voix haute",
        "Attendre la fin du temps de prière",
      ],
      0,
      "L’eau doit atteindre l’ensemble de l’extérieur du corps, peau et poils compris.",
    ],
    [
      "Quelle situation peut rendre le grand lavage obligatoire ?",
      ["L’éjaculation", "Le simple sommeil sans émission", "La marche", "La lecture"],
      0,
      "Le texte rattache notamment l’obligation du lavage à l’éjaculation.",
    ],
    [
      "Quand le tayammum peut-il remplacer l’usage de l’eau ?",
      [
        "Lorsque l’eau manque ou que son usage cause un préjudice reconnu",
        "Toujours par préférence",
        "Seulement la nuit",
        "Uniquement à la maison",
      ],
      0,
      "Le tayammum répond à l’absence d’eau ou à une impossibilité valable de l’utiliser.",
    ],
    [
      "L’entrée du temps de la prière est-elle citée parmi les obligations du tayammum ?",
      ["Oui", "Non", "Seulement pour le vendredi", "Seulement en voyage"],
      0,
      "Le commentaire cite l’entrée du temps parmi les obligations du tayammum.",
    ],
  ],
  4: [
    [
      "Quel intervalle d’âge habituel le commentaire mentionne-t-il pour les règles ?",
      [
        "De neuf à cinquante ans selon l’avis prépondérant",
        "De cinq à dix ans",
        "Après soixante ans uniquement",
        "Aucun intervalle n’est mentionné",
      ],
      0,
      "Le texte mentionne l’âge de neuf à cinquante ans selon l’avis prépondérant.",
    ],
    [
      "Quelle durée minimale de pureté sépare deux périodes de sang dans l’exemple juridique ?",
      ["Quinze jours", "Un jour", "Sept jours", "Quarante jours"],
      0,
      "Le commentaire indique quinze jours comme minimum d’une période de pureté.",
    ],
    [
      "Que fait la femme lorsque le sang cesse et qu’elle est à nouveau pure ?",
      [
        "Elle accomplit le lavage requis",
        "Elle abandonne définitivement la prière",
        "Elle pratique toujours le tayammum",
        "Elle attend obligatoirement un mois",
      ],
      0,
      "La reprise de l’état de pureté appelle le lavage prescrit avant les actes concernés.",
    ],
    [
      "Les lochies désignent-elles les saignements liés à l’accouchement ?",
      ["Oui", "Non", "Seulement une blessure", "Uniquement une maladie chronique"],
      0,
      "Le nifâs concerne les saignements consécutifs à l’accouchement.",
    ],
    [
      "Les règles de purification des femmes sont-elles traitées séparément dans le commentaire ?",
      ["Oui", "Non", "Seulement dans une annexe moderne", "Uniquement pour le voyage"],
      0,
      "Le texte consacre des développements distincts aux règles, à la pureté et aux lochies.",
    ],
  ],
  5: [
    [
      "Couvrir la ‘awrah relève de quelle catégorie dans le passage étudié ?",
      [
        "Des conditions de la prière",
        "Des annulatifs du jeûne",
        "Des règles du commerce",
        "Des règles du voyage uniquement",
      ],
      0,
      "Le commentaire traite la couverture de la ‘awrah parmi les conditions de la prière.",
    ],
    [
      "Combien d’obligations de la prière le commentaire annonce-t-il ?",
      ["Douze", "Quatre", "Sept", "Vingt"],
      0,
      "Le passage consacré aux obligations de la prière en annonce douze.",
    ],
    [
      "La récitation à voix haute ou basse est-elle réglée selon les prières et les unités ?",
      ["Oui", "Non", "Seulement pour la prière du vendredi", "Elle est laissée sans règle"],
      0,
      "Le commentaire précise les emplacements de la récitation à voix haute et à voix basse.",
    ],
    [
      "Comment prie le malade incapable de la position normale ?",
      [
        "Selon la position qu’il peut réellement adopter",
        "Il abandonne toute prière",
        "Il reporte toujours au lendemain",
        "Il doit rester debout à tout prix",
      ],
      0,
      "Le texte prévoit des positions adaptées à la capacité réelle du malade.",
    ],
    [
      "Quelle récompense est mentionnée pour celui qui prie volontairement une prière surérogatoire assis alors qu’il peut se tenir debout ?",
      [
        "La moitié de la récompense de celui qui prie debout",
        "Le double",
        "Aucune",
        "La même dans tous les cas selon ce passage",
      ],
      0,
      "Le commentaire mentionne la moitié de la récompense dans ce cas.",
    ],
  ],
  6: [
    [
      "Une obligation omise dans la prière est-elle réparée par la seule prosternation compensatrice ?",
      ["Non", "Oui dans tous les cas", "Seulement sans intention", "Seulement en voyage"],
      0,
      "Le texte précise que l’omission d’une obligation ne se répare pas par la seule prosternation compensatrice.",
    ],
    [
      "Quand les deux prosternations sont-elles faites après le salâm dans la règle générale présentée ?",
      [
        "Lorsqu’un ajout a été commis",
        "Pour toute prière correcte",
        "Avant toute récitation",
        "Uniquement le vendredi",
      ],
      0,
      "Le commentaire place en principe après le salâm la réparation d’un ajout.",
    ],
    [
      "Un doute fréquent doit-il être traité exactement comme un doute exceptionnel ?",
      [
        "Non",
        "Oui sans aucune distinction",
        "Il annule toujours l’ablution et la prière",
        "Il impose toujours quatre prosternations",
      ],
      0,
      "Le livre distingue les doutes selon leur fréquence et leur contexte.",
    ],
    [
      "L’imam prend-il en charge l’omission d’une obligation commise par le fidèle qui le suit ?",
      ["Non", "Oui dans tous les cas", "Seulement pour la Fâtiha", "Seulement après le salâm"],
      0,
      "Le texte indique que l’imam prend en charge certaines omissions de sunan, non celles des obligations.",
    ],
    [
      "Que dit le fidèle pour avertir l’imam d’une erreur selon le passage étudié ?",
      [
        "Soubhânallâh",
        "Une formule inventée",
        "Il ne dit jamais rien",
        "Il quitte immédiatement la prière",
      ],
      0,
      "Le passage sur l’erreur de l’imam indique que le fidèle dit « soubhânallâh ».",
    ],
  ],
};

const manifest = {
  importKey: "akhdari-57-v1",
  officialSourceSha256,
  catalogSha256: expectedCatalogSha256,
  primarySource: "Mukhtassar-al-Akhdari.pdf — ‘abd-Allâh Althaparro alfirançiyy",
  secondarySource: "017-MUKHTASAR-AL-AKHDARI-ARABE-FRANCAIS.pdf",
  thumbnailEvidenceAvailable: false,
  note: "Les regroupements de chapitres sont propres à Karanta. Les quiz restent en brouillon et utilisent des questions de niveau chapitre lorsque l’oral exact n’est pas vérifié.",
  chapters: chapters.map((chapter) => ({ ...chapter, id: chapterIds[chapter.number] })),
  sessions,
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const manifestValues = sessions
  .map(
    (row) => `(
  ${row.number}, ${q(row.sourceTitle)}, ${q(row.videoId)}, ${q(row.url)}, ${q(row.duration)},
  ${q(row.pedagogicalTitle)}, ${q(row.displayTitle)}, ${q(row.pageReference)}, ${q(row.mappingStatus)},
  ${row.chapterNumber}, ${row.orderInChapter}, ${q(row.chapterId)}::uuid, ${q(row.lessonId)}::uuid,
  ${q(row.sessionId)}::uuid, ${q(row.resourceId)}::uuid, ${q(row.quizId)}::uuid,
  ${row.durationSeconds}, ${row.durationMinutes}
)`,
  )
  .join(",\n");

const chapterValues = chapters
  .map(
    (chapter) =>
      `(${chapter.number}, ${q(chapterIds[chapter.number])}::uuid, ${q(chapter.title)}, ${q(chapter.page)})`,
  )
  .join(",\n");

const questionRows = [];
const optionRows = [];
for (const session of sessions) {
  quizPools[session.chapterNumber].forEach(
    ([prompt, options, correctIndex, explanation], questionIndex) => {
      const questionId = uuidV5(
        `diakspora-akhdari:question:${session.number}:${questionIndex + 1}`,
      );
      questionRows.push(
        `(${q(questionId)}::uuid, ${q(session.quizId)}::uuid, ${questionIndex}, ${q(prompt)}, ${q(`${explanation} Source : ${session.pageReference}. Niveau : compréhension.`)})`,
      );
      options.forEach((label, optionIndex) => {
        const optionId = uuidV5(
          `diakspora-akhdari:option:${session.number}:${questionIndex + 1}:${optionIndex + 1}`,
        );
        optionRows.push(
          `(${q(optionId)}::uuid, ${q(questionId)}::uuid, ${optionIndex}, ${q(label)}, ${optionIndex === correctIndex})`,
        );
      });
    },
  );
}

const sql = `-- Akhdari import: 57 canonical sessions, YouTube resources and draft quizzes.
-- Generated by supabase/plans/generate_akhdari_import.mjs from the locked CSV.
-- Data-only, idempotent and transaction-safe. Existing UUIDs for videos 6 and 7 are preserved.

CREATE TEMP TABLE akhdari_baseline ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM auth.users) AS auth_count,
  (SELECT md5(coalesce(string_agg(id::text, ',' ORDER BY id), '')) FROM auth.users) AS auth_hash,
  (SELECT count(*) FROM public.profiles) AS profile_count,
  (SELECT md5(coalesce(string_agg(row_to_json(profile)::text, '' ORDER BY profile.id), '')) FROM public.profiles AS profile) AS profile_hash,
  (SELECT count(*) FROM public.profile_session_progress) AS progress_count,
  (SELECT md5(coalesce(string_agg(row_to_json(progress)::text, '' ORDER BY progress.id), '')) FROM public.profile_session_progress AS progress) AS progress_hash;

CREATE TEMP TABLE akhdari_chapters (
  chapter_number integer PRIMARY KEY,
  chapter_id uuid NOT NULL,
  title text NOT NULL,
  page_reference text NOT NULL
) ON COMMIT DROP;
INSERT INTO akhdari_chapters VALUES
${chapterValues};

CREATE TEMP TABLE akhdari_manifest (
  canonical_number integer PRIMARY KEY,
  source_title text NOT NULL,
  video_id text NOT NULL UNIQUE,
  url text NOT NULL UNIQUE,
  duration text NOT NULL,
  proposed_title text NOT NULL,
  display_title text NOT NULL,
  page_reference text NOT NULL,
  mapping_status text NOT NULL,
  chapter_number integer NOT NULL REFERENCES akhdari_chapters(chapter_number),
  lesson_order integer NOT NULL,
  chapter_id uuid NOT NULL,
  lesson_id uuid NOT NULL UNIQUE,
  session_id uuid NOT NULL UNIQUE,
  resource_id uuid NOT NULL UNIQUE,
  quiz_id uuid NOT NULL UNIQUE,
  duration_seconds integer NOT NULL,
  duration_minutes integer NOT NULL
) ON COMMIT DROP;
INSERT INTO akhdari_manifest VALUES
${manifestValues};

DO \$preflight\$
BEGIN
  IF (SELECT count(*) FROM akhdari_manifest) <> 57
     OR (SELECT min(canonical_number) FROM akhdari_manifest) <> 1
     OR (SELECT max(canonical_number) FROM akhdari_manifest) <> 57 THEN
    RAISE EXCEPTION 'Akhdari preflight: official catalog is not exactly 1..57.';
  END IF;
  IF (SELECT count(*) FROM public.organizations WHERE id='390a6abd-8712-490c-8f8d-846165bf9f9f' AND slug='diakspora') <> 1 THEN
    RAISE EXCEPTION 'Akhdari preflight: Diakspora organization mismatch.';
  END IF;
  IF (SELECT count(*) FROM public.subjects WHERE id='fc37b21a-4e7d-4382-80f4-62a659289ad0' AND organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f') <> 1 THEN
    RAISE EXCEPTION 'Akhdari preflight: Fiqh subject mismatch.';
  END IF;
  IF (SELECT count(*) FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821' AND organization_id='390a6abd-8712-490c-8f8d-846165bf9f9f') <> 1
     OR (SELECT count(*) FROM public.courses WHERE id='cbfcd804-4499-4def-9496-7485e3fae821' AND book_id='cbfcd804-4499-4def-9496-7485e3fae821') <> 1 THEN
    RAISE EXCEPTION 'Akhdari preflight: existing book/course mapping mismatch.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='d06fdb43-b96a-481b-80e5-5a80f5c18fe3' AND external_url='https://www.youtube.com/watch?v=tlcqA7snWUc')
     OR NOT EXISTS (SELECT 1 FROM public.lesson_resources WHERE id='66f90cd1-a358-4d1f-ae6a-d7e0bfca1e24' AND external_url='https://www.youtube.com/watch?v=TKO0w9XUPP0') THEN
    RAISE EXCEPTION 'Akhdari preflight: existing videos 6/7 no longer match the official catalog.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.lesson_resources resource
    JOIN akhdari_manifest manifest ON resource.external_url = manifest.url
    WHERE resource.id NOT IN ('d06fdb43-b96a-481b-80e5-5a80f5c18fe3','66f90cd1-a358-4d1f-ae6a-d7e0bfca1e24')
  ) THEN
    RAISE EXCEPTION 'Akhdari preflight: an official Video ID is already attached to an unexpected resource.';
  END IF;
END
\$preflight\$;

UPDATE public.books
SET title='Mukhtasar Al-Akhdari',
    subtitle='Étude et explication du Mukhtasar Al-Akhdari en langue diakanké',
    author='Al-Akhdari',
    description='Étude de texte et lecture commentée en diakanké. Texte étudié en arabe ; supports complémentaires et quiz en français.',
    cover_url='/brands/diakspora/books/mukhtasar-al-akhdari.webp',
    source_language='ar',
    status='published',
    metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
      'import_key','akhdari-57-v1','teaching_language','diakanke','text_language','ar',
      'support_language','fr','pedagogical_type','text_study_commented_reading',
      'access_tier','free','canonical_session_count',57,'csv_sha256',${q(officialSourceSha256)},
      'primary_source','Mukhtassar-al-Akhdari.pdf','mapping_manifest','supabase/plans/akhdari_import_manifest.json'
    ),
    published_at=coalesce(published_at,now()), updated_at=now()
WHERE id='cbfcd804-4499-4def-9496-7485e3fae821';

UPDATE public.courses
SET title='Mukhtasar Al-Akhdari',
    slug='mukhtasar-al-akhdari',
    description='Étude et explication du Mukhtasar Al-Akhdari en langue diakanké.',
    language='diakanke', status='published',
    cover_url='/brands/diakspora/books/mukhtasar-al-akhdari.webp',
    published_at=coalesce(published_at,now()), updated_at=now()
WHERE id='cbfcd804-4499-4def-9496-7485e3fae821';

UPDATE public.course_modules module
SET title='Chapitre 2 — La purification et les ablutions',
    description='Regroupement pédagogique Karanta. Référence : PDF p. 9–15 (pages imprimées 8–14).',
    order_index=1, status='published', updated_at=now()
WHERE module.id='0d951659-45ba-45a2-9f1b-9831f2066686';
UPDATE public.chapters chapter
SET title='Chapitre 2 — La purification et les ablutions',
    description='Regroupement pédagogique Karanta. Référence : PDF p. 9–15 (pages imprimées 8–14).',
    order_index=1, status='published', published_at=coalesce(published_at,now()), updated_at=now()
WHERE chapter.id='0d951659-45ba-45a2-9f1b-9831f2066686';

INSERT INTO public.course_modules (id,organization_id,course_id,title,description,order_index,status,available_from)
SELECT chapter_id,'390a6abd-8712-490c-8f8d-846165bf9f9f','cbfcd804-4499-4def-9496-7485e3fae821',
       'Chapitre '||chapter_number||' — '||title,
       'Regroupement pédagogique Karanta. Référence : '||page_reference||'.',chapter_number-1,'published',now()
FROM akhdari_chapters WHERE chapter_number<>2
ON CONFLICT (id) DO UPDATE SET title=excluded.title,description=excluded.description,order_index=excluded.order_index,status='published',updated_at=now();

INSERT INTO public.chapters (id,organization_id,book_id,legacy_course_module_id,title,description,order_index,status,created_by,published_at)
SELECT chapter_id,'390a6abd-8712-490c-8f8d-846165bf9f9f','cbfcd804-4499-4def-9496-7485e3fae821',chapter_id,
       'Chapitre '||chapter_number||' — '||title,
       'Regroupement pédagogique Karanta. Référence : '||page_reference||'.',chapter_number-1,'published',
       (SELECT created_by FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821'),now()
FROM akhdari_chapters WHERE chapter_number<>2
ON CONFLICT (id) DO UPDATE SET title=excluded.title,description=excluded.description,order_index=excluded.order_index,status='published',published_at=coalesce(public.chapters.published_at,excluded.published_at),updated_at=now();

INSERT INTO public.lessons (
  id,organization_id,course_id,module_id,chapter_id,title,summary,content,lesson_type,
  order_index,duration_minutes,video_url,is_preview,status,created_by
)
SELECT lesson_id,'390a6abd-8712-490c-8f8d-846165bf9f9f','cbfcd804-4499-4def-9496-7485e3fae821',chapter_id,chapter_id,
       lpad(canonical_number::text,2,'0')||' — '||display_title,
       'Séance '||lpad(canonical_number::text,2,'0')||' du parcours Akhdari. Référence : '||page_reference||'.',
       jsonb_build_object('import_key','akhdari-57-v1','canonical_number',canonical_number,'source_title',source_title,'video_id',video_id,'proposed_title',proposed_title,'mapping_status',mapping_status,'page_reference',page_reference),
       'on_demand',lesson_order,duration_minutes,url,true,'published',
       (SELECT created_by FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821')
FROM akhdari_manifest
ON CONFLICT (id) DO UPDATE SET module_id=excluded.module_id,chapter_id=excluded.chapter_id,title=excluded.title,summary=excluded.summary,content=excluded.content,order_index=excluded.order_index,duration_minutes=excluded.duration_minutes,video_url=excluded.video_url,is_preview=true,status='published',updated_at=now();

INSERT INTO public.sessions (
  id,organization_id,lesson_id,legacy_lesson_id,title,summary,order_index,duration_minutes,
  access_tier,requires_validation,status,version,created_by,published_at
)
SELECT session_id,'390a6abd-8712-490c-8f8d-846165bf9f9f',lesson_id,lesson_id,
       lpad(canonical_number::text,2,'0')||' — '||display_title,
       'Explication en langue diakanké. Texte étudié en arabe ; référence : '||page_reference||'.',
       0,duration_minutes,'free',true,'published',1,
       (SELECT created_by FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821'),now()
FROM akhdari_manifest
ON CONFLICT (id) DO UPDATE SET lesson_id=excluded.lesson_id,title=excluded.title,summary=excluded.summary,duration_minutes=excluded.duration_minutes,access_tier='free',requires_validation=true,status='published',published_at=coalesce(public.sessions.published_at,excluded.published_at),updated_at=now();

INSERT INTO public.lesson_resources (
  id,organization_id,lesson_id,session_id,resource_type,title,description,external_url,
  duration_seconds,order_index,status,allow_download,access_tier,source_type,source_name,
  author_name,provenance,distribution_authorized,license_type,version,published_at,created_by
)
SELECT resource_id,'390a6abd-8712-490c-8f8d-846165bf9f9f',lesson_id,session_id,'youtube',
       'Vidéo '||lpad(canonical_number::text,2,'0')||' — '||display_title,
       'Titre YouTube source : '||source_title||'. Video ID : '||video_id||'.',url,
       duration_seconds,0,'active',false,'free','youtube','Akhdari — corpus officiel 57 vidéos',
       null,'CSV officiel SHA-256 ${officialSourceSha256}; '||page_reference,true,'youtube_public_embed',1,now(),
       (SELECT created_by FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821')
FROM akhdari_manifest
ON CONFLICT (id) DO UPDATE SET lesson_id=excluded.lesson_id,session_id=excluded.session_id,title=excluded.title,description=excluded.description,external_url=excluded.external_url,duration_seconds=excluded.duration_seconds,order_index=0,status='active',allow_download=false,access_tier='free',source_type=excluded.source_type,source_name=excluded.source_name,provenance=excluded.provenance,distribution_authorized=true,license_type=excluded.license_type,published_at=coalesce(public.lesson_resources.published_at,excluded.published_at),updated_at=now();

-- M7's bridge trigger expects activity_id to start NULL, while the final schema
-- keeps it NOT NULL. The temporary relaxation is fully transactional and is
-- restored before validation/commit.
ALTER TABLE public.quizzes ALTER COLUMN activity_id DROP NOT NULL;
INSERT INTO public.quizzes (id,organization_id,lesson_id,activity_id,title,description,passing_score,max_attempts,status,created_by)
SELECT quiz_id,'390a6abd-8712-490c-8f8d-846165bf9f9f',lesson_id,null,
       'Quiz brouillon — Séance '||lpad(canonical_number::text,2,'0'),
       'Brouillon éditorial fondé sur le livre de référence au niveau du chapitre. '||page_reference||'.',80,null,'draft',
       (SELECT created_by FROM public.books WHERE id='cbfcd804-4499-4def-9496-7485e3fae821')
FROM akhdari_manifest
ON CONFLICT (id) DO UPDATE SET lesson_id=excluded.lesson_id,title=excluded.title,description=excluded.description,passing_score=80,status='draft',updated_at=now();
ALTER TABLE public.quizzes ALTER COLUMN activity_id SET NOT NULL;

CREATE TEMP TABLE akhdari_questions (id uuid PRIMARY KEY,quiz_id uuid,order_index integer,prompt text,explanation text) ON COMMIT DROP;
INSERT INTO akhdari_questions VALUES
${questionRows.join(",\n")};
INSERT INTO public.quiz_questions (id,organization_id,quiz_id,question_type,prompt,explanation,points,order_index)
SELECT id,'390a6abd-8712-490c-8f8d-846165bf9f9f',quiz_id,'single_choice',prompt,explanation,20,order_index FROM akhdari_questions
ON CONFLICT (id) DO UPDATE SET prompt=excluded.prompt,explanation=excluded.explanation,points=20,order_index=excluded.order_index;

CREATE TEMP TABLE akhdari_options (id uuid PRIMARY KEY,question_id uuid,order_index integer,label text,is_correct boolean) ON COMMIT DROP;
INSERT INTO akhdari_options VALUES
${optionRows.join(",\n")};
INSERT INTO public.quiz_options (id,organization_id,question_id,label,order_index)
SELECT id,'390a6abd-8712-490c-8f8d-846165bf9f9f',question_id,label,order_index FROM akhdari_options
ON CONFLICT (id) DO UPDATE SET label=excluded.label,order_index=excluded.order_index;
INSERT INTO public.quiz_option_keys (option_id,organization_id,is_correct)
SELECT id,'390a6abd-8712-490c-8f8d-846165bf9f9f',is_correct FROM akhdari_options
ON CONFLICT (option_id) DO UPDATE SET is_correct=excluded.is_correct;

DO \$verify\$
DECLARE baseline akhdari_baseline%ROWTYPE;
BEGIN
  SELECT * INTO baseline FROM akhdari_baseline;
  IF (SELECT count(*) FROM akhdari_chapters chapter JOIN public.chapters target ON target.id=chapter.chapter_id AND target.status='published') <> 6 THEN RAISE EXCEPTION 'Akhdari verify: chapters'; END IF;
  IF (SELECT count(*) FROM akhdari_manifest manifest JOIN public.lessons lesson ON lesson.id=manifest.lesson_id AND lesson.chapter_id=manifest.chapter_id AND lesson.status='published') <> 57 THEN RAISE EXCEPTION 'Akhdari verify: lessons'; END IF;
  IF (SELECT count(*) FROM akhdari_manifest manifest JOIN public.sessions session ON session.id=manifest.session_id AND session.lesson_id=manifest.lesson_id AND session.status='published' AND session.access_tier='free') <> 57 THEN RAISE EXCEPTION 'Akhdari verify: sessions'; END IF;
  IF (SELECT count(*) FROM akhdari_manifest manifest JOIN public.lesson_resources resource ON resource.id=manifest.resource_id AND resource.session_id=manifest.session_id AND resource.external_url=manifest.url AND resource.status='active' AND resource.access_tier='free' AND resource.distribution_authorized IS TRUE) <> 57 THEN RAISE EXCEPTION 'Akhdari verify: resources'; END IF;
  IF EXISTS (SELECT video_id FROM akhdari_manifest GROUP BY video_id HAVING count(*)<>1) THEN RAISE EXCEPTION 'Akhdari verify: duplicate Video ID'; END IF;
  IF (SELECT count(*) FROM akhdari_manifest manifest JOIN public.quizzes quiz ON quiz.id=manifest.quiz_id AND quiz.status='draft' AND quiz.passing_score=80) <> 57 THEN RAISE EXCEPTION 'Akhdari verify: draft quizzes'; END IF;
  IF (SELECT count(*) FROM akhdari_questions question JOIN public.quiz_questions target ON target.id=question.id AND target.points=20) <> 285 THEN RAISE EXCEPTION 'Akhdari verify: quiz questions'; END IF;
  IF EXISTS (SELECT quiz_id FROM public.quiz_questions WHERE quiz_id IN (SELECT quiz_id FROM akhdari_manifest) GROUP BY quiz_id HAVING count(*)<>5 OR sum(points)<>100) THEN RAISE EXCEPTION 'Akhdari verify: quiz scoring'; END IF;
  IF EXISTS (SELECT 1 FROM public.quizzes WHERE id IN (SELECT quiz_id FROM akhdari_manifest) AND status<>'draft') OR EXISTS (SELECT 1 FROM public.activities WHERE id IN (SELECT quiz_id FROM akhdari_manifest) AND status<>'draft') THEN RAISE EXCEPTION 'Akhdari verify: unreviewed quiz published'; END IF;
  IF (SELECT count(*) FROM auth.users)<>baseline.auth_count OR (SELECT md5(coalesce(string_agg(id::text,',' ORDER BY id),'')) FROM auth.users)<>baseline.auth_hash THEN RAISE EXCEPTION 'Akhdari verify: auth changed'; END IF;
  IF (SELECT count(*) FROM public.profiles)<>baseline.profile_count OR (SELECT md5(coalesce(string_agg(row_to_json(profile)::text,'' ORDER BY profile.id),'')) FROM public.profiles profile)<>baseline.profile_hash THEN RAISE EXCEPTION 'Akhdari verify: profiles changed'; END IF;
  IF (SELECT count(*) FROM public.profile_session_progress)<>baseline.progress_count OR (SELECT md5(coalesce(string_agg(row_to_json(progress)::text,'' ORDER BY progress.id),'')) FROM public.profile_session_progress progress)<>baseline.progress_hash THEN RAISE EXCEPTION 'Akhdari verify: M8 progress changed'; END IF;
  IF (SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='quizzes' AND column_name='activity_id')<>'NO' THEN RAISE EXCEPTION 'Akhdari verify: quiz activity invariant'; END IF;
END
\$verify\$;
`;

writeFileSync(migrationPath, sql);
console.log(
  JSON.stringify(
    {
      csvHash,
      sessions: sessions.length,
      verifiedTitles: sessions.filter((row) => row.mappingStatus === "pdf_sequence_verified")
        .length,
      provisionalTitles: sessions.filter((row) => row.mappingStatus !== "pdf_sequence_verified")
        .length,
      quizzes: sessions.length,
      questions: questionRows.length,
      migrationPath,
      manifestPath,
    },
    null,
    2,
  ),
);
