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
