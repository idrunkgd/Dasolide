import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { ProgramEditor } from "@/components/program/program-editor";
import { emptyProgram } from "@/components/program/types";

export const dynamic = "force-dynamic";

export default async function NewProgramPage() {
  await requireUserId();

  return (
    <>
      <PageHeader
        title="Nouveau programme"
        subtitle="Journées, exercices, séries et repos"
        back="/programmes"
      />
      <ProgramEditor initial={emptyProgram()} />
    </>
  );
}
