/**
 * Tests de bout en bout des trois parcours principaux (§58).
 *
 * Prérequis : l'application doit tourner (`npm run dev` ou `npm start`) et la
 * base doit contenir les données de démonstration (`npm run db:seed`).
 *
 *   node scripts/e2e.mjs
 *   BASE=http://localhost:4000 node scripts/e2e.mjs
 *
 * Les captures d'écran sont écrites dans ./e2e-screenshots.
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";
const SHOTS = process.env.SHOTS ?? "./e2e-screenshots";
fs.mkdirSync(SHOTS, { recursive: true });

const problems = [];
let stepNo = 0;

function log(msg) {
  console.log(msg);
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: "fr-FR",
  timezoneId: "Europe/Brussels",
  hasTouch: true,
  isMobile: true,
});
const page = await ctx.newPage();

page.on("pageerror", (e) => problems.push(`PAGEERROR ${page.url()} :: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") {
    const t = m.text();
    if (t.includes("Failed to load resource") && t.includes("404")) return;
    problems.push(`CONSOLE ${page.url()} :: ${t.slice(0, 240)}`);
  }
});
page.on("response", (r) => {
  if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
});

async function shot(name) {
  stepNo++;
  await page.screenshot({ path: `${SHOTS}/${String(stepNo).padStart(2, "0")}-${name}.png` });
}

async function login(email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 40000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");
}

// ===========================================================================
// WORKFLOW 1 — nouvel utilisateur : inscription → onboarding → séance complète
// ===========================================================================
log("\n=== WORKFLOW 1 : inscription → onboarding → séance ===");

const email = `test${Date.now()}@muscu.app`;
await page.goto(`${BASE}/inscription`, { waitUntil: "networkidle" });
await page.fill('input[name="name"]', "Gérald");
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', "motdepasse123");
await page.fill('input[name="confirm"]', "motdepasse123");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding", { timeout: 30000 });
log("  ✔ inscription → onboarding");
await shot("onboarding-1");

// Étape 1 : prénom (prérempli)
await page.click('button:has-text("Continuer")');
// Étape 2 : corps
await page.waitForSelector('input[placeholder="178"]');
await page.fill('input[placeholder="178"]', "179");
await page.fill('input[placeholder="84.2"]', "86");
await page.fill('input[placeholder="80"]', "81");
await shot("onboarding-2");
await page.click('button:has-text("Continuer")');
// Étape 3 : objectif
await page.click('button:has-text("Recomposition corporelle")');
await shot("onboarding-3");
await page.click('button:has-text("Continuer")');
// Étape 4 : rythme
await page.click('button:has-text("Continuer")');
// Étape 5 : matériel
await page.click('button:has-text("Continuer")');
// Étape 6 : programme
await shot("onboarding-6");
await page.click('button:has-text("Commencer")');
await page.waitForURL(BASE + "/", { timeout: 40000 });
await page.waitForLoadState("networkidle");
log("  ✔ onboarding terminé → dashboard");
await shot("dashboard-nouveau");

const bodyText = await page.locator("body").innerText();
if (!bodyText.includes("Gérald")) problems.push("Le prénom n'apparaît pas sur le dashboard");

// Démarrer la séance du jour
const startBtn = page.locator('button:has-text("Démarrer la séance")').first();
if ((await startBtn.count()) === 0) {
  // Jour de repos : on lance une séance libre puis on ajoute un exercice
  await page.click('button:has-text("Séance libre")');
} else {
  await startBtn.click();
}
await page.waitForURL("**/seance/**", { timeout: 40000 });
await page.waitForLoadState("networkidle");
log("  ✔ séance démarrée");
await shot("seance-depart");

// S'il n'y a aucun exercice (séance libre), en ajouter un
if ((await page.locator('text=Cette séance ne contient aucun exercice').count()) > 0) {
  await page.click('button:has-text("Ajouter un exercice")');
  await page.waitForSelector('input[placeholder="Rechercher un exercice…"]');
  await page.fill('input[placeholder="Rechercher un exercice…"]', "developpe couche");
  await page.waitForTimeout(700);
  await page.locator('div[role="dialog"] button').filter({ hasText: "Développé couché" }).first().click();
  await page.waitForTimeout(600);
}

// Encoder et valider toutes les séries de l'exercice courant
async function fillAndValidateRows(weight, reps) {
  const rows = page.locator("[data-set-row]");
  const n = await rows.count();
  let validated = 0;
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    if ((await row.getAttribute("data-set-completed")) === "1") continue;
    const w = row.locator('input[data-field="weight"]');
    const r = row.locator('input[data-field="reps"]');
    if ((await w.count()) > 0) await w.fill(String(weight));
    if ((await r.count()) > 0) await r.fill(String(reps));
    await row.locator('button[aria-label="Valider la série"]').click();
    await page.waitForTimeout(350);
    validated++;
    const skip = page.locator('button[aria-label="Passer le repos"]');
    if ((await skip.count()) > 0) {
      await skip.click();
      await page.waitForTimeout(250);
    }
  }
  return validated;
}

// Première série : on vérifie le déclenchement du timer
const firstRow = page.locator("[data-set-row]").first();
await firstRow.locator('input[data-field="weight"]').fill("60");
await firstRow.locator('input[data-field="reps"]').fill("10");
await shot("seance-encodage");
await firstRow.locator('button[aria-label="Valider la série"]').click();
await page.waitForTimeout(900);

const afterValidate = await page.locator("body").innerText();
if (!/repos/i.test(afterValidate)) problems.push("Le timer de repos ne démarre pas après validation");
else log("  ✔ timer de repos démarré automatiquement");
await shot("seance-timer");

const skipBtn = page.locator('button[aria-label="Passer le repos"]');
if ((await skipBtn.count()) > 0) await skipBtn.click();
await page.waitForTimeout(300);

const validated = await fillAndValidateRows(60, 9);
log(`  ✔ ${validated + 1} séries validées`);

// Vérifier que la valeur encodée a bien été conservée
const keptWeight = await page.locator('[data-set-row] input[data-field="weight"]').first().inputValue();
if (keptWeight !== "60") problems.push(`Valeur de poids non conservée : "${keptWeight}"`);

// Ajouter une série
const beforeAdd = await page.locator("[data-set-row]").count();
await page.click('button:has-text("Ajouter une série")');
await page.waitForTimeout(500);
const afterAdd = await page.locator("[data-set-row]").count();
if (afterAdd <= beforeAdd) problems.push("« Ajouter une série » n'ajoute pas de ligne");
else log("  ✔ ajout d'une série");
await fillAndValidateRows(62.5, 8);

// Parcourir les exercices suivants
for (let e = 0; e < 6; e++) {
  const next = page.locator('button:has-text("Suivant")');
  if ((await next.count()) === 0) break;
  await next.click();
  await page.waitForTimeout(600);
  await fillAndValidateRows(40, 10);
}
log("  ✔ tous les exercices encodés");

// Terminer la séance
await page.locator('button:has-text("Terminer")').first().click();
await page.waitForTimeout(600);
await shot("seance-resume-avant");
const resumeText = await page.locator('div[role="dialog"]').innerText();
if (!/volume total/i.test(resumeText)) problems.push("Le résumé de fin n'affiche pas le volume");

await page.locator('div[role="dialog"] button', { hasText: /^Terminer$/ }).click();
await page.waitForTimeout(800);
await shot("seance-journal");
const saveBtn = page.locator('button:has-text("Enregistrer la séance")');
await saveBtn.waitFor({ timeout: 15000 });
await saveBtn.click();
await page.waitForTimeout(9000);
if (!page.url().includes("/resume")) {
  const dlg = await page.locator('div[role="dialog"]').innerText().catch(() => "(pas de dialogue)");
  problems.push("Enregistrement de la séance : pas de redirection. Dialogue = " + dlg.replace(/\s+/g, " ").slice(0, 300));
  await shot("seance-echec-enregistrement");
} else {
  await page.waitForLoadState("networkidle");
}
await page.waitForLoadState("networkidle");
log("  ✔ séance enregistrée");
await shot("seance-resume");

const summary = await page.locator("body").innerText();
if (!summary.includes("NOUVEAU RECORD") && !summary.includes("Nouveau record")) {
  problems.push("Aucun record détecté sur la première séance (attendu)");
} else {
  log("  ✔ record détecté et affiché");
}

// Statistiques mises à jour
await page.goto(`${BASE}/statistiques`, { waitUntil: "networkidle" });
const stats = await page.locator("body").innerText();
if (!/volume total/i.test(stats)) {
  problems.push("Statistiques non alimentées après la séance");
} else log("  ✔ statistiques alimentées");
await shot("statistiques-nouveau");

// ===========================================================================
// WORKFLOW 2 — nutrition
// ===========================================================================
log("\n=== WORKFLOW 2 : nutrition ===");
await page.goto(`${BASE}/nutrition`, { waitUntil: "networkidle" });
await shot("nutrition-vide");

const before = await page.locator("body").innerText();
// Ajouter un aliment au petit déjeuner
const addButtons = page.locator('a[href*="/nutrition/recherche"]');
if ((await addButtons.count()) === 0) {
  problems.push("Aucun bouton d'ajout d'aliment sur le journal");
} else {
  await addButtons.first().click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1800);
  const search = page.locator('input[placeholder="Rechercher un aliment…"]').first();
  if ((await search.count()) > 0) {
    await search.fill("flocons");
    await page.waitForTimeout(900);
  }
  await shot("nutrition-recherche");
  const firstResult = page.locator("button").filter({ hasText: /Flocons/i }).first();
  if ((await firstResult.count()) > 0) {
    await firstResult.click();
    await page.waitForTimeout(700);
    await shot("nutrition-quantite");
    const confirm = page.locator("button").filter({ hasText: /Ajouter/i }).last();
    await confirm.click();
    await page.waitForTimeout(2500);
    await page.waitForLoadState("domcontentloaded");
    const after = await page.locator("body").innerText();
    if (after === before) problems.push("Le journal n'a pas changé après l'ajout d'un aliment");
    else log("  ✔ aliment ajouté, macros recalculées");
  } else {
    problems.push("Aucun résultat de recherche d'aliment");
  }
}
await page.goto(`${BASE}/nutrition`, { waitUntil: "networkidle" });
await shot("nutrition-apres");

// ===========================================================================
// WORKFLOW 3 — poids
// ===========================================================================
log("\n=== WORKFLOW 3 : poids ===");
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const weightField = page.locator('input[aria-label^="Poids en"]');
if ((await weightField.count()) === 0) {
  problems.push("Carte d'encodage du poids absente du dashboard");
} else {
  await weightField.fill("85.4");
  await page.locator('button:has-text("OK")').first().click();
  await page.waitForTimeout(1500);
  log("  ✔ poids encodé depuis l'accueil");
}
await page.goto(`${BASE}/progression/poids`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const weightPage = await page.locator("body").innerText();
if (!weightPage.includes("85,4") && !weightPage.includes("85.4")) {
  problems.push("Le poids encodé n'apparaît pas sur la page de suivi");
} else log("  ✔ poids visible sur la page de suivi");
await shot("progression-poids-nouveau");

// ===========================================================================
// PARCOURS COMPLET — compte de démonstration
// ===========================================================================
log("\n=== Toutes les pages (compte démo) ===");
await page.goto(`${BASE}/profil`, { waitUntil: "networkidle" });
const logout = page.locator('button:has-text("Se déconnecter")');
if ((await logout.count()) > 0) {
  await logout.click();
  await page.waitForURL("**/login", { timeout: 30000 });
}
await login("demo@muscu.app", "demo1234");

