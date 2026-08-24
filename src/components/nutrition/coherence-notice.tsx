import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Encart de contrôle de cohérence énergétique.
 *
 * Partout où l'utilisateur saisit à la fois des calories et des macros, on
 * compare 4 × protéines + 4 × glucides + 9 × lipides au total annoncé : c'est
 * la façon la plus simple d'attraper une faute de frappe sur une étiquette.
 */
export function CoherenceNotice({
  inconsistent,
  title,
  detail,
}: {
  inconsistent: boolean;
  title: string;
  detail: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border p-3.5",
        inconsistent ? "border-warning/40 bg-warning/10" : "border-border bg-surface-2"
      )}
    >
      {inconsistent ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
      ) : (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
      )}
      <div className="min-w-0 text-sm">
        <p className={cn("font-medium", inconsistent ? "text-warning" : "text-success")}>{title}</p>
        <p className="tabular mt-0.5 text-xs text-muted">{detail}</p>
      </div>
    </div>
  );
}
