"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CONCENTRATIONS, ROTATIONS } from "@/lib/constants";
import { slugify } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string } | undefined;

const ROTATION_IDS = new Set<string>(ROTATIONS.map((r) => r.id));

function text(form: FormData, key: string) {
  const v = String(form.get(key) ?? "").trim();
  return v === "" ? null : v;
}

function number(form: FormData, key: string, { min, max }: { min: number; max: number }) {
  const raw = text(form, key);
  if (raw === null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new RangeError(key);
  return n;
}

const FIELD_LABELS: Record<string, string> = {
  size_ml: "Size",
  fill_level: "Fill level",
  purchase_price: "Price paid",
  my_rating: "My rating",
};

// Shared bottle fields from the form; throws RangeError(field) on bad numbers.
function bottleFields(form: FormData) {
  const unit = text(form, "size_unit") === "oz" ? "oz" : "ml";
  const size = number(form, "size_ml", { min: 0.1, max: 2000 });
  const rotation = text(form, "rotation");
  const concentration = text(form, "concentration");
  return {
    size_ml: size === null ? null : unit === "oz" ? Math.round(size * 29.5735 * 10) / 10 : size,
    concentration:
      concentration && (CONCENTRATIONS as readonly string[]).includes(concentration) ? concentration : null,
    fill_level: number(form, "fill_level", { min: 0, max: 100 }),
    purchase_price: number(form, "purchase_price", { min: 0, max: 100000 }),
    purchase_date: text(form, "purchase_date"),
    purchased_from: text(form, "purchased_from"),
    my_rating: number(form, "my_rating", { min: 1, max: 10 }),
    rotation: rotation && ROTATION_IDS.has(rotation) ? rotation : null,
    notes: text(form, "notes"),
  };
}

function fieldError(e: unknown): FormState {
  if (e instanceof RangeError) return { error: `${FIELD_LABELS[e.message] ?? e.message} doesn't look right.` };
  throw e;
}

export async function createBottle(_prev: FormState, form: FormData): Promise<FormState> {
  await getCurrentUser();
  const supabase = await createClient();

  let fields;
  try {
    fields = bottleFields(form);
  } catch (e) {
    return fieldError(e);
  }

  let fragranceId = text(form, "fragrance_id");
  if (!fragranceId) {
    const brand = text(form, "new_brand");
    const name = text(form, "new_name");
    if (!brand || !name) return { error: "Pick a fragrance, or enter a brand and name." };

    const slug = slugify(brand, name, fields.concentration);
    const { data: existing } = await supabase
      .from("cologne_fragrances")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      fragranceId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("cologne_fragrances")
        .insert({ slug, brand, name, concentration: fields.concentration, lookup_status: "pending" })
        .select("id")
        .single();
      if (error) return { error: "Couldn't add that fragrance. Please try again." };
      fragranceId = created.id;
    }
  }

  const { data, error } = await supabase
    .from("cologne_bottles")
    .insert({ ...fields, fragrance_id: fragranceId })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save the bottle. Please try again." };

  redirect(`/collection/${data.id}`);
}

export async function updateBottle(id: string, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const supabase = await createClient();

  let fields;
  try {
    fields = bottleFields(form);
  } catch (e) {
    return fieldError(e);
  }

  const { error } = await supabase
    .from("cologne_bottles")
    .update(fields)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn't save changes. Please try again." };

  redirect(`/collection/${id}`);
}

export async function deleteBottle(id: string) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  await supabase.from("cologne_bottles").delete().eq("id", id).eq("user_id", user.id);
  redirect("/collection");
}
