import "server-only";
import { getCurrentUser } from "@/lib/auth";
import type { Fragrance, FragranceSummary } from "@/lib/constants";
import { geminiApiKey } from "@/lib/lookup";
import { createClient } from "@/lib/supabase/server";

const FRAGRANCE_COLUMNS = `
  id, slug, brand, name, concentration, release_year, image_url, gender, perfumers,
  description, accords, notes_top, notes_heart, notes_base, rating_overall,
  rating_votes, longevity, sillage, value_rating, seasons, time_of_day,
  review_summary, similar_fragrances, sources, lookup_status, looked_up_at
`;

// numeric columns come back from PostgREST as strings; normalise them.
function toFragrance(row: Record<string, unknown>): Fragrance {
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  return {
    ...(row as unknown as Fragrance),
    rating_overall: num(row.rating_overall),
    longevity: num(row.longevity),
    sillage: num(row.sillage),
    value_rating: num(row.value_rating),
  };
}

export async function getFragrance(slug: string): Promise<Fragrance | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cologne_fragrances")
    .select(FRAGRANCE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return data ? toFragrance(data) : null;
}

export type SearchHit = FragranceSummary & {
  accords: Fragrance["accords"];
  lookup_status: Fragrance["lookup_status"];
};

// Typo- and accent-tolerant search (see cologne_search in the migrations).
export async function searchCatalog(query: string): Promise<SearchHit[]> {
  await getCurrentUser();
  const q = query.trim();
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("cologne_search", { q })
    .select("id, slug, brand, name, concentration, release_year, image_url, accords, lookup_status");
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchHit[];
}

// Bottles of this fragrance on the current user's shelf.
export async function getMyBottleIds(fragranceId: string): Promise<string[]> {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("cologne_bottles")
    .select("id")
    .eq("user_id", user.id)
    .eq("fragrance_id", fragranceId);
  return (data ?? []).map((b) => b.id);
}

// The live lookup switches on once a Gemini API key is configured.
export function lookupEnabled() {
  return Boolean(geminiApiKey());
}
