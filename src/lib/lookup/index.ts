import "server-only";
import { geminiApiKey, lookupWithGemini } from "./gemini";
import { lookupWithNvidia, nvidiaApiKey } from "./nvidia";
import type { LookupResult } from "./profile";

export type { LookupProfile, LookupResult } from "./profile";

// Live fragrance lookup. Uses NVIDIA when NVIDIA_API_KEY is set, otherwise
// Gemini (GEMINI_API_KEY or GOOGLE_API_KEY). Off when neither key is set.

export function lookupConfigured() {
  return Boolean(nvidiaApiKey() ?? geminiApiKey());
}

export async function lookupFragrance(query: string): Promise<LookupResult> {
  const nvidia = nvidiaApiKey();
  if (nvidia) return lookupWithNvidia(query, nvidia);
  const gemini = geminiApiKey();
  if (gemini) return lookupWithGemini(query, gemini);
  return { ok: false, error: "Live lookup isn't switched on yet." };
}
