import { expect, test } from "@playwright/test";

// Auth traces can contain passwords, session cookies or one-time links.
test.use({ trace: "off", screenshot: "off", video: "off" });

const teacherEmail = process.env.KARANTA_QA_TEACHER_EMAIL || "";
const teacherPassword = process.env.KARANTA_QA_TEACHER_PASSWORD || "";

async function loginTeacher(page: import("@playwright/test").Page) {
  await page.goto("/auth?portal=teacher");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByLabel("Mot de passe", { exact: true }).fill(teacherPassword);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/professeur$/, { timeout: 20_000 });
}

test.beforeAll(() => {
  if (process.env.KARANTA_QA_CONFIRM_ISOLATED !== "yes") {
    throw new Error("AUTH réel interdit sans préflight Supabase QA isolé.");
  }
});

test("AUTH-01 @auth : connexion professeur et portail affecté", async ({ page }) => {
  await loginTeacher(page);
  await expect(page.getByText(/Espace professeur/i).first()).toBeVisible();
});

test("AUTH-02 @auth : mauvais mot de passe sans accès ni divulgation", async ({ page }) => {
  await page.goto("/auth?portal=teacher");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByLabel("Mot de passe", { exact: true }).fill(`${teacherPassword}-incorrect`);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.locator("form > p").filter({
      hasText: /invalid login credentials|identifiants invalides|mot de passe incorrect/i,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\?portal=teacher/);
});

test("AUTH-07a @auth : demande de récupération acceptée sans révéler le compte", async ({
  page,
}) => {
  await page.goto("/auth?portal=teacher");
  await expect(page.locator('[data-qa-ready="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await page.getByLabel("Email").fill(teacherEmail);
  await page.getByRole("button", { name: "Recevoir le lien" }).click();
  await expect(page.getByText(/Si ce compte existe, un lien/i)).toBeVisible();
});

test("AUTH-08 @auth : le professeur ne gagne pas le portail admin", async ({ page }) => {
  await loginTeacher(page);
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: /Espace Admin/i })).toHaveCount(0);
});

test("AUTH-09 @auth : la déconnexion protège les pages staff", async ({ page }) => {
  await loginTeacher(page);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/auth\?portal=teacher/);
  await page.goto("/professeur");
  await expect(page).toHaveURL(/\/auth\?portal=teacher/);
});
