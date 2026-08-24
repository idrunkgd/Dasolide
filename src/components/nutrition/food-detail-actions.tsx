"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, useToast } from "@/components/ui/misc";
import { deleteFoodAction, toggleFoodFavoriteAction } from "@/server/actions/nutrition";

/** Favori, modification et suppression d'une fiche aliment. */
export function FoodDetailActions({
  foodId,
  isFavorite,
  isOwned,
}: {
  foodId: string;
  isFavorite: boolean;
  isOwned: boolean;
}) {
  const [favorite, setFavorite] = useState(isFavorite);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function toggleFavorite() {
    const next = !favorite;
    setFavorite(next);
    startTransition(async () => {
      const res = await toggleFoodFavoriteAction(foodId);
      if (res.ok) {
        setFavorite(res.data?.isFavorite ?? next);
        toast.show(res.data?.isFavorite ? "Ajouté aux favoris" : "Retiré des favoris");
      } else {
        setFavorite(!next);
        toast.show(res.error, "error");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteFoodAction(foodId);
      if (res.ok) {
        toast.show("Aliment supprimé");
        router.push("/nutrition");
        router.refresh();
      } else {
        toast.show(res.error, "error");
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-2">
        <Button variant={favorite ? "primary" : "secondary"} size="lg" fullWidth onClick={toggleFavorite}>
          <Star className={favorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          {favorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        </Button>

        {isOwned ? (
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/nutrition/aliments/${foodId}?edit=1`}>
              <Button variant="secondary" size="lg" fullWidth>
                <Pencil className="h-4 w-4" />
                Modifier
              </Button>
            </Link>
            <Button variant="secondary" size="lg" fullWidth onClick={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4 text-danger" />
              Supprimer
            </Button>
          </div>
        ) : null}
      </div>

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Supprimer cet aliment ?"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => setConfirming(false)}>
              Annuler
            </Button>
            <Button variant="danger" size="lg" loading={pending} onClick={remove}>
              Supprimer
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Les lignes déjà encodées dans ton journal sont conservées : leurs macros ont été figées à l&apos;ajout.
          En revanche, l&apos;aliment disparaîtra de tes repas enregistrés et de tes recettes.
        </p>
      </Sheet>

      {toast.node}
    </>
  );
}
