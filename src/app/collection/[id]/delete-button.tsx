"use client";

import { useTransition } from "react";

export function DeleteButton({ action, name }: { action: () => Promise<void>; name: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Remove ${name} from your collection?`)) startTransition(action);
      }}
      className="rounded-full border border-line px-5 py-2 text-sm text-red-600 hover:border-red-500 disabled:opacity-50 dark:text-red-400"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
