import { expect, test } from "@playwright/test";

test("AUTH-UI-01 @smoke : les trois portails affichent une connexion claire", async ({ page }) => {
  for (const [portal, heading] of [
    ["family", "Bienvenue dans votre espace"],
    ["teacher", "Accéder à votre espace professeur"],
    ["admin", "Piloter votre organisation"],
  ] as const) {
    await page.goto(`/auth?portal=${portal}`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Mot de passe", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  }
});

test("AUTH-UI-02 @smoke : le parcours de récupération est accessible", async ({ page }) => {
  await page.goto("/auth?portal=family");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await expect(page.getByRole("heading", { name: "Mot de passe oublié" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Mot de passe", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Recevoir le lien" })).toBeVisible();
});

test("AUTH-UI-03 @smoke : un lien d'activation absent est refusé", async ({ page }) => {
  await page.goto("/auth/complete?flow=invite&portal=teacher");
  await expect(page.getByRole("alert")).toContainText("expiré ou invalide");
  await expect(page.getByRole("button", { name: "Enregistrer et continuer" })).toHaveCount(0);
});

test("AUTH-UI-04 @smoke : Google reste désactivé par défaut", async ({ page }) => {
  await page.goto("/auth?portal=family");
  await expect(page.getByRole("button", { name: /Google/i })).toHaveCount(0);
});

test("AUTH-UI-05 @smoke : l'écran Auth reste lisible sans défilement horizontal", async ({
  page,
}) => {
  await page.goto("/auth?portal=teacher");
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});

test("AUTH-UI-06 @smoke : les accès directs préservent le portail demandé", async ({ page }) => {
  for (const [path, portal] of [
    ["/admin", "admin"],
    ["/professeur", "teacher"],
    ["/eleve", "family"],
  ] as const) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/auth\\?[^#]*portal=${portal}`));
    await expect(page).not.toHaveURL(/\/eleve$/);
  }
});

test("AUTH-UI-07 @smoke : un ancien lien de récupération sur / rejoint le formulaire et nettoie le fragment d'erreur", async ({
  page,
}) => {
  await page.goto("/#error_code=otp_expired&type=recovery");
  await expect(page).toHaveURL(/\/auth\/complete\?flow=recovery$/);
  await expect(page.getByRole("alert")).toContainText("expiré ou invalide");
  expect(new URL(page.url()).hash).toBe("");
});

test("LANDING-UI-01 @smoke : la direction éditoriale reste lisible et navigable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Le savoir se reçoit/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Découvrir les cours/i })).toHaveAttribute(
    "href",
    "/apprendre",
  );
  await expect(page.getByRole("heading", { name: "Nos disciplines" })).toBeVisible();
  await expect(
    page.locator('img[src="/brands/diakspora/landing/karanta-hero.webp"]'),
  ).toBeVisible();
  const widths = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
});
