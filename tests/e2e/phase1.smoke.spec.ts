import { test, expect, type Page } from "@playwright/test";

const org = "00000000-0000-4000-8000-000000000001";
const teacher = {
  id: "qa-teacher",
  display_name: "Professeur QA",
  slug: "professeur-qa",
  biography: "Biographie de recette, sans titre ni affiliation.",
  photo_url: null,
  status: "published",
};
const recording = {
  id: "qa-recording",
  teacher_id: teacher.id,
  title: "Enseignement de recette",
  language: "fr",
  access_tier: "free",
  status: "published",
  review_status: "approved",
};

async function publicData(page: Page, fail = false) {
  await page.route("https://karanta-offline-ui.invalid/**", async (route) => {
    if (fail) return route.fulfill({ status: 403, json: { message: "Offline QA" } });
    const path = new URL(route.request().url()).pathname;
    const json = path.endsWith("/organizations")
      ? { id: org }
      : path.endsWith("/majliss_teachers")
        ? [
            teacher,
            {
              ...teacher,
              id: "private",
              slug: "private",
              display_name: "Profil brouillon QA",
              status: "draft",
            },
          ]
        : path.endsWith("/majliss_recordings")
          ? [
              recording,
              {
                ...recording,
                id: "pending",
                title: "Audio en attente QA",
                review_status: "pending",
              },
            ]
          : [];
    await route.fulfill({ json });
  });
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBeTruthy();
}

test("PH1 navigation et visuel famille desktop/mobile/tablette", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Le savoir de nos anciens/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Commencer pour mon enfant/ })).toHaveAttribute(
    "href",
    "/auth?portal=family&target=parent",
  );
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.locator("header summary").click();
    await expect(
      page
        .getByRole("navigation", { name: "Navigation mobile" })
        .getByRole("link", { name: "Professeurs" }),
    ).toBeVisible();
    await page.locator("header summary").click();
  }
  await noOverflow(page);
  const image = page.locator('img[src*="01-famille-apprentissage"]');
  await image.scrollIntoViewIfNeeded();
  await expect(image).toBeVisible();
  expect(
    await image.evaluate(
      (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `docs/phase1/screenshots/accueil-${info.project.name}.png`,
    fullPage: true,
  });
});