const routes = [
  "/",
  "/entrainement",
  "/programmes",
  "/exercices",
  "/historique",
  "/calendrier",
  "/statistiques",
  "/records",
  "/muscles",
  "/nutrition",
  "/nutrition/repas",
  "/nutrition/recettes",
  "/nutrition/objectifs",
  "/progression",
  "/progression/poids",
  "/progression/mensurations",
  "/progression/photos",
  "/progression/objectifs",
  "/profil",
  "/parametres",
  "/notifications",
  "/admin",
  "/offline",
];

for (const route of routes) {
  const res = await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1400);
  const status = res?.status() ?? 0;
  const text = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  const ok = status === 200 && text.length > 40;
  log(`  ${ok ? "✔" : "✗"} ${route} (${status}) ${text.slice(0, 70)}`);
  if (!ok) problems.push(`Route ${route} : statut ${status}, contenu ${text.length} car.`);
  await shot(`page${route.replace(/\//g, "_") || "_racine"}`);
}

// Une page de détail de chaque type
await page.goto(`${BASE}/exercices`, { waitUntil: "networkidle" });
const firstExercise = page.locator('a[href^="/exercices/"]').first();
if ((await firstExercise.count()) > 0) {
  await firstExercise.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  log(`  ✔ fiche exercice : ${page.url()}`);
  await shot("fiche-exercice");
}

