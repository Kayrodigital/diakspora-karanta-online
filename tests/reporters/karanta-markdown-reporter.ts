import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

type Outcome = { title: string; status: TestResult["status"]; duration: number };

export default class KarantaMarkdownReporter implements Reporter {
  private started = new Date();
  private outcomes: Outcome[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.outcomes.push({ title: test.title, status: result.status, duration: result.duration });
  }

  onEnd(result: FullResult) {
    const counts = { passed: 0, failed: 0, skipped: 0 };
    for (const item of this.outcomes) {
      if (item.status === "passed") counts.passed++;
      else if (item.status === "skipped") counts.skipped++;
      else counts.failed++;
    }
    let commit = "inconnu";
    try {
      commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
        encoding: "utf8",
      }).trim();
    } catch {
      // A detached CI source archive may not contain Git metadata.
    }
    const isolated = process.env.KARANTA_QA_CONFIRM_ISOLATED === "yes";
    const environment = isolated
      ? "Supabase QA isolé + application locale"
      : "UI locale hors ligne";
    const suite = isolated ? "M9 Auth réel partiel" : "M9 Auth UI smoke";
    const failures = this.outcomes
      .filter((item) => item.status !== "passed" && item.status !== "skipped")
      .map((item) => `- ${item.title} : échec (détails dans le rapport Playwright local)`);
    const duration = Math.round(this.outcomes.reduce((sum, item) => sum + item.duration, 0) / 1000);
    const lines = [
      "# Rapport QA Karanta — M9",
      "",
      `- Date : ${this.started.toISOString()}`,
      `- Commit de base : ${commit} (les modifications QA locales peuvent être non commitées)`,
      `- Environnement : ${environment}`,
      `- Suite : ${suite}`,
      `- Résultat Playwright : ${result.status}`,
      `- Tests : ${this.outcomes.length} ; PASS ${counts.passed} ; FAIL ${counts.failed} ; SKIP ${counts.skipped}`,
      `- Durée cumulée : ${duration} s`,
      "- Captures/traces : `playwright-report/` et `test-results/` pour l'UI non sensible uniquement ; désactivées pour les tests Auth réels.",
      "",
      "## Échecs",
      "",
      ...(failures.length ? failures : ["Aucun dans la suite exécutée."]),
      "",
      "## Constats de la branche QA",
      "",
      "- Le premier smoke a détecté un routage imbriqué incorrect de `/auth/complete`. Il a été corrigé localement sans déploiement ; le smoke a ensuite été rejoué.",
      "- Le bouton d'en-tête « Inviter une personne » reste visible pour certains rôles non invités à gérer les invitations. La fonction Edge refuse ces rôles ; l'interface doit être confirmée en recette.",
      "",
      "## Couverture non validée par cette exécution",
      "",
      "- Activation réelle d'invitation, réception email, lien expiré/renvoyé et récupération complète.",
      "- Délivrabilité Brevo, en-têtes SPF/DKIM/DMARC et configuration des six templates hébergés.",
      "- Google OAuth (désactivé), permissions M10, parcours M11–M13 et non-régression de production.",
      "",
      "## Validation humaine requise",
      "",
      "- Fournir une base Supabase QA isolée, des comptes et boîtes de test autorisés ; contrôler les emails sans copier les liens à usage unique dans un rapport.",
      "- Vérifier séparément l'activation complète et la délivrabilité avant tout verdict de lancement.",
      "",
      "**Recommandation : NO-GO pour validation M9 complète.** Un test SKIP ou une UI hors ligne n'est pas une preuve E2E.",
      "",
    ];
    mkdirSync("docs/qa", { recursive: true });
    writeFileSync("docs/qa/karanta-test-report.md", lines.join("\n"));
  }
}
