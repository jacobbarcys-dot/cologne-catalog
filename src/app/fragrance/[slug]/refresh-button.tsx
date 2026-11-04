"use client";

import { useActionState } from "react";
import { refreshFragrance } from "@/app/search/actions";

export function RefreshButton({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(refreshFragrance.bind(null, slug), undefined);
  return (
    <form action={action} className="flex items-center gap-3">
      <button
        disabled={pending}
        className="rounded-full border border-line px-5 py-2 text-sm hover:border-accent disabled:opacity-50"
      >
        {pending ? "Refreshing… (up to a minute)" : "↻ Refresh details"}
      </button>
      {state?.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