await page.goto(`${BASE}/historique`, { waitUntil: "networkidle" });
const firstSession = page.locator('a[href^="/historique/"]').first();
if ((await firstSession.count()) > 0) {
  await firstSession.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  log(`  ✔ détail de séance : ${page.url()}`);
  await shot("detail-seance");
}

await page.goto(`${BASE}/programmes`, { waitUntil: "networkidle" });
const firstProgram = page.locator('a[href^="/programmes/"]').first();
if ((await firstProgram.count()) > 0) {
  await firstProgram.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(900);
  log(`  ✔ éditeur de programme : ${page.url()}`);
  await shot("editeur-programme");
}

// Thème clair
await page.goto(`${BASE}/parametres`, { waitUntil: "networkidle" });
const lightBtn = page.locator('button:has-text("Clair")').first();
if ((await lightBtn.count()) > 0) {
  await lightBtn.click();
  await page.waitForTimeout(900);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await shot("theme-clair");
  await page.goto(`${BASE}/parametres`, { waitUntil: "networkidle" });
  await page.locator('button:has-text("Sombre")').first().click();
  await page.waitForTimeout(700);
  log("  ✔ bascule thème clair / sombre");
}

// Bureau
const desktop = await ctx.newPage();
await desktop.goto(`${BASE}/`, { waitUntil: "networkidle" });
await desktop.setViewportSize({ width: 1440, height: 900 });
await desktop.waitForTimeout(500);
await desktop.screenshot({ path: `${SHOTS}/99-bureau.png` });
await desktop.setViewportSize({ width: 820, height: 1180 });
await desktop.goto(`${BASE}/entrainement`, { waitUntil: "networkidle" });
await desktop.screenshot({ path: `${SHOTS}/99-tablette.png` });
log("  ✔ captures bureau et tablette");

await browser.close();

console.log("\n========================================");
if (problems.length) {
  console.log(`${problems.length} PROBLÈME(S) :`);
  for (const p of [...new Set(problems)]) console.log("  - " + p);
  process.exitCode = 1;
} else {
  console.log("AUCUN PROBLÈME DÉTECTÉ.");
}
