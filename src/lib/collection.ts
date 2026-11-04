import "server-only";
import { getCurrentUser } from "@/lib/auth";
import type { Bottle, FragranceSummary } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export { CONCENTRATIONS, ROTATIONS } from "@/lib/constants";
export type { Bottle, FragranceSummary, Rotation } from "@/lib/constants";

const BOTTLE_SELECT = `
  id, size_ml, concentration, fill_level, purchase_price, purchase_date,
  purchased_from, my_rating, rotation, notes, created_at,
  fragrance:cologne_fragrances!inner (id, brand, name, concentration, release_year, image_url)
`;

// numeric columns come back from PostgREST as strings; normalise them.
function toBottle(row: Record<string, unknown>): Bottle {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(row as unknown as Bottle),
    size_ml: num(row.size_ml),
    purchase_price: num(row.purchase_price),
  };
}

export async function getMyBottles(): Promise<Bottle[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cologne_bottles")
    .select(BOTTLE_SELECT)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toBottle);
}

export async function getMyBottle(id: string): Promise<Bottle | null> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cologne_bottles")
    .select(BOTTLE_SELECT)
    .eq("user_id", user.id)
    .eq("id", id)
    .maybeSingle();
  if (error) return null; // malformed id etc.
  return data ? toBottle(data) : null;
}

export async function getCatalog(): Promise<FragranceSummary[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cologne_fragrances")
    .select("id, brand, name, concentration, release_year, image_url")
    .order("brand")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getStoreNames(): Promise<string[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase.from("cologne_stores").select("name").order("sort_order");
  return (data ?? []).map((s) => s.name);
}
