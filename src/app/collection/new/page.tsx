import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getCatalog, getStoreNames } from "@/lib/collection";
import { createBottle } from "../actions";
import { BottleForm } from "../bottle-form";

export const metadata = { title: "Add a bottle" };

export default function NewBottlePage({ searchParams }: PageProps<"/collection/new">) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="font-serif text-4xl">Add a bottle</h1>
        <div className="mt-6">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-line" />}>
            <NewBottleForm searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

async function NewBottleForm({ searchParams }: { searchParams: PageProps<"/collection/new">["searchParams"] }) {
  const [catalog, stores, params] = await Promise.all([getCatalog(), getStoreNames(), searchParams]);
  const preselected = catalog.find((f) => f.id === params.fragrance);
  const wishlistId = typeof params.wishlist === "string" ? params.wishlist : undefined;
  return (
    <BottleForm
      action={createBottle}
      catalog={catalog}
      preselected={preselected}
      wishlistId={wishlistId}
      stores={stores}
      cancelHref={wishlistId ? "/wishlist" : preselected ? `/fragrance/${preselected.slug}` : "/collection"}
    />
  );
}
