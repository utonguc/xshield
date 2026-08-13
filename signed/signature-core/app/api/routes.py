from fastapi import APIRouter
from app.api.v1 import render, tracking, qr, portal
from app.api.admin import auth, tenants, templates, rules, users, disclaimers, banners, subscriptions, analytics, dashboard, azure, google_workspace

router = APIRouter()

# ── Gateway / public endpoints ────────────────────────────────────────────────
router.include_router(render.router,    prefix="/v1")
router.include_router(tracking.router,  prefix="/v1")
router.include_router(qr.router,        prefix="/v1")
router.include_router(portal.router,    prefix="/v1")

# ── Admin panel endpoints ─────────────────────────────────────────────────────
router.include_router(auth.router,          prefix="/v1/admin")
router.include_router(tenants.router,       prefix="/v1/admin")
router.include_router(templates.router,     prefix="/v1/admin")
router.include_router(rules.router,         prefix="/v1/admin")
router.include_router(users.router,         prefix="/v1/admin")
router.include_router(disclaimers.router,   prefix="/v1/admin")
router.include_router(banners.router,       prefix="/v1/admin")
router.include_router(subscriptions.router, prefix="/v1/admin")
router.include_router(analytics.router,     prefix="/v1/admin")
router.include_router(dashboard.router,     prefix="/v1/admin")
router.include_router(azure.router,             prefix="/v1/admin")
router.include_router(google_workspace.router,  prefix="/v1/admin")
