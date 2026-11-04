import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getCatalog, getStoreNames } from "@/lib/collection";
import { createBottle } from "../actions";
import { BottleForm } from "../bottle-form";

export const metadata = { title: "Add a bottle" };

export default function NewBottlePage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-serif text-4xl">Add a bottle</h1>
        <div className="mt-6">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-line" />}>
            <NewBottleForm />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function NewBottleForm() {
  const [catalog, stores] = await Promise.all([getCatalog(), getStoreNames()]);
  return <BottleForm action={createBottle} catalog={catalog} stores={stores} cancelHref="/collection" />;
}
