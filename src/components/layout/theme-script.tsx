/**
 * Applique le thème avant la peinture pour éviter tout flash.
 * - "system" suit la préférence de l'OS ;
 * - le choix explicite de l'utilisateur est stocké côté serveur (UserSettings)
 *   et dupliqué en localStorage pour les écrans publics (login, inscription).
 */
export function ThemeScript({
  initialTheme,
  initialAccent,
}: {
  initialTheme: string;
  initialAccent: string;
}) {
  const code = `
(function () {
  try {
    var root = document.documentElement;
    var theme = ${JSON.stringify(initialTheme)};
    var accent = ${JSON.stringify(initialAccent)};
    var storedTheme = localStorage.getItem("muscu.theme");
    var storedAccent = localStorage.getItem("muscu.accent");
    if (!root.dataset.themeLocked) {
      if (theme === "system" || (!theme && storedTheme === "system")) {
        var dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.setAttribute("data-theme", dark ? "dark" : "light");
      } else {
        root.setAttribute("data-theme", theme || storedTheme || "dark");
      }
    }
    root.setAttribute("data-accent", accent || storedAccent || "lime");
    localStorage.setItem("muscu.theme", theme);
    localStorage.setItem("muscu.accent", accent);
  } catch (e) {}
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} suppressHydrationWarning />;
}
