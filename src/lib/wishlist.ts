import "server-only";
import { getCurrentUser } from "@/lib/auth";
import type { Accord, FragranceSummary } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export type WishlistItem = {
  id: string;
  priority: 1 | 2 | 3; // 1 = must have
  target_price: number | null;
  desired_size_ml: number | null;
  notes: string | null;
  created_at: string;
  fragrance: FragranceSummary & { accords: Accord[] };
};

export const PRIORITIES = [
  { id: 1, label: "Must have" },
  { id: 2, label: "Want" },
  { id: 3, label: "Maybe" },
] as const;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function getWishlist(): Promise<WishlistItem[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cologne_wishlist")
    .select(
      "id, priority, target_price, desired_size_ml, notes, created_at, fragrance:cologne_fragrances!inner (id, slug, brand, name, concentration, release_year, image_url, accords)",
    )
    .eq("user_id", user.id)
    .order("priority")
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((w) => ({
    ...(w as unknown as WishlistItem),
    target_price: num(w.target_price),
    desired_size_ml: num(w.desired_size_ml),
  }));
}

export async function getWishlistEntry(fragranceId: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cologne_wishlist")
    .select("id, desired_size_ml")
    .eq("user_id", user.id)
    .eq("fragrance_id", fragranceId)
    .maybeSingle();
  return data ? { id: data.id, desired_size_ml: num(data.desired_size_ml) } : null;
}
