import { NextResponse } from "next/server";

// Relative redirect for route handlers. Behind a hosting proxy (Hostinger),
// request.nextUrl.origin is the internal bind address (0.0.0.0:3000), so an
// absolute URL built from it sends the browser nowhere. A relative Location
// resolves against whatever domain the browser is actually on.
export function redirectTo(path: `/${string}`, status: 303 | 307 = 307) {
  return new NextResponse(null, { status, headers: { Location: path } });
}
