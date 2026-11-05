import { type Target } from "./match";
import { checkMaxAroma } from "./stores/maxaroma";
import { checkAura, checkVenba } from "./stores/shopify";
import { BlockedError, type StoreResult } from "./types";

// Stores the app checks automatically (their robots.txt allows search).
// The rest are link-only; see cologne_stores.mode.
const ADAPTERS: Record<string, (t: Target) => Promise<StoreResult>> = {
  aura: checkAura,
  maxaroma: checkMaxAroma,
  venba: checkVenba,
};

export const AUTO_STORES = Object.keys(ADAPTERS);

export async function checkStores(target: Target): Promise<Record<string, StoreResult>> {
  const entries = await Promise.all(
    Object.entries(ADAPTERS).map(async ([id, check]): Promise<[string, StoreResult]> => {
      try {
        return [id, await check(target)];
      } catch (e) {
        if (e instanceof BlockedError) return [id, { status: "blocked", error: "The store refused the request." }];
        const timeout = e instanceof Error && e.name === "TimeoutError";
        return [id, { status: "error", error: timeout ? "The store took too long to answer." : "Couldn't read the store." }];
      }
    }),
  );
  return Object.fromEntries(entries);
}
