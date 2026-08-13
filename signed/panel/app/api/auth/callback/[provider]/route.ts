import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://api:5000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const code  = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const redirectUri = `${url.origin}/api/auth/callback/${provider}`;

  try {
    const backendUrl = new URL(`${API_URL}/v1/admin/auth/oauth/${provider}/callback`);
    backendUrl.searchParams.set("code",         code);
    backendUrl.searchParams.set("redirect_uri", redirectUri);

    const res = await fetch(backendUrl.toString(), { method: "POST" });

    if (!res.ok) {
      return NextResponse.redirect(new URL("/login?error=oauth", request.url));
    }

    const data = await res.json() as { token: string; role: string; email: string };

    const response = NextResponse.redirect(new URL("/tenants", request.url));
    response.cookies.set("token", data.token, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
}
