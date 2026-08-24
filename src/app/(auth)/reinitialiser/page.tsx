import type { Metadata } from "next";
import { ResetForm } from "./reset-form";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="animate-fade-up">
      <Wordmark className="mb-8 justify-center" />
      <h1 className="text-center text-2xl font-bold">Nouveau mot de passe</h1>
      <div className="mt-7">
        <ResetForm token={token ?? ""} />
      </div>
    </div>
  );
}
