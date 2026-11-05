"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type WishlistState = { error?: string; saved?: boolean } | undefined;

export async function addToWishlist(fragranceId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  await supabase
    .from("cologne_wishlist")
    .upsert({ fragrance_id: fragranceId }, { onConflict: "user_id,fragrance_id", ignoreDuplicates: true });
  refresh();
}

export async function removeFromWishlist(id: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("cologne_wishlist").delete().eq("id", id).eq("user_id", user.id);
  refresh();
}

export async function updateWishlistItem(id: string, _prev: WishlistState, form: FormData): Promise<WishlistState> {
  const user = await getCurrentUser();

  const priority = Number(form.get("priority"));
  const rawPrice = String(form.get("target_price") ?? "").trim();
  const rawSize = String(form.get("desired_size") ?? "").trim();
  const unit = form.get("size_unit") === "oz" ? "oz" : "ml";
  const target = rawPrice === "" ? null : Number(rawPrice);
  const size = rawSize === "" ? null : Number(rawSize);

  if (![1, 2, 3].includes(priority)) return { error: "Pick a priority." };
  if (target !== null && (!Number.isFinite(target) || target < 0 || target > 100000)) {
    return { error: "Target price doesn't look right." };
  }
  if (size !== null && (!Number.isFinite(size) || size <= 0 || size > 2000)) {
    return { error: "Size doesn't look right." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cologne_wishlist")
    .update({
      priority,
      target_price: target,
      desired_size_ml: size === null ? null : unit === "oz" ? Math.round(size * 29.5735) : size,
      notes: String(form.get("notes") ?? "").trim() || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save. Please try again." };

  refresh();
  return { saved: true };
}
