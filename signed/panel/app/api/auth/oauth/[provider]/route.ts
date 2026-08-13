import { NextRequest, NextResponse } from "next/server";

const GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth";
const MS_AUTH_URL       = "https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
].join(" ");

const MS_SCOPES = "openid email profile offline_access User.Read User.Read.All";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/auth/callback/${provider}`;

  if (provider === "google") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id",     clientId);
    url.searchParams.set("redirect_uri",  redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope",         GOOGLE_SCOPES);
    url.searchParams.set("access_type",   "offline");
    url.searchParams.set("prompt",        "consent");   // always re-consent to get refresh_token

    return NextResponse.redirect(url.toString());
  }

  if (provider === "microsoft") {
    const clientId = process.env.MS_CLIENT_ID;
    if (!clientId) return NextResponse.json({ error: "Microsoft OAuth not configured" }, { status: 503 });

    const url = new URL(MS_AUTH_URL);
    url.searchParams.set("client_id",     clientId);
    url.searchParams.set("redirect_uri",  redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope",         MS_SCOPES);
    url.searchParams.set("response_mode", "query");

    return NextResponse.redirect(url.toString());
  }

  return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
}
