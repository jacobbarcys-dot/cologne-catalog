import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getMyBottle, getStoreNames } from "@/lib/collection";
import { updateBottle } from "../../actions";
import { BottleForm } from "../../bottle-form";

export const metadata = { title: "Edit bottle" };

export default function EditBottlePage({ params }: PageProps<"/collection/[id]/edit">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-line" />}>
          {params.then(({ id }) => (
            <EditBottle id={id} />
          ))}
        </Suspense>
      </main>
    </>
  );
}

async function EditBottle({ id }: { id: string }) {
  const [bottle, stores] = await Promise.all([getMyBottle(id), getStoreNames()]);
  if (!bottle) notFound();

  return (
    <>
      <p className="text-xs uppercase tracking-wider text-muted">{bottle.fragrance.brand}</p>
      <h1 className="font-serif text-4xl">{bottle.fragrance.name}</h1>
      <div className="mt-6">
        <BottleForm
          action={updateBottle.bind(null, bottle.id)}
          bottle={bottle}
          stores={stores}
          cancelHref={`/collection/${bottle.id}`}
        />
      </div>
    </>
  );
}
