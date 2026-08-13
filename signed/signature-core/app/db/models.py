import uuid
from datetime import datetime
from sqlalchemy import Column, Text, Boolean, Integer, DateTime, ForeignKey, String, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Tenant(Base):
    __tablename__ = "tenants"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(Text, nullable=False)
    slug       = Column(Text, unique=True, nullable=False)
    status     = Column(String(20), nullable=False, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Azure AD / Microsoft 365 integration
    azure_tenant_id     = Column(Text, nullable=True)
    azure_client_id     = Column(Text, nullable=True)
    azure_client_secret = Column(Text, nullable=True)
    azure_sync_enabled  = Column(Boolean, default=False)
    azure_last_sync_at  = Column(DateTime, nullable=True)
    azure_last_sync_created = Column(Integer, default=0)
    azure_last_sync_updated = Column(Integer, default=0)

    # Google Workspace sync metadata
    gws_last_sync_at      = Column(DateTime, nullable=True)
    gws_last_sync_created = Column(Integer, default=0)
    gws_last_sync_updated = Column(Integer, default=0)

    domains       = relationship("Domain",       back_populates="tenant", cascade="all, delete-orphan")
    users         = relationship("User",         back_populates="tenant", cascade="all, delete-orphan")
    templates     = relationship("Template",     back_populates="tenant", cascade="all, delete-orphan")
    rules         = relationship("Rule",         back_populates="tenant", cascade="all, delete-orphan")
    admin_users   = relationship("AdminUser",    back_populates="tenant", cascade="all, delete-orphan")
    disclaimers   = relationship("Disclaimer",   back_populates="tenant", cascade="all, delete-orphan")
    banners       = relationship("Banner",       back_populates="tenant", cascade="all, delete-orphan")
    subscription  = relationship("Subscription", back_populates="tenant", uselist=False, cascade="all, delete-orphan")


class Domain(Base):
    __tablename__ = "domains"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id  = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    domain     = Column(Text, unique=True, nullable=False)
    verified   = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="domains")


class User(Base):
    __tablename__ = "users"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id    = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    email        = Column(Text, unique=True, nullable=False)
    display_name = Column(Text)
    job_title    = Column(Text)
    mobile_phone = Column(Text)
    department   = Column(Text)
    extra_fields = Column(JSON, default=dict)
    created_at   = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    tokens = relationship("UserToken", back_populates="user", cascade="all, delete-orphan")


class Template(Base):
    __tablename__ = "templates"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id    = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name         = Column(Text, nullable=False)
    html_content = Column(Text, nullable=False)
    is_default   = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="templates")


class Rule(Base):
    __tablename__ = "rules"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id       = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    priority        = Column(Integer, nullable=False, default=100)
    condition_type  = Column(String(50))
    condition_value = Column(Text)
    template_id     = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    enabled         = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    tenant   = relationship("Tenant",   back_populates="rules")
    template = relationship("Template")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id    = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True)
    key_hash     = Column(Text, unique=True, nullable=False)
    name         = Column(Text, nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    last_used_at = Column(DateTime)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email               = Column(Text, unique=True, nullable=False)
    password_hash       = Column(Text, nullable=False)
    role                = Column(String(20), nullable=False, default="super_admin")
    tenant_id           = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True)
    created_at          = Column(DateTime, default=datetime.utcnow)

    # SSO / OAuth
    oauth_provider      = Column(String(20), nullable=True)   # 'google' | 'microsoft'
    oauth_sub           = Column(Text, nullable=True)          # provider user ID
    oauth_refresh_token = Column(Text, nullable=True)

    tenant = relationship("Tenant", back_populates="admin_users")


# ── A: Disclaimers ────────────────────────────────────────────────────────────

class Disclaimer(Base):
    __tablename__ = "disclaimers"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id    = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name         = Column(Text, nullable=False)
    html_content = Column(Text, nullable=False)
    applies_to   = Column(String(20), nullable=False, default="all")  # all | external | internal
    enabled      = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="disclaimers")


# ── A2: Banners ───────────────────────────────────────────────────────────────

class Banner(Base):
    __tablename__ = "banners"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id    = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name         = Column(Text, nullable=False)
    html_content = Column(Text, nullable=False)
    position     = Column(String(20), nullable=False, default="header")   # header | footer
    applies_to   = Column(String(20), nullable=False, default="all")      # all | external | internal
    enabled      = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="banners")


# ── B: CSAT & Analytics ───────────────────────────────────────────────────────

class EmailEvent(Base):
    __tablename__ = "email_events"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id          = Column(UUID(as_uuid=True), nullable=False)
    sender_email       = Column(Text, nullable=False)
    tracking_id        = Column(Text, unique=True, nullable=False)
    sent_at            = Column(DateTime, default=datetime.utcnow)
    opened_at          = Column(DateTime)
    open_count         = Column(Integer, default=0)
    csat_score         = Column(Integer)
    csat_responded_at  = Column(DateTime)


# ── D: Subscriptions ─────────────────────────────────────────────────────────

class Subscription(Base):
    __tablename__ = "subscriptions"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id     = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), unique=True, nullable=False)
    status        = Column(String(20), nullable=False, default="trial")  # trial | active | suspended | cancelled
    seats         = Column(Integer, nullable=False, default=999)
    trial_ends_at = Column(DateTime)
    period_end    = Column(DateTime)
    created_at    = Column(DateTime, default=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="subscription")


# ── E: User Self-Service Tokens ───────────────────────────────────────────────

class UserToken(Base):
    __tablename__ = "user_tokens"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token      = Column(Text, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at    = Column(DateTime)

    user = relationship("User", back_populates="tokens")
