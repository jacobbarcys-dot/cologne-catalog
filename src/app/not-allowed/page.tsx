export const metadata = { title: "No access" };

export default function NotAllowedPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-8 text-center">
        <h1 className="font-serif text-2xl">No access yet</h1>
        <p className="mt-3 text-sm text-muted">
          This account isn&apos;t on the Cologne Catalog list. Ask the owner to add you.
        </p>
        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-full border border-line px-5 py-2 text-sm hover:bg-paper">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
