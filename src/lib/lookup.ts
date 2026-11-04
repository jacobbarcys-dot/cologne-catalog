import "server-only";
import { GoogleGenAI, type Interactions } from "@google/genai";
import { z } from "zod";

// Live fragrance lookup with Gemini: one call researches the fragrance with
// Google Search grounding, a second turns the research notes into a structured
// profile (JSON schema output). Only used when a Gemini API key is set.

const MODEL = process.env.LOOKUP_MODEL ?? "gemini-3.8-flash";

export function geminiApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

const ProfileSchema = z.object({
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
// Gemini accepts a subset of JSON Schema; drop the "$schema" header.
const { $schema: _schemaUri, ...PROFILE_JSON_SCHEMA } = z.toJSONSchema(ProfileSchema, { target: "draft-7" });
void _schemaUri;

export type LookupProfile = z.infer<typeof ProfileSchema> & { sources: { title: string; url: string }[] };
export type LookupResult = { ok: true; profile: LookupProfile } | { ok: false; error: string };

const RESEARCH_PROMPT = (query: string) => `Research the fragrance that best matches this search: "${query}"

Search the web (fragrance databases such as Fragrantica, Parfumo and Basenotes, plus retailer listings) to find:
- exact brand, name, concentration, release year, gender, perfumer(s)
- main accords and their relative strength
- the full note pyramid (top, heart, base)
- community ratings: overall (out of 5, with vote count), longevity, sillage, value for money
- which seasons and whether day or night it suits
- what reviewers commonly praise and criticise, and how often it gets compliments
- a few similar fragrances

If the search matches several flankers or concentrations, pick the one that most closely matches the wording; if it's ambiguous, pick the original/most popular one. Write concise research notes with everything you found, and say which details you're unsure of. If no real fragrance matches, say NOT FOUND.`;

const clamp = (v: number | null, min: number, max: number) =>
  v === null || !Number.isFinite(v) ? null : Math.min(max, Math.max(min, v));

function citations(steps: Interactions.Step[]) {
  const sources = new Map<string, string>();
  for (const step of steps) {
    if (step.type !== "model_output") continue;
    for (const block of step.content ?? []) {
      if (block.type !== "text") continue;
      for (const a of block.annotations ?? []) {
        if (a.type === "url_citation" && a.url) sources.set(a.url, a.title ?? a.url);
      }
    }
  }
  return [...sources].slice(0, 6).map(([url, title]) => ({ url, title }));
}

export async function lookupFragrance(query: string): Promise<LookupResult> {
  const apiKey = geminiApiKey();
  if (!apiKey) return { ok: false, error: "Live lookup isn't switched on yet." };
  const client = new GoogleGenAI({ apiKey });

  // Step 1: research with Google Search grounding.
  let notes: string;
  let sources: LookupProfile["sources"];
  try {
    const research = await client.interactions.create({
      model: MODEL,
      input: RESEARCH_PROMPT(query),
      tools: [{ type: "google_search" }],
      store: false,
    });
    if (research.status === "failed") return { ok: false, error: "The lookup failed. Please try again." };
    notes = (research.output_text ?? "").trim();
    sources = citations(research.steps);
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }
  if (!notes) return { ok: false, error: "The lookup didn't return any details. Please try again." };

  // Step 2: structure the research notes as JSON matching the profile schema.
  let parsed: z.infer<typeof ProfileSchema>;
  try {
    const extraction = await client.interactions.create({
      model: MODEL,
      input: `Turn these research notes about a fragrance into a structured profile. Use only what the notes support; use null or empty lists for anything unknown. Write the description and review summary in your own words.\n\nSearch: "${query}"\n\n<notes>\n${notes}\n</notes>`,
      response_format: { type: "text", mime_type: "application/json", schema: PROFILE_JSON_SCHEMA },
      store: false,
    });
    const result = ProfileSchema.safeParse(JSON.parse(extraction.output_text ?? ""));
    if (!result.success) return { ok: false, error: "Couldn't read the lookup result. Please try again." };
    parsed = result.data;
  } catch (e) {
    if (e instanceof SyntaxError) return { ok: false, error: "Couldn't read the lookup result. Please try again." };
    return { ok: false, error: apiErrorMessage(e) };
  }

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
    },
  };
}

// Map API failures (bad key, quota, outage) to a message for the page, including
// Google's own explanation so quota and billing problems can be diagnosed.
function apiErrorMessage(e: unknown) {
  const status = typeof e === "object" && e !== null && "status" in e ? Number(e.status) : undefined;
  console.error("Fragrance lookup failed", e);
  const detail = googleMessage(e);
  const suffix = detail ? ` Google says: “${detail}”` : "";
  if (status === 401 || status === 403) return `The Gemini API key was rejected.${suffix}`;
  if (status === 429) return `Gemini refused the request: quota or rate limit (429).${suffix}`;
  if (status !== undefined) return `Lookup failed (${status}).${suffix}`;
  return `Lookup failed.${suffix}`;
}

// Pull the human-readable message out of a Gemini error (often a JSON body).
function googleMessage(e: unknown) {
  if (!(e instanceof Error)) return "";
  let msg = e.message;
  const json = msg.indexOf("{");
  if (json >= 0) {
    try {
      const body = JSON.parse(msg.slice(json));
      msg = body?.error?.message ?? body?.message ?? msg;
    } catch {
      // not JSON; keep the raw message
    }
  }
  return msg
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[key]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
