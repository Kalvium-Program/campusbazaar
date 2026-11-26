import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 "proxy" (was middleware). A cheap first gate: if there is no login
// cookie, go to /login. The API still checks the cookie on every request.
const PROTECTED = ["/sell", "/me", "/messages", "/saved", "/listings/new"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsLogin = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || /^\/listings\/\d+\/edit$/.test(pathname);
  if (needsLogin && !req.cookies.has("cb_token")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/sell/:path*", "/me/:path*", "/messages/:path*", "/saved/:path*", "/listings/:id/edit"] };