test("PH1 annuaire, fiche et retour aux cours, publications uniquement", async ({ page }, info) => {
  await publicData(page);
  await page.goto("/enseignants");
  await expect(page.getByRole("heading", { name: "Nos professeurs" })).toBeVisible();
  await expect(page.getByText("Profil brouillon QA")).toHaveCount(0);
  await page.getByRole("link", { name: /Professeur QA/ }).click();
  await expect(page.getByRole("heading", { name: "Professeur QA", exact: true })).toBeVisible();
  await expect(page.getByText("Audio en attente QA")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Enseignement de recette/ })).toHaveAttribute(
    "href",
    "/majliss/ecouter/qa-recording",
  );
  await expect(page.getByRole("link", { name: "Explorer les cours" })).toHaveAttribute(
    "href",
    "/apprendre",
  );
  await expect(page.getByRole("heading", { name: "Qui enseigne ?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quels ouvrages ?" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quelles sources ?" })).toBeVisible();
  if ((page.viewportSize()?.width ?? 0) < 768) {
    const links = page.getByRole("navigation", { name: "Navigation mobile" }).getByRole("link");
    await expect(links).toHaveCount(6);
    const positions = await links.evaluateAll((items) =>
      items.map((item) => item.getBoundingClientRect().top),
    );
    expect(new Set(positions).size).toBe(1);
  }
  await noOverflow(page);
  await page.screenshot({
    path: `docs/phase1/screenshots/professeur-${info.project.name}.png`,
    fullPage: true,
  });
});

test("PH1 professeur absent et erreur réseau permettent de continuer", async ({ page }) => {
  await publicData(page);
  await page.goto("/enseignants/private");
  await expect(page.getByRole("heading", { name: "Professeur introuvable" })).toBeVisible();
  await page.unroute("https://karanta-offline-ui.invalid/**");
  await publicData(page, true);
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("indisponibles");
  await expect(page.getByRole("button", { name: "Réessayer" })).toBeVisible();
});

// UI contracts use a fictitious endpoint. Real Auth/RLS validation is separate.
test("PH1 parent : erreur conservée, création guidée et choix de parcours", async ({
  page,
}, info) => {
  const actor = "00000000-0000-4000-8000-000000000002";
  const parentProfile = {
    id: actor,
    auth_user_id: actor,
    organization_id: org,
    full_name: "Parent QA",
    preferred_name: null,
    profile_type: "adult",
    status: "active",
  };
  const user = {
    id: actor,
    aud: "authenticated",
    role: "authenticated",
    email: "parent@example.invalid",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Parent QA" },
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${btoa(JSON.stringify({ sub: actor, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" }))}.qa`;
  await page.addInitScript(
    ({ user, token }) => {
      localStorage.setItem(
        "sb-karanta-offline-ui-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "qa-refresh",
          token_type: "bearer",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user,
        }),
      );
    },
    { user, token },
  );
  let childProfile: typeof parentProfile | undefined;
  let attempts = 0;
  let booksUnavailable = true;
  const books = [
    {
      id: "qa-first-book",
      subject_id: "qa-subject",
      title: "Premier livre QA",
      description: "Livre de recette uniquement",
      level: "Débutant",
    },
    {
      id: "qa-advanced-book",
      subject_id: "qa-subject",
      title: "Livre avancé QA",
      description: null,
      level: "Avancé",
    },
  ];
  await page.route("https://karanta-offline-ui.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    const table = url.pathname.split("/").at(-1);
    if (url.pathname.includes("/auth/")) return route.fulfill({ json: user });
    if (table === "books" && url.searchParams.has("organization_id")) {
      expect(url.searchParams.get("organization_id")).toBe(`eq.${org}`);
      expect(url.searchParams.get("status")).toBe("eq.published");
      if (booksUnavailable)
        return route.fulfill({ status: 403, json: { message: "QA books unavailable" } });
      return route.fulfill({ json: books });
    }
    if (table === "create_my_child_profile") {
      const input = route.request().postDataJSON();
      expect(input.p_guardian_consent).toBe(true);
      expect(input.p_name).toBe("Enfant QA");
      expect(input).not.toHaveProperty("parent_id");
      attempts++;
      if (attempts === 1)
        return route.fulfill({ status: 503, json: { message: "Temporary QA network failure" } });
      childProfile = {
        ...parentProfile,
        id: input.p_request_id,
        auth_user_id: null as unknown as string,
        full_name: input.p_name,
        profile_type: "child",
      };
      return route.fulfill({ json: input.p_request_id });
    }
    let rows: unknown[] = [];
    if (table === "organizations")
      rows = [
        {
          id: org,
          name: "Karanta QA",
          slug: "diakspora",
          logo_url: null,
          primary_color: "#173F2B",
          accent_color: "#B56E26",
          feature_flags: {
            profile_identity_v2: true,
            family_onboarding_v1: true,
            pedagogy_v1: true,
          },
        },
      ];
    if (table === "books") rows = books;
    if (table === "subjects")
      rows = [{ id: "qa-subject", name: "Discipline QA", slug: "qa-subject" }];
    if (table === "organization_memberships")
      rows = [
        {
          id: "qa-membership",
          organization_id: org,
          role: "parent",
          status: "active",
          is_default: true,
        },
      ];
    if (table === "profiles")
      rows = url.searchParams.has("auth_user_id")
        ? [parentProfile]
        : [parentProfile, ...(childProfile ? [childProfile] : [])];
    if (table === "family_relationships")
      rows = childProfile ? [{ child_profile_id: childProfile.id }] : [];
    if (table === "learner_profiles" && childProfile)
      rows = [
        {
          id: "qa-learner",
          profile_id: childProfile.id,
          organization_id: org,
          full_name: childProfile.full_name,
          preferred_name: null,
          status: "active",
          access_mode: "guardian_managed",
        },
      ];
    const single = route.request().headers().accept?.includes("vnd.pgrst.object");
    await route.fulfill({ json: single ? (rows[0] ?? null) : rows });
  });
  await page.goto("/parent");
  await expect(page.getByRole("heading", { name: /Un enfant, un parcours/ })).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un enfant" }).click();
  await page.getByLabel("Prénom ou nom d’usage de l’enfant").fill("Enfant QA");
  await expect(page.getByRole("button", { name: "Créer le profil de mon enfant" })).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Créer le profil de mon enfant" }).click();
  await expect(page.getByRole("alert")).toContainText("informations sont conservées");
  await expect(page.getByLabel("Prénom ou nom d’usage de l’enfant")).toHaveValue("Enfant QA");
  await page.getByRole("button", { name: "Créer le profil de mon enfant" }).click();
  await expect(page.getByRole("status")).toContainText("créé et sélectionné");
  await expect(page.getByRole("button", { name: "Enfant QA", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "Un premier livre pour Enfant QA" }).getByRole("alert"),
  ).toContainText("pas disponibles");
  booksUnavailable = false;
  await page.getByRole("button", { name: "Réessayer les livres" }).click();
  await expect(page.getByRole("radio")).toHaveCount(2);
  await page.getByLabel("Niveau du parcours").selectOption("Débutant");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Découvrir le premier cours" })).toHaveCount(0);
  await page.getByRole("radio", { name: /Premier livre QA/ }).check();
  await expect(page.getByRole("link", { name: "Découvrir le premier cours" })).toHaveAttribute(
    "href",
    "/apprendre/livre/qa-first-book",
  );
  // Changing level must clear a previous choice rather than open the wrong book.
  await page.getByLabel("Niveau du parcours").selectOption("Avancé");
  await expect(page.getByRole("link", { name: "Découvrir le premier cours" })).toHaveCount(0);
  await page.getByLabel("Niveau du parcours").selectOption("Débutant");
  await page.getByRole("radio", { name: /Premier livre QA/ }).check();
  await expect(page.getByRole("link", { name: "Trouver une classe adaptée" })).toHaveAttribute(
    "href",
    "/parcours",
  );
  await noOverflow(page);
  await page.screenshot({
    path: `docs/phase1/screenshots/parent-${info.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "Découvrir le premier cours" }).click();
  await expect(page.getByRole("heading", { name: "Premier livre QA", exact: true })).toBeVisible();
  await page.goto("/parent");
  await page.getByLabel("Profil actif").selectOption(actor);
  await expect(page.getByRole("region", { name: "Un premier livre pour Enfant QA" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Enfant QA", exact: true }).click();
  await expect(page.getByRole("region", { name: "Un premier livre pour Enfant QA" })).toBeVisible();
  await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
});
