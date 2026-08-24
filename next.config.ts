import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Sortie autonome : Next.js trace les dépendances réellement utilisées et
  // produit .next/standalone, ce qui donne une image Docker légère.
  output: "standalone",
  // Sans cela, Next.js remonte l'arborescence à la recherche d'un lockfile et
  // peut choisir un dossier parent comme racine du projet.
  outputFileTracingRoot: path.resolve(process.cwd()),
  // Ces paquets embarquent du code natif ou des `require` dynamiques : ils
  // doivent rester en dehors du bundle serveur.
  serverExternalPackages: [
    "bcryptjs",
    "better-sqlite3",
    "@prisma/adapter-better-sqlite3",
    "@prisma/client",
  ],
  experimental: {
    // Les server actions reçoivent des photos de progression encodées en base64.
    serverActions: {
      bodySizeLimit: "8mb",
      // Derrière un reverse proxy, Next.js compare l'origine de la requête à
      // l'hôte. Si les Server Actions sont refusées après déploiement, lister
      // le domaine ici via ALLOWED_ORIGINS="muscu.mondomaine.be".
      allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
