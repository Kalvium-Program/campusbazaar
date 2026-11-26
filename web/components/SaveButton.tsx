"use client";
import { useRouter } from "next/navigation";
import { useSavedIds, useToggleSaved } from "@/lib/hooks";

export function SaveButton({ id, variant = "icon" }: { id: number; variant?: "icon" | "full" }) {
  const { ids, signedIn } = useSavedIds();
  const toggle = useToggleSaved();
  const router = useRouter();
  const saved = ids.has(id);
  function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) return router.push(`/login?next=/listings/${id}`);
    toggle.mutate({ id, save: !saved });
  }
  return (
    <button type="button" className={variant === "icon" ? `heart${saved ? " on" : ""}` : `btn${saved ? " saved" : ""}`} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save listing"} onClick={click}>
      <span aria-hidden="true">{saved ? "♥" : "♡"}</span>{variant === "full" && (saved ? " Saved" : " Save")}
    </button>
  );
}
