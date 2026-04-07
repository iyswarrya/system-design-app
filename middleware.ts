import { NextResponse, type NextRequest } from "next/server";
import { verifyAuthToken, COOKIE_NAME } from "@/lib/auth/jwt";
import { GUEST_ACCESS_COOKIE } from "@/lib/appSession";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Only protect requirements routes (matched via config).
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const decoded = await verifyAuthToken(token);
      if (decoded?.userId) return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  // Guest mode: client sets this cookie alongside localStorage app_session (Edge cannot read localStorage).
  if (req.cookies.get(GUEST_ACCESS_COOKIE)?.value === "1") {
    return NextResponse.next();
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname + search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/requirements/:path*"],
};

