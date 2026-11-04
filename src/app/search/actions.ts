"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { slugify } from "@/lib/format";
import { lookupEnabled } from "@/lib/fragrance";
import { lookupFragrance, type LookupProfile } from "@/lib/lookup";
import { createClient } from "@/lib/supabase/server";

export type LookupState = { error?: string } | undefined;

// Profile details (everything except the brand/name/concentration identity).
function profileDetails(p: LookupProfile) {
  return {
    release_year: p.release_year,
    gender: p.gender,
    perfumers: p.perfumers,
    description: p.description,
    accords: p.accords,
    notes_top: p.notes_top,
    notes_heart: p.notes_heart,
    notes_base: p.notes_base,
    rating_overall: p.rating_overall,
    rating_votes: p.rating_votes,
    longevity: p.longevity,
    sillage: p.sillage,
    value_rating: p.value_rating,
    seasons: p.seasons,
    time_of_day: p.time_of_day,
    review_summary: p.review_summary,
    similar_fragrances: p.similar_fragrances,
    sources: p.sources,
    lookup_status: "complete",
    looked_up_at: new Date().toISOString(),
  };
}

// Look up a fragrance that isn't in the catalog yet, save it, and open it.
export async function lookupAndSave(_prev: LookupState, form: FormData): Promise<LookupState> {
  await getCurrentUser();
  if (!lookupEnabled()) return { error: "Live lookup isn't switched on yet." };

  const query = String(form.get("q") ?? "").trim().slice(0, 120);
  if (!query) return { error: "Type a fragrance to look up." };

  const result = await lookupFragrance(query);
  if (!result.ok) return { error: result.error };

  const p = result.profile;
  const slug = slugify(p.brand, p.name, p.concentration);
  const supabase = await createClient();
  const { error } = await supabase
    .from("cologne_fragrances")
    .upsert(
      { slug, brand: p.brand, name: p.name, concentration: p.concentration, ...profileDetails(p) },
      { onConflict: "slug" },
    );
  if (error) return { error: "Found it, but couldn't save it. Please try again." };

  redirect(`/fragrance/${slug}`);
}

// Re-run the lookup for an existing catalog entry, keeping its slug.
export async function refreshFragrance(slug: string): Promise<LookupState> {
  await getCurrentUser();
  if (!lookupEnabled()) return { error: "Live lookup isn't switched on yet." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("cologne_fragrances")
    .select("brand, name, concentration")
    .eq("slug", slug)
    .maybeSingle();
  if (!existing) return { error: "That fragrance no longer exists." };

  const result = await lookupFragrance(
    [existing.brand, existing.name, existing.concentration].filter(Boolean).join(" "),
  );
  if (!result.ok) return { error: result.error };

  // Keep the catalog's identity (brand/name/concentration) so bottles stay linked.
  const { error } = await supabase
    .from("cologne_fragrances")
    .update(profileDetails(result.profile))
    .eq("slug", slug);
  if (error) return { error: "Couldn't save the refreshed details." };

  refresh();
}
