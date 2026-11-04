"use client";

import { useActionState } from "react";
import { lookupAndSave } from "./actions";

export function LookupButton({ q }: { q: string }) {
  const [state, action, pending] = useActionState(lookupAndSave, undefined);
  return (
    <form action={action} className="mt-4">
      <input type="hidden" name="q" value={q} />
      <button
        disabled={pending}
        className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-paper hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Looking it up… this can take up to a minute" : `Look up “${q}”`}
      </button>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </form>
  );
}
