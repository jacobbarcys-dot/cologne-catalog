import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/collection", label: "Collection" },
  { href: "/search", label: "Search" },
  { href: "/wishlist", label: "Wishlist" },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-serif text-xl font-semibold tracking-wide">
          Cologne Catalog
        </Link>
        <nav className="hidden gap-5 text-sm text-muted sm:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<div className="h-8 w-8 rounded-full bg-line" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      <nav className="flex justify-around border-t border-line text-sm text-muted sm:hidden">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="flex-1 py-2 text-center hover:text-ink">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm text-paper">
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg">
        <p className="font-medium">{user.name}</p>
        <p className="truncate text-muted">{user.email}</p>
        <form action="/auth/signout" method="post" className="mt-3">
          <button className="w-full rounded-lg border border-line px-3 py-1.5 hover:bg-paper">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
