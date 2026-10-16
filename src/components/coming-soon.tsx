import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";

export function ComingSoon({ title, step }: { title: string; step: string }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="font-serif text-4xl">{title}</h1>
        <Suspense>
          <Gate />
        </Suspense>
        <p className="mt-4 rounded-2xl border border-dashed border-line p-8 text-center text-muted">
          Coming in {step} of the build.
        </p>
      </main>
    </>
  );
}

// Keeps placeholder pages behind the allowlist like the real ones will be.
async function Gate() {
  await getCurrentUser();
  return null;
}
