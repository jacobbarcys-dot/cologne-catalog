// Fragrantica-style accord bar colours. Unknown accords get a stable fallback.
const COLORS: Record<string, string> = {
  citrus: "#f4d03f",
  fresh: "#9ed9e4",
  "fresh spicy": "#8fd18a",
  aquatic: "#4fb3d9",
  marine: "#3a8fc7",
  ozonic: "#a9d6e5",
  aromatic: "#5f9e6e",
  green: "#4caf50",
  herbal: "#6b8e23",
  lavender: "#9b8fd6",
  fruity: "#f2766b",
  tropical: "#ffb347",
  coconut: "#f3eadb",
  floral: "#f7a1c4",
  "white floral": "#f4f1e8",
  rose: "#e05a7a",
  sweet: "#e8749a",
  vanilla: "#f1e2b8",
  caramel: "#c8833a",
  honey: "#e1a23a",
  chocolate: "#6b3e26",
  cinnamon: "#b5562b",
  "warm spicy": "#c0392b",
  "soft spicy": "#d98b6a",
  amber: "#cf7f2e",
  balsamic: "#a0522d",
  woody: "#8b5a2b",
  smoky: "#7f7f7f",
  leather: "#6d4c41",
  tobacco: "#8d6e63",
  musky: "#d7c4c4",
  powdery: "#e9d8e4",
  earthy: "#7b6a4f",
  mossy: "#6f8f4e",
  patchouli: "#6e5a3c",
  oud: "#5a3e2b",
  animalic: "#8b6f5a",
};

const FALLBACK = ["#b39ddb", "#80cbc4", "#ffcc80", "#ef9a9a", "#a5d6a7", "#90caf9"];

export function accordColor(name: string) {
  const key = name.toLowerCase().trim();
  if (COLORS[key]) return COLORS[key];
  let hash = 0;
  for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[hash % FALLBACK.length];
}

// Dark text on light accords, light text on dark ones.
export function accordTextColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#1f1a17" : "#fffdfa";
}
