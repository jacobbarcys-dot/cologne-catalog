import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { BottleArt } from "@/components/bottle-art";
import { getMyBottle, ROTATIONS } from "@/lib/collection";
import { formatPrice, formatSize } from "@/lib/format";
import { deleteBottle } from "../actions";
import { DeleteButton } from "./delete-button";

export const metadata = { title: "Bottle" };

export default function BottlePage({ params }: PageProps<"/collection/[id]">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Link href="/collection" className="text-sm text-muted hover:text-ink">
          ← My Collection
        </Link>
        <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-line" />}>
          {params.then(({ id }) => (
            <BottleDetail id={id} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function BottleDetail({ id }: { id: string }) {
  const bottle = await getMyBottle(id);
  if (!bottle) notFound();
  const { fragrance } = bottle;

  const facts = [
    { label: "Rotation", value: ROTATIONS.find((r) => r.id === bottle.rotation)?.label },
    { label: "Concentration", value: bottle.concentration ?? fragrance.concentration },
    { label: "Size", value: formatSize(bottle.size_ml) },
    { label: "How full", value: bottle.fill_level !== null ? `${bottle.fill_level}%` : null },
    { label: "Price paid", value: formatPrice(bottle.purchase_price) },
    {
      label: "Purchased",
      value: bottle.purchase_date
        ? new Date(`${bottle.purchase_date}T00:00:00`).toLocaleDateString("en-US", { dateStyle: "medium" })
        : null,
    },
    { label: "Bought from", value: bottle.purchased_from },
    { label: "My rating", value: bottle.my_rating ? `${bottle.my_rating} / 10` : null },
  ];

  return (
    <article className="mt-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex justify-center rounded-2xl border border-line bg-surface p-6 sm:w-48">
          <BottleArt
            rotation={bottle.rotation}
            fill={bottle.fill_level}
            label={`${fragrance.brand} ${fragrance.name}`}
            className="h-40 w-32"
          />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            {fragrance.brand}
            {fragrance.release_year && <span className="tracking-normal"> · {fragrance.release_year}</span>}
          </p>
          <h1 className="font-serif text-5xl leading-tight">{fragrance.name}</h1>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/collection/${bottle.id}/edit`}
              className="rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:opacity-90"
            >
              Edit
            </Link>
            <DeleteButton action={deleteBottle.bind(null, bottle.id)} name={fragrance.name} />
          </div>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-surface px-4 py-3">
            <dt className="text-xs uppercase tracking-wider text-muted">{f.label}</dt>
            <dd className={`mt-1 ${f.value ? "" : "text-muted"}`}>{f.value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      {bottle.notes && (
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-xs uppercase tracking-wider text-muted">My notes</h2>
          <p className="mt-2 whitespace-pre-line">{bottle.notes}</p>
        </section>
      )}

      <section className="mt-6 rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
        Accords, note pyramid, ratings, and when to wear arrive with fragrance search in Step 3.
      </section>
    </article>
  );
}
