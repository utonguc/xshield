import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AdminUser
from app.services.auth_service import verify_password, create_token
from app.models.admin_schemas import LoginRequest, TokenResponse
from app.api.admin.deps import get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
MS_TOKEN_URL       = "https://login.microsoftonline.com/organizations/oauth2/v2.0/token"
MS_ME_URL          = "https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName,id"


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({
        "sub":       str(user.id),
        "email":     user.email,
        "role":      user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    })
    return TokenResponse(token=token, role=user.role, email=user.email)


@router.get("/me")
def me(admin: dict = Depends(get_current_admin)):
    return admin


# ── OAuth: Google ─────────────────────────────────────────────────────────────

@router.post("/oauth/google/callback", response_model=TokenResponse)
def google_oauth_callback(
    code:         str = Query(...),
    redirect_uri: str = Query(...),
    db: Session = Depends(get_db),
):
    client_id     = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(503, "Google OAuth not configured on this server")

    resp = httpx.post(GOOGLE_TOKEN_URL, data={
        "grant_type":   "authorization_code",
        "code":         code,
        "redirect_uri": redirect_uri,
        "client_id":    client_id,
        "client_secret": client_secret,
    }, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(400, f"Google token exchange failed: {resp.text[:300]}")

    tokens        = resp.json()
    access_token  = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    profile_resp = httpx.get(GOOGLE_USERINFO_URL,
                              headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    if profile_resp.status_code != 200:
        raise HTTPException(400, "Failed to fetch Google profile")

    profile = profile_resp.json()
    email   = profile.get("email", "").strip().lower()

    user = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not user:
        raise HTTPException(401, "No admin account for this Google account. Contact your administrator.")

    user.oauth_provider = "google"
    user.oauth_sub      = profile.get("sub")
    if refresh_token:
        user.oauth_refresh_token = refresh_token
    db.commit()

    token = create_token({
        "sub":       str(user.id),
        "email":     user.email,
        "role":      user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    })
    return TokenResponse(token=token, role=user.role, email=user.email)


# ── OAuth: Microsoft 365 ──────────────────────────────────────────────────────

@router.post("/oauth/microsoft/callback", response_model=TokenResponse)
def microsoft_oauth_callback(
    code:         str = Query(...),
    redirect_uri: str = Query(...),
    db: Session = Depends(get_db),
):
    client_id     = os.getenv("MS_CLIENT_ID")
    client_secret = os.getenv("MS_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(503, "Microsoft OAuth not configured on this server")

    resp = httpx.post(MS_TOKEN_URL, data={
        "grant_type":   "authorization_code",
        "code":         code,
        "redirect_uri": redirect_uri,
        "client_id":    client_id,
        "client_secret": client_secret,
        "scope":        "openid email profile offline_access User.Read",
    }, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(400, f"Microsoft token exchange failed: {resp.text[:300]}")

    tokens        = resp.json()
    access_token  = tokens.get("access_token")
    refresh_token = tokens.get("refresh_token")

    profile_resp = httpx.get(MS_ME_URL,
                              headers={"Authorization": f"Bearer {access_token}"}, timeout=10)
    if profile_resp.status_code != 200:
        raise HTTPException(400, "Failed to fetch Microsoft profile")

    profile = profile_resp.json()
    email   = (profile.get("mail") or profile.get("userPrincipalName") or "").strip().lower()

    user = db.query(AdminUser).filter(AdminUser.email == email).first()
    if not user:
        raise HTTPException(401, "No admin account for this Microsoft account. Contact your administrator.")

    user.oauth_provider = "microsoft"
    user.oauth_sub      = profile.get("id")
    if refresh_token:
        user.oauth_refresh_token = refresh_token
    db.commit()

    token = create_token({
        "sub":       str(user.id),
        "email":     user.email,
        "role":      user.role,
        "tenant_id": str(user.tenant_id) if user.tenant_id else None,
    })
    return TokenResponse(token=token, role=user.role, email=user.email)
