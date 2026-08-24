"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="lg"
      fullWidth
      loading={pending}
      onClick={() => startTransition(() => logoutAction())}
    >
      <LogOut className="h-4 w-4" />
      Se déconnecter
    </Button>
  );
}
