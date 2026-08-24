import type { Metadata, Viewport } from "next";
import { getCurrentUser } from "@/lib/auth";
import { ThemeScript } from "@/components/layout/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Muscu", template: "%s · Muscu" },
  description:
    "Suivi de musculation, nutrition et progression. Séances, charges, records, macros et mensurations.",
  applicationName: "Muscu",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Muscu" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-icon.png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Le thème choisi est appliqué dès le rendu serveur : aucun flash au chargement.
  const user = await getCurrentUser().catch(() => null);
  const theme = user?.settings?.theme ?? "dark";
  const accent = user?.settings?.accentColor ?? "lime";

  return (
    <html
      lang="fr"
      data-theme={theme === "system" ? undefined : theme}
      data-accent={accent}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <ThemeScript initialTheme={theme} initialAccent={accent} />
        {children}
      </body>
    </html>
  );
}
