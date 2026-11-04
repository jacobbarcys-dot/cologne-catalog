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
