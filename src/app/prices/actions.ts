"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { checkStores } from "@/lib/prices/check";
import { createClient } from "@/lib/supabase/server";

export type PriceActionState = { error?: string; message?: string } | undefined;

const MIN_SECONDS_BETWEEN_CHECKS = 60;

// "Check prices": query the stores that allow automated search and save the results.
export async function checkPrices(fragranceId: string): Promise<PriceActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: fragrance } = await supabase
    .from("cologne_fragrances")
    .select("brand, name, concentration, gender")
    .eq("id", fragranceId)
    .maybeSingle();
  if (!fragrance) return { error: "That fragrance no longer exists." };

  // Be polite to the stores: one check per fragrance per minute.
  const { data: last } = await supabase
    .from("cologne_price_checks")
    .select("checked_at")
    .eq("user_id", user.id)
    .eq("fragrance_id", fragranceId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.checked_at).getTime() < MIN_SECONDS_BETWEEN_CHECKS * 1000) {
    return { error: "Prices were just checked. Try again in a minute." };
  }

  const results = await checkStores(fragrance);

  const { data: check, error } = await supabase
    .from("cologne_price_checks")
    .insert({ fragrance_id: fragranceId })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save the price check." };

  const rows: Record<string, unknown>[] = Object.entries(results).flatMap(([store_id, r]): Record<string, unknown>[] =>
    r.status === "ok"
      ? r.offers.map((o) => ({ check_id: check.id, store_id, status: "ok", ...o }))
      : [{ check_id: check.id, store_id, status: r.status, error: "error" in r ? r.error : null }],
  );
  if (rows.length) {
    const { error: pricesError } = await supabase.from("cologne_prices").insert(rows);
    if (pricesError) return { error: "Couldn't save the prices." };
  }

  refresh();
  const found = Object.values(results).filter((r) => r.status === "ok").length;
  return { message: `Checked ${Object.keys(results).length} stores · prices found at ${found}.` };
}

// A price you found yourself on a link-only store, added to the latest check.
export async function addManualPrice(
  fragranceId: string,
  storeId: string,
  _prev: PriceActionState,
  form: FormData,
): Promise<PriceActionState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const price = Number(form.get("price"));
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return { error: "Enter a price." };
  const unit = form.get("size_unit") === "oz" ? "oz" : "ml";
  const rawSize = Number(form.get("size"));
  const size = Number.isFinite(rawSize) && rawSize > 0 ? (unit === "oz" ? Math.round(rawSize * 29.5735) : rawSize) : null;
  const rawUrl = String(form.get("url") ?? "").trim();
  const url = /^https?:\/\//.test(rawUrl) ? rawUrl.slice(0, 500) : null;

  const { data: latest } = await supabase
    .from("cologne_price_checks")
    .select("id")
    .eq("user_id", user.id)
    .eq("fragrance_id", fragranceId)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let checkId = latest?.id;
  if (!checkId) {
    const { data, error } = await supabase
      .from("cologne_price_checks")
      .insert({ fragrance_id: fragranceId })
      .select("id")
      .single();
    if (error) return { error: "Couldn't save the price." };
    checkId = data.id;
  }

  const { error } = await supabase.from("cologne_prices").insert({
    check_id: checkId,
    store_id: storeId,
    status: "ok",
    source: "manual",
    product_title: "Entered manually",
    url,
    size_ml: size,
    price,
    in_stock: true,
    is_tester: form.get("tester") === "on",
  });
  if (error) return { error: "Couldn't save the price." };

  refresh();
  return { message: "Saved." };
}

export async function removePrice(priceId: string) {
  await getCurrentUser();
  const supabase = await createClient();
  // RLS limits this to the user's own prices.
  await supabase.from("cologne_prices").delete().eq("id", priceId).eq("source", "manual");
  refresh();
}
