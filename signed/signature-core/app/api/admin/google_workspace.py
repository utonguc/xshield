"""
Google Workspace integration — sync users via Directory API.

The IT admin must have logged in via Google SSO with
admin.directory.user.readonly scope. Their refresh token is stored
on their AdminUser record and reused here.

GET  /v1/admin/tenants/{id}/integrations/google        → status
POST /v1/admin/tenants/{id}/integrations/google/sync   → pull users from Directory API
POST /v1/admin/tenants/{id}/integrations/google/test   → verify token + count users
"""
import os
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin
from app.db.models import AdminUser, Tenant, User
from app.db.session import get_db
from app.core.subscription_service import check_seat_limit

router = APIRouter(tags=["google-workspace"])

GOOGLE_TOKEN_URL   = "https://oauth2.googleapis.com/token"
DIRECTORY_USERS_URL = "https://admin.googleapis.com/admin/directory/v1/users"


# ── Schemas ───────────────────────────────────────────────────────────────────

class GoogleWorkspaceStatus(BaseModel):
    connected:      bool
    admin_email:    Optional[str]
    last_sync_at:   Optional[datetime]
    last_sync_created: int
    last_sync_updated: int


class SyncResult(BaseModel):
    created:   int
    updated:   int
    errors:    list[str]
    synced_at: datetime


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_tenant_or_404(db: Session, tenant_id: str) -> Tenant:
    t = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not t:
        raise HTTPException(404, "Tenant not found")
    return t


def _refresh_google_token(refresh_token: str) -> str:
    """Exchange a refresh token for a fresh access token."""
    resp = httpx.post(GOOGLE_TOKEN_URL, data={
        "grant_type":    "refresh_token",
        "refresh_token": refresh_token,
        "client_id":     os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
    }, timeout=15)
    if resp.status_code != 200:
        raise HTTPException(400, f"Google token refresh failed: {resp.text[:200]}")
    return resp.json()["access_token"]


def _fetch_directory_users(access_token: str) -> list[dict]:
    """Fetch all users from Google Directory API (handles pagination)."""
    headers = {"Authorization": f"Bearer {access_token}"}
    users: list[dict] = []
    params = {
        "customer":   "my_customer",
        "maxResults": 500,
        "projection": "full",
        "orderBy":    "email",
    }
    page_token = None

    while True:
        if page_token:
            params["pageToken"] = page_token
        resp = httpx.get(DIRECTORY_USERS_URL, headers=headers, params=params, timeout=30)
        if resp.status_code != 200:
            raise HTTPException(502, f"Directory API error {resp.status_code}: {resp.text[:300]}")
        body = resp.json()
        users.extend(body.get("users", []))
        page_token = body.get("nextPageToken")
        if not page_token:
            break

    return users


def _upsert_directory_users(db: Session, tenant_id: str, dir_users: list[dict]) -> SyncResult:
    created = updated = 0
    errors: list[str] = []

    for du in dir_users:
        emails = du.get("emails") or []
        primary = next((e["address"] for e in emails if e.get("primary")), None)
        email = (primary or du.get("primaryEmail") or "").strip().lower()
        if not email:
            continue

        name_obj = du.get("name", {})
        display_name = name_obj.get("fullName") or du.get("primaryEmail", "").split("@")[0]
        job_title    = None
        department   = None
        mobile_phone = None

        orgs = du.get("organizations")
        if orgs:
            job_title  = orgs[0].get("title")
            department = orgs[0].get("department")

        phones = du.get("phones")
        if phones:
            mobile_phone = next(
                (p["value"] for p in phones if p.get("type") == "mobile"),
                phones[0].get("value")
            )

        try:
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                existing.display_name = display_name or existing.display_name
                existing.job_title    = job_title    or existing.job_title
                existing.mobile_phone = mobile_phone or existing.mobile_phone
                existing.department   = department   or existing.department
                updated += 1
            else:
                ok, reason = check_seat_limit(db, tenant_id)
                if not ok:
                    errors.append(f"{email}: seat limit — {reason}")
                    continue
                db.add(User(
                    tenant_id=tenant_id,
                    email=email,
                    display_name=display_name,
                    job_title=job_title,
                    mobile_phone=mobile_phone,
                    department=department,
                ))
                created += 1
        except Exception as exc:
            errors.append(f"{email}: {exc}")

    db.commit()
    return SyncResult(created=created, updated=updated, errors=errors, synced_at=datetime.utcnow())


def _get_google_admin_for_tenant(db: Session, tenant_id: str, current_admin: dict) -> AdminUser:
    """Find an admin user with a stored Google refresh token for this tenant."""
    # First try: current admin (if they have Google OAuth)
    admin = db.query(AdminUser).filter(AdminUser.id == current_admin["sub"]).first()
    if admin and admin.oauth_provider == "google" and admin.oauth_refresh_token:
        return admin

    # Fallback: any tenant-scoped admin with Google OAuth
    admin = db.query(AdminUser).filter(
        AdminUser.tenant_id == tenant_id,
        AdminUser.oauth_provider == "google",
        AdminUser.oauth_refresh_token.isnot(None),
    ).first()
    if admin:
        return admin

    raise HTTPException(
        400,
        "No Google OAuth token found. Log in via 'Sign in with Google' first to connect your Workspace."
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tenants/{tenant_id}/integrations/google", response_model=GoogleWorkspaceStatus)
def get_google_status(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    _get_tenant_or_404(db, tenant_id)
    admin = db.query(AdminUser).filter(
        AdminUser.tenant_id == tenant_id,
        AdminUser.oauth_provider == "google",
        AdminUser.oauth_refresh_token.isnot(None),
    ).first()

    # Also check current admin themselves
    cur = db.query(AdminUser).filter(AdminUser.id == current_admin["sub"]).first()
    if not admin and cur and cur.oauth_provider == "google" and cur.oauth_refresh_token:
        admin = cur

    tenant = _get_tenant_or_404(db, tenant_id)
    return GoogleWorkspaceStatus(
        connected=bool(admin),
        admin_email=admin.email if admin else None,
        last_sync_at=getattr(tenant, "gws_last_sync_at", None),
        last_sync_created=getattr(tenant, "gws_last_sync_created", 0) or 0,
        last_sync_updated=getattr(tenant, "gws_last_sync_updated", 0) or 0,
    )


@router.post("/tenants/{tenant_id}/integrations/google/test")
def test_google_connection(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    _get_tenant_or_404(db, tenant_id)
    admin        = _get_google_admin_for_tenant(db, tenant_id, current_admin)
    access_token = _refresh_google_token(admin.oauth_refresh_token)
    users        = _fetch_directory_users(access_token)
    return {"status": "ok", "user_count": len(users), "admin_email": admin.email}


@router.post("/tenants/{tenant_id}/integrations/google/sync", response_model=SyncResult)
def sync_google_users(
    tenant_id: str,
    db: Session = Depends(get_db),
    current_admin: dict = Depends(get_current_admin),
):
    tenant       = _get_tenant_or_404(db, tenant_id)
    admin        = _get_google_admin_for_tenant(db, tenant_id, current_admin)
    access_token = _refresh_google_token(admin.oauth_refresh_token)
    dir_users    = _fetch_directory_users(access_token)
    result       = _upsert_directory_users(db, tenant_id, dir_users)

    # Persist sync metadata (uses ADD COLUMN IF NOT EXISTS in migrations)
    if hasattr(tenant, "gws_last_sync_at"):
        tenant.gws_last_sync_at      = result.synced_at
        tenant.gws_last_sync_created = result.created
        tenant.gws_last_sync_updated = result.updated
        db.commit()

    return result
