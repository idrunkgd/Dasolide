import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // On vérifie que l'utilisateur EXISTE encore en base, et pas seulement que le
  // cookie est valide. Sinon un cookie orphelin — typiquement après un
  // `npm run db:reset` qui recrée le compte de démonstration avec un nouvel
  // identifiant — ferait boucler /login et / indéfiniment.
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="relative flex min-h-dvh flex-col justify-center overflow-hidden px-5 py-10">
      {/* Halo d'ambiance — discret, il donne de la profondeur sans distraire */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full opacity-25 blur-[100px]"
        style={{ background: "var(--accent)" }}
      />
      <div className="relative mx-auto w-full max-w-sm">{children}</div>
    </div>
  );
}
