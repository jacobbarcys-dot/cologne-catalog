import "server-only";
import OpenAI from "openai";
import {
  finishProfile,
  isRetryable,
  PROFILE_JSON_SCHEMA,
  ProfileSchema,
  providerErrorMessage,
  RESEARCH_BRIEF,
  type LookupResult,
} from "./profile";

// NVIDIA lookup (build.nvidia.com, OpenAI-compatible API). No web search is
// available, so profiles come from the model's own knowledge. One call asks
// for the profile as JSON; if a model is busy, rate-limited or returns
// unusable JSON, the next model in the list is tried.

const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODELS = [
  process.env.NVIDIA_MODEL ?? "deepseek-ai/deepseek-v4.1-flash",
  "z-ai/glm-5.3-flash",
  "moonshotai/kimi-k2.6",
];
const TIMEOUT_MS = 45_000;

export function nvidiaApiKey() {
  return process.env.NVIDIA_API_KEY ?? null;
}

const prompt = (query: string) =>
  `Describe the fragrance that best matches this search: "${query}"

You have no web access, so use what you know from fragrance databases such as Fragrantica, Parfumo and Basenotes. Cover:
${RESEARCH_BRIEF}

Write the description and review summary in your own words. Use null or empty lists for anything you don't know rather than guessing. If no real fragrance matches, set "found" to false.

Reply with only a JSON object (no markdown, no commentary) matching this JSON Schema:
${JSON.stringify(PROFILE_JSON_SCHEMA)}`;

// Models sometimes wrap JSON in reasoning tags or code fences; take the outermost object.
function extractJson(text: string) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function lookupWithNvidia(query: string, apiKey: string): Promise<LookupResult> {
  const client = new OpenAI({ apiKey, baseURL: BASE_URL, timeout: TIMEOUT_MS, maxRetries: 0 });
  let lastError: unknown;

  for (const model of [...new Set(MODELS)]) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt(query) }],
        temperature: 0.2,
        max_tokens: 4000,
      });
      const parsed = ProfileSchema.safeParse(extractJson(completion.choices[0]?.message?.content ?? ""));
      if (!parsed.success) continue;
      return finishProfile(query, parsed.data, [], "model_knowledge");
    } catch (e) {
      lastError = e;
      if (isRetryable(e) || e instanceof OpenAI.APIConnectionTimeoutError || e instanceof OpenAI.NotFoundError) {
        continue;
      }
      return { ok: false, error: providerErrorMessage("NVIDIA", e) };
    }
  }

  return {
    ok: false,
    error: lastError
      ? providerErrorMessage("NVIDIA", lastError)
      : "Couldn't read the lookup result. Please try again.",
  };
}
