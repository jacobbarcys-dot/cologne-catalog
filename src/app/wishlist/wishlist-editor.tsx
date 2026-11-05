"use client";

import { useActionState, useState, useTransition } from "react";
import { removeFromWishlist, updateWishlistItem, type WishlistState } from "./actions";

type Item = {
  id: string;
  priority: 1 | 2 | 3;
  target_price: number | null;
  desired_size_ml: number | null;
  notes: string | null;
};

const input = "w-full rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-accent sm:text-sm";

export function WishlistEditor({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: WishlistState, form: FormData) => {
    const result = await updateWishlistItem(item.id, prev, form);
    if (result?.saved) setOpen(false);
    return result;
  }, undefined);
  const [removing, startRemove] = useTransition();

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-sm text-muted underline">
        {open ? "Close" : "Edit"}
      </button>
      <button
        type="button"
        disabled={removing}
        onClick={() => startRemove(() => removeFromWishlist(item.id))}
        className="ml-auto text-sm text-muted hover:text-red-600"
      >
        {removing ? "Removing…" : "Remove"}
      </button>

      {open && (
        <form action={action} className="mt-2 grid w-full gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <label className="text-xs text-muted">
            Priority
            <select name="priority" defaultValue={item.priority} className={`${input} mt-1`}>
              <option value={1}>Must have</option>
              <option value={2}>Want</option>
              <option value={3}>Maybe</option>
            </select>
          </label>
          <label className="text-xs text-muted">
            Target price (USD)
            <input
              name="target_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={item.target_price ?? ""}
              placeholder="Alert me below…"
              className={`${input} mt-1`}
            />
          </label>
          <label className="text-xs text-muted">
            Size I want
            <span className="mt-1 flex gap-2">
              <input
                name="desired_size"
                type="number"
                step="any"
                min="0"
                defaultValue={item.desired_size_ml ?? ""}
                placeholder="100"
                className={input}
              />
              <select name="size_unit" defaultValue="ml" className={`${input} w-20`} aria-label="Size unit">
                <option value="ml">ml</option>
                <option value="oz">oz</option>
              </select>
            </span>
          </label>
          <label className="text-xs text-muted sm:col-span-2">
            Notes
            <textarea name="notes" rows={2} defaultValue={item.notes ?? ""} className={`${input} mt-1`} />
          </label>
          {state?.error && <p className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{state.error}</p>}
          <button
            disabled={pending}
            className="justify-self-start rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </>
  );
}
