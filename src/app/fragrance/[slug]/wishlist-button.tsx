"use client";

import Link from "next/link";
import { useTransition } from "react";
import { addToWishlist } from "@/app/wishlist/actions";

export function WishlistButton({ fragranceId, onWishlist }: { fragranceId: string; onWishlist: boolean }) {
  const [pending, startTransition] = useTransition();

  if (onWishlist) {
    return (
      <Link href="/wishlist" className="rounded-full border border-accent px-5 py-2 text-sm text-accent hover:bg-accent/10">
        ♥ On your wishlist
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => addToWishlist(fragranceId))}
      className="rounded-full border border-line px-5 py-2 text-sm hover:border-accent disabled:opacity-50"
    >
      {pending ? "Adding…" : "♡ Add to wishlist"}
    </button>
  );
}
