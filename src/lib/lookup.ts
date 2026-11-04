import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Live fragrance lookup: Claude researches the fragrance with web search, then a
// second call turns the research notes into a structured profile. Two calls
// because web search results carry citations, which can't be combined with
// structured outputs in one request. Only used when ANTHROPIC_API_KEY is set.

const MODEL = process.env.LOOKUP_MODEL ?? "claude-opus-5-5";
const MAX_CONTINUATIONS = 4;

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
  seasons: z.object({ winter: z.number(), spring: z.number(), summer: z.number(), fall: z.number() })
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

export type LookupProfile = z.infer<typeof ProfileSchema> & { sources: { title: string; url: string }[] };
export type LookupResult = { ok: true; profile: LookupProfile } | { ok: false; error: string };

const RESEARCH_PROMPT = (query: string) => `Research the fragrance that best matches this search: "${query}"

Use web search (fragrance databases such as Fragrantica, Parfumo and Basenotes, plus retailer listings) to find:
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

export async function lookupFragrance(query: string): Promise<LookupResult> {
  const client = new Anthropic();

  // Step 1: research with web search. Server tools can pause a long turn
  // (stop_reason "pause_turn"); resend to let the server continue.
  const userTurn: Anthropic.Beta.BetaMessageParam = { role: "user", content: RESEARCH_PROMPT(query) };
  const assistantContent: Anthropic.Beta.BetaContentBlockParam[] = [];
  const blocks: Anthropic.Beta.BetaContentBlock[] = [];

  try {
    for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
        messages: assistantContent.length
          ? [userTurn, { role: "assistant", content: assistantContent }]
          : [userTurn],
      });
      blocks.push(...response.content);
      if (response.stop_reason === "refusal") {
        return { ok: false, error: "The lookup was declined. Try a different search." };
      }
      if (response.stop_reason !== "pause_turn") break;
      assistantContent.push(...(response.content as Anthropic.Beta.BetaContentBlockParam[]));
    }
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }

  const notes = blocks
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!notes) return { ok: false, error: "The lookup didn't return any details. Please try again." };

  const sources = new Map<string, string>();
  for (const b of blocks) {
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === "web_search_result") sources.set(r.url, r.title);
    }
  }

  // Step 2: structure the research notes.
  let parsed: z.infer<typeof ProfileSchema> | null;
  try {
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      output_config: { effort: "low", format: zodOutputFormat(ProfileSchema) },
      messages: [
        {
          role: "user",
          content: `Turn these research notes about a fragrance into a structured profile. Use only what the notes support; use null or empty lists for anything unknown. Write the description and review summary in your own words.\n\nSearch: "${query}"\n\n<notes>\n${notes}\n</notes>`,
        },
      ],
    });
    parsed = response.parsed_output;
  } catch (e) {
    return { ok: false, error: apiErrorMessage(e) };
  }

  if (!parsed) return { ok: false, error: "Couldn't read the lookup result. Please try again." };
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
      sources: [...sources].slice(0, 6).map(([url, title]) => ({ url, title })),
    },
  };
}

function apiErrorMessage(e: unknown) {
  if (e instanceof Anthropic.AuthenticationError) return "The Anthropic API key isn't valid.";
  if (e instanceof Anthropic.RateLimitError) return "Too many lookups right now. Try again in a minute.";
  if (e instanceof Anthropic.APIError) return `Lookup failed (${e.status ?? "network"}). Please try again.`;
  throw e;
}
