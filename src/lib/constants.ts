// Shared between server and client code.

export const ROTATIONS = [
  { id: "everyday", label: "Everyday" },
  { id: "winter", label: "Winter" },
  { id: "summer", label: "Summer" },
  { id: "spring", label: "Spring" },
  { id: "fall", label: "Fall" },
  { id: "night", label: "Night out" },
  { id: "special", label: "Special occasion" },
] as const;
export type Rotation = (typeof ROTATIONS)[number]["id"];

export const CONCENTRATIONS = [
  "EDC",
  "EDT",
  "EDT Intense",
  "EDP",
  "EDP Intense",
  "Parfum",
  "Elixir",
  "Extrait de Parfum",
] as const;

export type FragranceSummary = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  concentration: string | null;
  release_year: number | null;
  image_url: string | null;
};

export type Bottle = {
  id: string;
  size_ml: number | null;
  concentration: string | null;
  fill_level: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  purchased_from: string | null;
  my_rating: number | null;
  rotation: Rotation | null;
  notes: string | null;
  created_at: string;
  fragrance: FragranceSummary;
};

export type Accord = { name: string; strength: number };

export type Fragrance = FragranceSummary & {
  gender: string | null;
  perfumers: string[];
  description: string | null;
  accords: Accord[];
  notes_top: string[];
  notes_heart: string[];
  notes_base: string[];
  rating_overall: number | null; // out of 5
  rating_votes: number | null;
  longevity: number | null; // out of 5
  sillage: number | null; // out of 4
  value_rating: number | null; // out of 5
  seasons: Partial<Record<"winter" | "spring" | "summer" | "fall", number>>; // 0-100
  time_of_day: Partial<Record<"day" | "night", number>>; // 0-100
  review_summary: { summary?: string; pros?: string[]; cons?: string[]; compliments?: string | null };
  similar_fragrances: string[];
  sources: { title: string; url: string }[];
  lookup_status: "pending" | "complete" | "failed";
  looked_up_at: string | null;
};
