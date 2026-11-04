import { Suspense } from "react";
import { signInWithGoogle } from "./actions";

export const metadata = { title: "Sign in" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">Cologne</p>
        <h1 className="mt-1 font-serif text-3xl">Catalog</h1>
        <p className="mt-3 text-sm text-muted">
          Your collection, wishlist, and best prices in one place.
        </p>

        <Suspense>
          <LoginError searchParams={props.searchParams} />
        </Suspense>

        <form action={signInWithGoogle} className="mt-8">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:opacity-90"
          >
            <GoogleIcon />
            Sign in with Google
          </button>
        </form>
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="mt-6 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
      Sign-in didn&apos;t finish. Please try again.
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
