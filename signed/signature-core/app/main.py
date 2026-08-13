import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger(__name__)


def _run_migrations():
    """Add new columns / tables without Alembic."""
    from app.db.session import engine
    from sqlalchemy import text
    migrations = [
        # Azure AD integration columns
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_tenant_id TEXT",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_client_id TEXT",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_client_secret TEXT",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_sync_enabled BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_last_sync_at TIMESTAMPTZ",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_last_sync_created INTEGER DEFAULT 0",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS azure_last_sync_updated INTEGER DEFAULT 0",
        # Google Workspace sync metadata on tenants
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gws_last_sync_at TIMESTAMPTZ",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gws_last_sync_created INTEGER DEFAULT 0",
        "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS gws_last_sync_updated INTEGER DEFAULT 0",
        # SSO / OAuth columns on admin_users
        "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)",
        "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS oauth_sub TEXT",
        "ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT",
        # Marketing banners table
        """
        CREATE TABLE IF NOT EXISTS banners (
            id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name         TEXT NOT NULL,
            html_content TEXT NOT NULL,
            position     VARCHAR(20) NOT NULL DEFAULT 'header',
            applies_to   VARCHAR(20) NOT NULL DEFAULT 'all',
            enabled      BOOLEAN DEFAULT TRUE,
            created_at   TIMESTAMPTZ DEFAULT NOW()
        )
        """,
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
            except Exception as e:
                log.warning("Migration skipped: %s — %s", sql, e)
        conn.commit()


def _ensure_default_admin():
    """Create the default super-admin on first startup if none exists."""
    from app.db.session import SessionLocal
    from app.db.models import AdminUser
    from app.services.auth_service import hash_password

    email    = os.getenv("ADMIN_EMAIL",    "admin@signature.local")
    password = os.getenv("ADMIN_PASSWORD", "changeme")

    db = SessionLocal()
    try:
        if not db.query(AdminUser).first():
            db.add(AdminUser(
                email=email,
                password_hash=hash_password(password),
                role="super_admin",
            ))
            db.commit()
            log.info("Default admin created: %s", email)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    _run_migrations()
    _ensure_default_admin()
    yield


app = FastAPI(title="Signature Core", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
