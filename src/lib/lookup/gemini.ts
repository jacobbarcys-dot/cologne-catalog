import "server-only";
import { GoogleGenAI, type Interactions } from "@google/genai";
import {
  finishProfile,
  isRetryable,
  PROFILE_JSON_SCHEMA,
  ProfileSchema,
  providerErrorMessage,
  RESEARCH_BRIEF,
  errorStatus,
  type LookupResult,
  type ProfileOrigin,
} from "./profile";

// Gemini lookup: one call researches the fragrance with Google Search
// grounding, a second turns the notes into a structured profile (JSON schema
// output). Grounding isn't available on Gemini's free tier (429), so research
// then falls back to the model's own knowledge. When a model is overloaded
// (503) or out of quota, the next model in the list is tried.

const MODELS = [process.env.GEMINI_MODEL ?? "gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];

export function geminiApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? null;
}

const researchPrompt = (query: string, withSearch: boolean) =>
  `Research the fragrance that best matches this search: "${query}"

${withSearch ? "Search the web (fragrance databases such as Fragrantica, Parfumo and Basenotes, plus retailer listings)" : "You have no web access, so use what you know (from fragrance databases such as Fragrantica, Parfumo and Basenotes)"} to find:
${RESEARCH_BRIEF}

Write concise research notes with everything you found, and say which details you're unsure of. If no real fragrance matches, say NOT FOUND.`;

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

export async function lookupWithGemini(query: string, apiKey: string): Promise<LookupResult> {
  const client = new GoogleGenAI({ apiKey });
  let lastError: unknown;

  for (const model of [...new Set(MODELS)]) {
    try {
      // Step 1: research, with search grounding when the key's tier allows it.
      let origin: ProfileOrigin = "web_search";
      let research;
      try {
        research = await client.interactions.create({
          model,
          input: researchPrompt(query, true),
          tools: [{ type: "google_search" }],
          store: false,
        });
      } catch (e) {
        if (errorStatus(e) !== 429) throw e;
        origin = "model_knowledge";
        research = await client.interactions.create({ model, input: researchPrompt(query, false), store: false });
      }
      const notes = (research.output_text ?? "").trim();
      if (research.status === "failed" || !notes) continue;

      // Step 2: structure the notes as JSON matching the profile schema.
      const extraction = await client.interactions.create({
        model,
        input: `Turn these research notes about a fragrance into a structured profile. Use only what the notes support; use null or empty lists for anything unknown. Write the description and review summary in your own words.\n\nSearch: "${query}"\n\n<notes>\n${notes}\n</notes>`,
        response_format: { type: "text", mime_type: "application/json", schema: PROFILE_JSON_SCHEMA },
        store: false,
      });
      const parsed = ProfileSchema.safeParse(JSON.parse(extraction.output_text ?? ""));
      if (!parsed.success) continue;

      return finishProfile(query, parsed.data, origin === "web_search" ? citations(research.steps) : [], origin);
    } catch (e) {
      lastError = e;
      if (e instanceof SyntaxError || isRetryable(e)) continue;
      return { ok: false, error: providerErrorMessage("Gemini", e) };
    }
  }

  return {
    ok: false,
    error: lastError
      ? providerErrorMessage("Gemini", lastError)
      : "Couldn't read the lookup result. Please try again.",
  };
}
