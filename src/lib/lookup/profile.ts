import "server-only";
import { z } from "zod";

// The profile shape every lookup provider must produce, plus shared helpers.

export const ProfileSchema = z.object({
  found: z.boolean().describe("false if no real fragrance matches the query"),
  brand: z.string(),
  name: z.string().describe("Fragrance name without the brand or concentration"),
  concentration: z
    .string()
    .nullable()
    .describe("One of: EDC, EDT, EDT Intense, EDP, EDP Intense, Parfum, Elixir, Extrait de Parfum"),
  release_year: z.number().int().nullable(),
  gender: z.string().nullable().describe("Men, Women or Unisex"),
  perfumers: z.array(z.string()),
  description: z.string().describe("2-3 sentences in your own words"),
  accords: z
    .array(z.object({ name: z.string().describe("lowercase, e.g. 'warm spicy'"), strength: z.number() }))
    .describe("Main accords, strongest = 100, others relative (30-100)"),
  notes_top: z.array(z.string()),
  notes_heart: z.array(z.string()),
  notes_base: z.array(z.string()),
  rating_overall: z.number().nullable().describe("Community rating out of 5"),
  rating_votes: z.number().int().nullable(),
  longevity: z.number().nullable().describe("1-5: very weak, weak, moderate, long lasting, eternal"),
  sillage: z.number().nullable().describe("1-4: intimate, moderate, strong, enormous"),
  value_rating: z.number().nullable().describe("Value for money out of 5"),
  seasons: z
    .object({ winter: z.number(), spring: z.number(), summer: z.number(), fall: z.number() })
    .describe("Suitability 0-100, best season = 100"),
  time_of_day: z.object({ day: z.number(), night: z.number() }).describe("0-100, better one = 100"),
  review_summary: z.object({
    summary: z.string().describe("What reviewers say, 1-2 sentences, in your own words"),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    compliments: z.string().nullable(),
  }),
  similar_fragrances: z.array(z.string()).describe("'Brand Name' strings"),
});
export type ParsedProfile = z.infer<typeof ProfileSchema>;

// JSON Schema for providers that take one; drop the "$schema" header, which
// Gemini's subset of JSON Schema doesn't accept.
const { $schema: _schemaUri, ...jsonSchema } = z.toJSONSchema(ProfileSchema, { target: "draft-7" });
void _schemaUri;
export const PROFILE_JSON_SCHEMA = jsonSchema;

export type ProfileOrigin = "web_search" | "model_knowledge";
export type LookupProfile = ParsedProfile & {
  sources: { title: string; url: string }[];
  origin: ProfileOrigin;
};
export type LookupResult = { ok: true; profile: LookupProfile } | { ok: false; error: string };

export const RESEARCH_BRIEF = `- exact brand, name, concentration, release year, gender, perfumer(s)
- main accords and their relative strength
- the full note pyramid (top, heart, base)
- community ratings: overall (out of 5, with vote count), longevity, sillage, value for money
- which seasons and whether day or night it suits
- what reviewers commonly praise and criticise, and how often it gets compliments
- a few similar fragrances

If the search matches several flankers or concentrations, pick the one that most closely matches the wording; if it's ambiguous, pick the original/most popular one.`;

const clamp = (v: number | null, min: number, max: number) =>
  v === null || !Number.isFinite(v) ? null : Math.min(max, Math.max(min, v));

export function finishProfile(
  query: string,
  parsed: ParsedProfile,
  sources: LookupProfile["sources"],
  origin: ProfileOrigin,
): LookupResult {
  if (!parsed.found) return { ok: false, error: `Couldn't find a fragrance matching "${query}".` };
  return {
    ok: true,
    profile: {
      ...parsed,
      accords: parsed.accords
        .map((a) => ({ name: a.name.toLowerCase(), strength: clamp(a.strength, 0, 100) ?? 50 }))
        .slice(0, 10),
      rating_overall: clamp(parsed.rating_overall, 0, 5),
      longevity: clamp(parsed.longevity, 0, 5),
      sillage: clamp(parsed.sillage, 0, 4),
      value_rating: clamp(parsed.value_rating, 0, 5),
      sources,
      origin,
    },
  };
}

export function errorStatus(e: unknown) {
  return typeof e === "object" && e !== null && "status" in e ? Number(e.status) : undefined;
}

// Overloaded or rate-limited: worth trying the next model.
export function isRetryable(e: unknown) {
  const status = errorStatus(e);
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

// Readable, key-free summary of a provider error for the page.
export function providerErrorMessage(provider: string, e: unknown) {
  console.error(`Fragrance lookup failed (${provider})`, e);
  const status = errorStatus(e);
  const detail = errorDetail(e);
  const suffix = detail ? ` ${provider} says: “${detail}”` : "";
  if (status === 401 || status === 403) return `The ${provider} API key was rejected.${suffix}`;
  if (status === 429) return `${provider} refused the request: quota or rate limit (429).${suffix}`;
  if (status !== undefined) return `Lookup failed (${status}).${suffix}`;
  return `Lookup failed.${suffix}`;
}

function errorDetail(e: unknown) {
  if (!(e instanceof Error)) return "";
  let msg = e.message;
  const json = msg.indexOf("{");
  if (json >= 0) {
    try {
      const body = JSON.parse(msg.slice(json));
      msg = body?.error?.message ?? body?.detail ?? body?.message ?? msg;
    } catch {
      // not JSON; keep the raw message
    }
  }
  return String(msg)
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/nvapi-[0-9A-Za-z_-]{10,}/g, "[key]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
