"""
Skip Wait — backend (FastAPI + SQLAlchemy + SQLite)

Order modes: pickup | deliver | dine_in
"""

import json
import os
import random

from dotenv import load_dotenv
load_dotenv()
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import (create_engine, Column, Integer, String, Boolean,
                        Float, ForeignKey, DateTime, Text)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session

# On Railway, mount a volume at /data — DB lives there so it survives redeploys.
# Locally it falls back to this file's own directory (so cwd doesn't matter).
_DB_DIR = os.getenv("DB_DIR", os.path.dirname(os.path.abspath(__file__)))
DB_URL  = f"sqlite:///{_DB_DIR}/skipwait.db"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False)
Base = declarative_base()

SKIP_FEE      = 5
DELIVERY_FEE  = 38
PORTER_API_KEY  = os.getenv("PORTER_API_KEY", "")
PORTER_BASE     = "https://pui.porter.in/v1"
FAST2SMS_KEY    = os.getenv("FAST2SMS_API_KEY", "")

FLOW = {
    "pickup":  ["Order placed", "Preparing", "Ready for pickup", "Picked up"],
    "deliver": ["Order placed", "Preparing", "Out for delivery", "Delivered"],
    "dine_in": ["Order placed", "Preparing", "Served at table", "Completed"],
}

# ─────────────────────────── models ───────────────────────────

class User(Base):
    __tablename__ = "users"
    phone      = Column(String, primary_key=True)
    role       = Column(String, default="customer")   # customer | kitchen | admin
    kitchen_id = Column(String, ForeignKey("kitchens.id"), nullable=True)
    hashed_pw  = Column(String, nullable=True)        # set only for password-login accounts
    is_banned  = Column(Boolean, default=False)


class Kitchen(Base):
    __tablename__ = "kitchens"
    id             = Column(String, primary_key=True)
    name           = Column(String)
    tag            = Column(String)
    rating         = Column(Float)
    eta            = Column(Integer)
    dist           = Column(String)
    grad_from      = Column(String)
    grad_to        = Column(String)
    credit_balance    = Column(Integer, default=0)
    is_open           = Column(Boolean, default=True)
    payment_qr        = Column(Text, nullable=True)
    location_address  = Column(Text, nullable=True)
    items          = relationship("MenuItem",    back_populates="kitchen")
    categories     = relationship("MenuCategory", back_populates="kitchen",
                                  order_by="MenuCategory.sort_order")
    tables         = relationship("DineTable",   back_populates="kitchen")


class MenuCategory(Base):
    __tablename__ = "menu_categories"
    id         = Column(String, primary_key=True)
    kitchen_id = Column(String, ForeignKey("kitchens.id"))
    name       = Column(String)
    sort_order = Column(Integer, default=0)
    kitchen    = relationship("Kitchen", back_populates="categories")
    items      = relationship("MenuItem", back_populates="category")


class MenuItem(Base):
    __tablename__ = "menu_items"
    id          = Column(String, primary_key=True)
    kitchen_id  = Column(String, ForeignKey("kitchens.id"))
    category_id = Column(String, ForeignKey("menu_categories.id"), nullable=True)
    name        = Column(String)
    price       = Column(Integer)
    veg         = Column(Boolean)
    descr       = Column(String)
    available   = Column(Boolean, default=True)
    image_url   = Column(String, nullable=True)
    kitchen     = relationship("Kitchen",      back_populates="items")
    category    = relationship("MenuCategory", back_populates="items")
    variants    = relationship("ItemVariant",  back_populates="item")


class DineTable(Base):
    __tablename__ = "dine_tables"
    id         = Column(String, primary_key=True)
    kitchen_id = Column(String, ForeignKey("kitchens.id"))
    label      = Column(String)       # "Table 3", "Bar Counter", "Window Seat"
    qr_token   = Column(String, unique=True)
    kitchen    = relationship("Kitchen", back_populates="tables")


class Order(Base):
    __tablename__ = "orders"
    id             = Column(String, primary_key=True)
    kitchen_id     = Column(String, ForeignKey("kitchens.id"))
    customer_phone = Column(String)
    mode           = Column(String)   # pickup | deliver | dine_in
    arrival        = Column(Integer)
    table_id       = Column(String, ForeignKey("dine_tables.id"), nullable=True)
    table_label    = Column(String, nullable=True)   # denormalised for history
    status_index   = Column(Integer, default=0)
    otp            = Column(String)
    food_total     = Column(Integer)
    pack           = Column(Integer)
    skip_fee       = Column(Integer)
    delivery       = Column(Integer)
    gst            = Column(Integer)
    total          = Column(Integer)
    rider_name        = Column(String, nullable=True)
    rider_veh         = Column(String, nullable=True)
    rider_rating      = Column(Float,  nullable=True)
    delivery_address  = Column(String, nullable=True)
    porter_order_id   = Column(String, nullable=True)
    porter_tracking_url = Column(String, nullable=True)
    order_rating      = Column(Integer, nullable=True)
    cancelled         = Column(Boolean, default=False)
    promo_code        = Column(String, nullable=True)
    discount          = Column(Integer, default=0)
    created_at        = Column(DateTime, default=datetime.utcnow)
    items             = relationship("OrderItem", back_populates="order")
    removals          = relationship("OrderItemRemoval", back_populates="order",
                                     cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    id             = Column(Integer, primary_key=True, autoincrement=True)
    order_id       = Column(String, ForeignKey("orders.id"))
    menu_item_id   = Column(String, nullable=True)
    name           = Column(String)
    price          = Column(Integer)
    qty            = Column(Integer)
    veg            = Column(Boolean)
    order          = relationship("Order", back_populates="items")


class OrderItemRemoval(Base):
    __tablename__ = "order_item_removals"
    id            = Column(Integer, primary_key=True, autoincrement=True)
    order_id      = Column(String, ForeignKey("orders.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    order         = relationship("Order", back_populates="removals")


class UserSession(Base):
    __tablename__ = "user_sessions"
    token = Column(String, primary_key=True)
    phone = Column(String)


class SavedAddress(Base):
    __tablename__ = "saved_addresses"
    id      = Column(Integer, primary_key=True, autoincrement=True)
    phone   = Column(String)
    label   = Column(String)
    address = Column(String)


class ItemVariant(Base):
    __tablename__ = "item_variants"
    id      = Column(String, primary_key=True)
    item_id = Column(String, ForeignKey("menu_items.id"))
    name    = Column(String)
    price   = Column(Integer)
    item    = relationship("MenuItem", back_populates="variants")


class PromoCode(Base):
    __tablename__ = "promo_codes"
    id         = Column(Integer, primary_key=True, autoincrement=True)
    kitchen_id = Column(String, ForeignKey("kitchens.id"), nullable=True)
    code       = Column(String)
    type       = Column(String, default="flat")   # flat | percent
    value      = Column(Integer)
    min_order  = Column(Integer, default=0)
    max_uses   = Column(Integer, nullable=True)
    used_count = Column(Integer, default=0)
    active     = Column(Boolean, default=True)


class KitchenHours(Base):
    __tablename__ = "kitchen_hours"
    id          = Column(Integer, primary_key=True, autoincrement=True)
    kitchen_id  = Column(String, ForeignKey("kitchens.id"))
    day_of_week = Column(Integer)   # 0=Mon … 6=Sun
    open_time   = Column(String)    # "09:00"
    close_time  = Column(String)    # "22:00"
    is_closed   = Column(Boolean, default=False)


Base.metadata.create_all(engine)

# ── safe column migrations (idempotent) ──
def _add_column_if_missing(table: str, col: str, col_def: str):
    with engine.connect() as conn:
        cols = [r[1] for r in conn.execute(
            __import__("sqlalchemy").text(f"PRAGMA table_info({table})")
        ).fetchall()]
        if col not in cols:
            conn.execute(__import__("sqlalchemy").text(
                f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"
            ))
            conn.commit()

_add_column_if_missing("kitchens", "payment_qr",          "TEXT")
_add_column_if_missing("kitchens", "location_address",    "TEXT")
_add_column_if_missing("orders",   "porter_order_id",     "TEXT")
_add_column_if_missing("orders",   "porter_tracking_url", "TEXT")
_add_column_if_missing("users",    "hashed_pw",           "TEXT")
_add_column_if_missing("users",    "is_banned",           "BOOLEAN DEFAULT 0")


# ── porter helpers ──────────────────────────────────────────────────────────

def _geocode(address: str):
    """Geocode an Indian address via Nominatim. Returns (lat, lng, city) or (None, None, '')."""
    params = urllib.parse.urlencode({
        "q": address, "format": "json", "limit": 1, "countrycodes": "in",
        "addressdetails": 1,
    })
    req = urllib.request.Request(
        f"https://nominatim.openstreetmap.org/search?{params}",
        headers={"User-Agent": "SkipWait/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            data = json.loads(r.read())
        if data:
            addr = data[0].get("address", {})
            city = (addr.get("city") or addr.get("town") or
                    addr.get("village") or addr.get("county") or "")
            return float(data[0]["lat"]), float(data[0]["lon"]), city
    except Exception:
        pass
    return None, None, ""


def _porter(method: str, path: str, body: dict | None = None) -> dict:
    """Call the Porter Enterprise API. Raises HTTPException on failure."""
    if not PORTER_API_KEY:
        raise HTTPException(503, "Porter API key not configured — set PORTER_API_KEY env var")
    data = json.dumps(body).encode() if body is not None else None
    req  = urllib.request.Request(
        PORTER_BASE + path, data=data, method=method,
        headers={"Content-Type": "application/json", "Authorization": PORTER_API_KEY},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:   detail = json.loads(e.read()).get("message", "Porter error")
        except Exception: detail = "Porter error"
        raise HTTPException(e.code, detail)
    except Exception as ex:
        raise HTTPException(503, f"Porter unavailable: {ex}")


def _porter_address_block(address_str: str, lat: float, lng: float, city: str) -> dict:
    return {
        "apartment_address": "",
        "street_address1":   address_str[:200],
        "street_address2":   "",
        "landmark":          "",
        "city":              city or "Bengaluru",
        "state":             "Karnataka",
        "pincode":           "560001",
        "country":           "IND",
        "lat":               lat,
        "lng":               lng,
    }

# ── SMS (Fast2SMS) ─────────────────────────────────────────────────────────

def _send_otp_sms(phone: str, code: str) -> bool:
    """Send OTP via Fast2SMS's dedicated OTP route (route=otp bypasses DND blocking,
    unlike the promotional 'q' route). Returns True if sent, False if key missing or error."""
    if not FAST2SMS_KEY:
        return False
    data = json.dumps({
        "route": "otp",
        "variables_values": code,
        "numbers": phone,
    }).encode()
    req = urllib.request.Request(
        "https://www.fast2sms.com/dev/bulkV2",
        data=data, method="POST",
        headers={"authorization": FAST2SMS_KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            return json.loads(r.read()).get("return") is True
    except Exception:
        return False

# ─────────────────────── auth ───────────────────────
_login_otps: dict[str, tuple[str, float]] = {}


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def current_phone(authorization: str = Header(default=""), db: Session = Depends(get_db)) -> str:
    token = authorization.replace("Bearer ", "").strip()
    sess  = db.get(UserSession, token)
    if not sess:
        raise HTTPException(401, "Not logged in")
    return sess.phone


def verify_kitchen_owner(kid: str, authorization: str, db: Session) -> str:
    token = authorization.replace("Bearer ", "").strip()
    sess  = db.get(UserSession, token)
    if not sess:
        raise HTTPException(401, "Not logged in")
    user = db.get(User, sess.phone)
    if not user or user.role != "kitchen":
        raise HTTPException(403, "Kitchen staff only")
    if user.kitchen_id != kid:
        raise HTTPException(403, "Not your kitchen")
    return sess.phone


def require_admin(authorization: str = Header(default=""), db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "").strip()
    sess  = db.get(UserSession, token)
    if not sess:
        raise HTTPException(401, "Not logged in")
    user = db.get(User, sess.phone)
    if not user or user.role != "admin":
        raise HTTPException(403, "Admin only")
    return sess.phone


# ─────────────────────────── schemas ───────────────────────────
class PhoneIn(BaseModel):
    phone: str

class VerifyIn(BaseModel):
    phone: str
    code: str

class CartItem(BaseModel):
    id: str
    qty: int
    variant_id: Optional[str] = None

class OrderIn(BaseModel):
    kitchen_id: str
    mode: str
    arrival: int = 20
    table_id: Optional[str] = None
    delivery_address: Optional[str] = None
    promo_code: Optional[str] = None
    items: list[CartItem]

class AdvanceIn(BaseModel):
    otp: Optional[str] = None

class CategoryIn(BaseModel):
    name: str
    sort_order: int = 0

class MenuItemIn(BaseModel):
    name: str
    price: int
    veg: bool
    descr: str
    category_id: Optional[str] = None
    available: bool = True
    image_url: Optional[str] = None

class TableIn(BaseModel):
    label: str

class KitchenProfileIn(BaseModel):
    name: str
    tag: str
    eta: int
    dist: str
    grad_from: str
    grad_to: str
    is_open: bool = True
    location_address: str = ""

class KitchenStatusIn(BaseModel):
    is_open: bool

class ItemAvailableIn(BaseModel):
    available: bool

class KitchenCreateIn(BaseModel):
    name: str
    tag: str = ""
    id:  Optional[str] = None
    eta: int = 30
    dist: str = "—"
    grad_from: str = "#F6B14E"
    grad_to: str   = "#E8702A"
    credit_balance: int = 0
    owner_phone: str = ""

class KitchenRegisterIn(BaseModel):
    name: str
    tag: str = ""
    cuisine: str = ""
    eta: int = 20
    grad_from: str = "#F6B14E"
    grad_to: str   = "#E8702A"

# ─────────────────────────── app ───────────────────────────
app = FastAPI(title="Skip Wait API")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

_FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")


# ── password auth helpers ──────────────────────────────────────────────────
import hashlib

def _hash_pw(phone: str, pw: str) -> str:
    return hashlib.sha256(f"{phone}:{pw}".encode()).hexdigest()

ADMIN_PHONE   = "8285049942"
ADMIN_PW_HASH = _hash_pw(ADMIN_PHONE, "Pankaj@098")


class PasswordLoginIn(BaseModel):
    phone: str
    password: str

class SetPasswordIn(BaseModel):
    password: str


@app.patch("/me/password")
def set_my_password(body: SetPasswordIn,
                    authorization: str = Header(default=""),
                    db: Session = Depends(get_db)):
    phone = require_auth(authorization, db)
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    user = db.get(User, phone)
    user.hashed_pw = _hash_pw(phone, body.password)
    db.commit()
    return {"ok": True}


@app.post("/auth/password-login")
def password_login(body: PasswordLoginIn, db: Session = Depends(get_db)):
    user = db.get(User, body.phone)
    if not user or not user.hashed_pw:
        raise HTTPException(401, "Invalid credentials")
    if user.hashed_pw != _hash_pw(body.phone, body.password):
        raise HTTPException(401, "Invalid credentials")
    if user.is_banned:
        raise HTTPException(403, "Account suspended. Contact support.")
    token = secrets.token_urlsafe(24)
    db.add(UserSession(token=token, phone=body.phone))
    db.commit()
    return {"token": token, "role": user.role, "kitchen_id": user.kitchen_id, "phone": body.phone}


# ── auth ──
@app.post("/auth/request-otp")
def request_otp(body: PhoneIn, db: Session = Depends(get_db)):
    code = f"{random.randint(1000, 9999)}"
    _login_otps[body.phone] = (code, time.time() + 300)
    if not db.get(User, body.phone):
        db.add(User(phone=body.phone, role="customer"))
        db.commit()
    sms_sent = _send_otp_sms(body.phone, code)
    resp: dict = {"sent": True}
    if not sms_sent:
        resp["dev_otp"] = code   # shown on-screen only when SMS is not configured
    return resp


@app.post("/auth/verify-otp")
def verify_otp(body: VerifyIn, db: Session = Depends(get_db)):
    rec = _login_otps.get(body.phone)
    if not rec or rec[0] != body.code or time.time() > rec[1]:
        raise HTTPException(400, "Invalid or expired code")
    user = db.get(User, body.phone)
    if user and user.is_banned:
        raise HTTPException(403, "Account suspended. Contact support.")
    token = secrets.token_urlsafe(24)
    db.merge(UserSession(token=token, phone=body.phone))
    db.commit()
    _login_otps.pop(body.phone, None)
    role       = user.role       if user else "customer"
    kitchen_id = user.kitchen_id if user else None
    return {"token": token, "phone": body.phone, "role": role, "kitchen_id": kitchen_id}


# ── self-service kitchen registration ──
@app.post("/kitchens/register")
def register_kitchen(body: KitchenRegisterIn,
                     authorization: str = Header(default=""),
                     db: Session = Depends(get_db)):
    token = authorization.replace("Bearer ", "").strip()
    sess  = db.get(UserSession, token)
    if not sess:
        raise HTTPException(401, "Not logged in")
    user = db.get(User, sess.phone)
    if not user:
        raise HTTPException(404, "User not found")
    if user.kitchen_id:
        raise HTTPException(400, "Already registered a kitchen")
    kid = "k" + secrets.token_hex(4)
    tag = (body.tag or body.cuisine or "").strip()
    kitchen = Kitchen(
        id=kid, name=body.name.strip(), tag=tag,
        rating=None, eta=body.eta, dist="",
        grad_from=body.grad_from, grad_to=body.grad_to,
        is_open=True, credit_balance=50,   # 50 trial credits ≈ 10 free orders
    )
    db.add(kitchen)
    user.role       = "kitchen"
    user.kitchen_id = kid
    db.commit()
    return {"kitchen_id": kid, "name": kitchen.name, "tag": tag,
            "role": "kitchen", "credit_balance": 50}


# ── catalogue (public) ──
def serialize_item(i: MenuItem):
    return {
        "id": i.id, "name": i.name, "price": i.price, "veg": i.veg,
        "descr": i.descr, "available": i.available, "image_url": i.image_url,
        "category_id": i.category_id,
        "category_name": i.category.name if i.category else None,
        "variants": [{"id": v.id, "name": v.name, "price": v.price} for v in i.variants],
    }


@app.get("/kitchens")
def list_kitchens(db: Session = Depends(get_db)):
    return [{
        "id": k.id, "name": k.name, "tag": k.tag, "rating": k.rating,
        "eta": k.eta, "dist": k.dist, "grad": [k.grad_from, k.grad_to],
        "credit_balance": k.credit_balance, "is_open": k.is_open if k.is_open is not None else True,
        "payment_qr": k.payment_qr,
        "location_address": k.location_address,
    } for k in db.query(Kitchen).all()]


@app.get("/kitchens/{kid}/categories")
def list_categories(kid: str, db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "sort_order": c.sort_order}
            for c in db.query(MenuCategory).filter_by(kitchen_id=kid)
                       .order_by(MenuCategory.sort_order).all()]


@app.get("/kitchens/{kid}/menu")
def get_menu(kid: str, db: Session = Depends(get_db)):
    items = db.query(MenuItem).filter_by(kitchen_id=kid).all()
    return [serialize_item(i) for i in items]


# ── table resolution (public — scanned QR lands here) ──
@app.get("/t/{qr_token}")
def resolve_table(qr_token: str, db: Session = Depends(get_db)):
    t = db.query(DineTable).filter_by(qr_token=qr_token).first()
    if not t:
        raise HTTPException(404, "Table not found")
    k = db.get(Kitchen, t.kitchen_id)
    return {
        "table_id": t.id, "table_label": t.label,
        "kitchen_id": t.kitchen_id, "kitchen_name": k.name, "kitchen_tag": k.tag,
        "grad": [k.grad_from, k.grad_to],
    }


@app.get("/k/{kid}")
def resolve_kitchen(kid: str, db: Session = Depends(get_db)):
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    return {
        "kitchen_id": k.id, "kitchen_name": k.name, "kitchen_tag": k.tag,
        "grad": [k.grad_from, k.grad_to], "is_open": k.is_open if k.is_open is not None else True,
        "payment_qr": k.payment_qr,
        "location_address": k.location_address,
        "eta": k.eta, "dist": k.dist, "grad_from": k.grad_from, "grad_to": k.grad_to,
    }


# ── customer: order history ──
@app.get("/me/orders")
def my_orders(phone: str = Depends(current_phone), db: Session = Depends(get_db)):
    orders = (db.query(Order)
              .filter_by(customer_phone=phone)
              .order_by(Order.created_at.desc())
              .limit(30).all())
    def with_kitchen(o):
        s = serialize(o)
        k = db.get(Kitchen, o.kitchen_id)
        s["kitchen_name"] = k.name if k else o.kitchen_id
        s["created_at"]   = o.created_at.isoformat() if o.created_at else None
        return s
    return [with_kitchen(o) for o in orders]


# ── kitchen management (own kitchen only) ──

@app.patch("/kitchens/{kid}/profile")
def edit_kitchen_profile(kid: str, body: KitchenProfileIn,
                         authorization: str = Header(default=""),
                         db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    k.name, k.tag, k.eta   = body.name, body.tag, body.eta
    k.dist                  = body.dist
    k.grad_from, k.grad_to = body.grad_from, body.grad_to
    k.is_open               = body.is_open
    k.location_address      = body.location_address.strip() or None
    db.commit()
    return {
        "id": k.id, "name": k.name, "tag": k.tag, "rating": k.rating,
        "eta": k.eta, "dist": k.dist, "grad": [k.grad_from, k.grad_to],
        "credit_balance": k.credit_balance, "is_open": k.is_open,
        "location_address": k.location_address,
    }


class PaymentQrIn(BaseModel):
    data_url: str  # base64 data URL, e.g. "data:image/png;base64,..."


@app.patch("/kitchens/{kid}/payment-qr")
def set_payment_qr(kid: str, body: PaymentQrIn,
                   authorization: str = Header(default=""),
                   db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    # Accept clear (empty string) or a data URL
    k.payment_qr = body.data_url or None
    db.commit()
    return {"ok": True}


@app.get("/kitchens/{kid}/payment-qr")
def get_payment_qr(kid: str, db: Session = Depends(get_db)):
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    return {"payment_qr": k.payment_qr}


@app.patch("/kitchens/{kid}/status")
def set_kitchen_status(kid: str, body: KitchenStatusIn,
                       authorization: str = Header(default=""),
                       db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    k.is_open = body.is_open
    db.commit()
    return {"id": k.id, "is_open": k.is_open}


@app.patch("/kitchens/{kid}/menu/{iid}/available")
def set_item_available(kid: str, iid: str, body: ItemAvailableIn,
                       authorization: str = Header(default=""),
                       db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    item = db.get(MenuItem, iid)
    if not item or item.kitchen_id != kid:
        raise HTTPException(404, "Item not found")
    item.available = body.available
    db.commit()
    return {"id": iid, "available": item.available}


@app.get("/kitchens/{kid}/tables/public")
def public_tables(kid: str, db: Session = Depends(get_db)):
    return [{"id": t.id, "label": t.label}
            for t in db.query(DineTable).filter_by(kitchen_id=kid).all()]

@app.get("/kitchens/{kid}/tables")
def list_tables(kid: str, authorization: str = Header(default=""),
                db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    return [{"id": t.id, "label": t.label, "qr_token": t.qr_token}
            for t in db.query(DineTable).filter_by(kitchen_id=kid).all()]


@app.post("/kitchens/{kid}/tables")
def add_table(kid: str, body: TableIn, authorization: str = Header(default=""),
              db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    tid = "T" + secrets.token_urlsafe(6)
    qr  = secrets.token_urlsafe(12)
    db.add(DineTable(id=tid, kitchen_id=kid, label=body.label, qr_token=qr))
    db.commit()
    return {"id": tid, "label": body.label, "qr_token": qr}


@app.delete("/kitchens/{kid}/tables/{tid}")
def delete_table(kid: str, tid: str, authorization: str = Header(default=""),
                 db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    t = db.get(DineTable, tid)
    if not t or t.kitchen_id != kid:
        raise HTTPException(404, "Table not found")
    db.delete(t)
    db.commit()
    return {"deleted": tid}


@app.post("/kitchens/{kid}/categories")
def add_category(kid: str, body: CategoryIn, authorization: str = Header(default=""),
                 db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    cid = "C" + secrets.token_urlsafe(6)
    db.add(MenuCategory(id=cid, kitchen_id=kid, name=body.name, sort_order=body.sort_order))
    db.commit()
    return {"id": cid, "name": body.name, "sort_order": body.sort_order}


@app.patch("/kitchens/{kid}/categories/{cid}")
def edit_category(kid: str, cid: str, body: CategoryIn,
                  authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    c = db.get(MenuCategory, cid)
    if not c or c.kitchen_id != kid:
        raise HTTPException(404, "Category not found")
    c.name, c.sort_order = body.name, body.sort_order
    db.commit()
    return {"id": cid, "name": c.name, "sort_order": c.sort_order}


@app.delete("/kitchens/{kid}/categories/{cid}")
def delete_category(kid: str, cid: str, authorization: str = Header(default=""),
                    db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    c = db.get(MenuCategory, cid)
    if not c or c.kitchen_id != kid:
        raise HTTPException(404, "Category not found")
    # unlink items
    for i in db.query(MenuItem).filter_by(category_id=cid).all():
        i.category_id = None
    db.delete(c)
    db.commit()
    return {"deleted": cid}


@app.post("/kitchens/{kid}/menu")
def add_menu_item(kid: str, body: MenuItemIn, authorization: str = Header(default=""),
                  db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    if body.category_id and not db.get(MenuCategory, body.category_id):
        raise HTTPException(404, "Category not found")
    iid = "I" + secrets.token_urlsafe(6)
    db.add(MenuItem(id=iid, kitchen_id=kid, name=body.name, price=body.price,
                    veg=body.veg, descr=body.descr, category_id=body.category_id,
                    available=body.available, image_url=body.image_url))
    db.commit()
    item = db.get(MenuItem, iid)
    return serialize_item(item)


@app.patch("/kitchens/{kid}/menu/{iid}")
def edit_menu_item(kid: str, iid: str, body: MenuItemIn,
                   authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    item = db.get(MenuItem, iid)
    if not item or item.kitchen_id != kid:
        raise HTTPException(404, "Item not found")
    item.name, item.price, item.veg   = body.name, body.price, body.veg
    item.descr, item.available        = body.descr, body.available
    item.category_id                  = body.category_id
    item.image_url                    = body.image_url
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@app.delete("/kitchens/{kid}/menu/{iid}")
def delete_menu_item(kid: str, iid: str, authorization: str = Header(default=""),
                     db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    item = db.get(MenuItem, iid)
    if not item or item.kitchen_id != kid:
        raise HTTPException(404, "Item not found")
    db.delete(item)
    db.commit()
    return {"deleted": iid}


# ── orders ──
def serialize(o: Order):
    flow = FLOW[o.mode]
    return {
        "id": o.id, "kitchen_id": o.kitchen_id, "mode": o.mode,
        "arrival": o.arrival,
        "table_id": o.table_id, "table_label": o.table_label,
        "delivery_address": o.delivery_address,
        "status_index": o.status_index, "status": flow[o.status_index],
        "flow": flow, "done": o.status_index >= len(flow) - 1,
        "otp": o.otp,
        "food_total": o.food_total, "pack": o.pack, "skip_fee": o.skip_fee,
        "delivery": o.delivery, "gst": o.gst, "total": o.total,
        "rider": ({"name": o.rider_name, "veh": o.rider_veh,
                   "rating": o.rider_rating} if o.mode == "deliver" else None),
        "porter_order_id":    o.porter_order_id,
        "porter_tracking_url": o.porter_tracking_url,
        "order_rating": o.order_rating,
        "cancelled":    o.cancelled or False,
        "promo_code":   o.promo_code,
        "discount":     o.discount or 0,
        "customer_phone": o.customer_phone,
        "items": [{"item_id": it.id, "id": it.menu_item_id, "name": it.name,
                   "price": it.price, "qty": it.qty, "veg": it.veg,
                   "removed": it.id in {r.order_item_id for r in o.removals}}
                  for it in o.items],
    }


@app.post("/orders")
def create_order(body: OrderIn, phone: str = Depends(current_phone),
                 db: Session = Depends(get_db)):
    if body.mode not in FLOW:
        raise HTTPException(400, "mode must be pickup | deliver | dine_in")
    kitchen = db.get(Kitchen, body.kitchen_id)
    if not kitchen:
        raise HTTPException(404, "Kitchen not found")
    if kitchen.is_open is False:
        raise HTTPException(400, "Kitchen is currently closed")
    if kitchen.credit_balance < SKIP_FEE:
        raise HTTPException(402, "Kitchen is out of Skip Wait credits")

    # Atomic decrement — prevents two simultaneous orders from both passing
    # the credit check and together overdrafting the balance.
    db.execute(
        __import__("sqlalchemy").text(
            "UPDATE kitchens SET credit_balance = credit_balance - :fee "
            "WHERE id = :kid AND credit_balance >= :fee"
        ),
        {"fee": SKIP_FEE, "kid": kitchen.id}
    )
    db.refresh(kitchen)
    if kitchen.credit_balance < 0:
        db.rollback()
        raise HTTPException(402, "Kitchen is out of Skip Wait credits")

    if body.mode == "deliver" and not (body.delivery_address or "").strip():
        raise HTTPException(400, "Delivery address is required")

    table_label = None
    if body.mode == "dine_in" and body.table_id:
        t = db.get(DineTable, body.table_id)
        if not t or t.kitchen_id != body.kitchen_id:
            raise HTTPException(400, "Invalid table")
        table_label = t.label

    price_map  = {i.id: i for i in kitchen.items}
    food_total = 0
    order_items = []
    for ci in body.items:
        mi = price_map.get(ci.id)
        if not mi or ci.qty < 1:
            raise HTTPException(400, f"Bad item {ci.id}")
        if not mi.available:
            raise HTTPException(400, f"{mi.name} is currently unavailable")
        item_name  = mi.name
        item_price = mi.price
        if ci.variant_id:
            variant = next((v for v in mi.variants if v.id == ci.variant_id), None)
            if not variant:
                raise HTTPException(400, f"Variant not found for {mi.name}")
            item_name  = f"{mi.name} — {variant.name}"
            item_price = variant.price
        elif mi.variants:
            raise HTTPException(400, f"Please select a size/variant for {mi.name}")
        food_total += item_price * ci.qty
        order_items.append((mi, ci.qty, item_name, item_price))
    if not order_items:
        raise HTTPException(400, "Empty cart")

    # promo code
    discount   = 0
    promo_code = None
    if body.promo_code:
        from sqlalchemy import or_
        promo = db.query(PromoCode).filter(
            PromoCode.code == body.promo_code.upper().strip(),
            PromoCode.active == True,
        ).filter(
            or_(PromoCode.kitchen_id == body.kitchen_id, PromoCode.kitchen_id.is_(None))
        ).first()
        if not promo:
            raise HTTPException(400, "Invalid or expired promo code")
        if food_total < promo.min_order:
            raise HTTPException(400, f"Minimum order ₹{promo.min_order} required for this code")
        if promo.max_uses and promo.used_count >= promo.max_uses:
            raise HTTPException(400, "Promo code usage limit reached")
        discount   = min(round(food_total * promo.value / 100) if promo.type == "percent" else promo.value, food_total)
        promo_code = promo.code
        promo.used_count += 1

    pack     = round(food_total * 0.04) + 8
    gst      = round(food_total * 0.05)
    delivery = DELIVERY_FEE if body.mode == "deliver" else 0
    total    = max(0, food_total + pack + SKIP_FEE + delivery + gst - discount)

    oid = "SW" + str(random.randint(10000, 99999))
    otp = f"{random.randint(1000, 9999)}"

    order = Order(
        id=oid, kitchen_id=kitchen.id, customer_phone=phone, mode=body.mode,
        arrival=body.arrival, table_id=body.table_id, table_label=table_label,
        status_index=0, otp=otp, food_total=food_total,
        pack=pack, skip_fee=SKIP_FEE, delivery=delivery, gst=gst, total=total,
        discount=discount, promo_code=promo_code,
        delivery_address=body.delivery_address.strip() if body.delivery_address else None,
    )
    if body.mode == "deliver":
        order.rider_name, order.rider_veh, order.rider_rating = "Ramesh K.", "RJ14 CG 2207", 4.7
    db.add(order)
    for mi, qty, item_name, item_price in order_items:
        db.add(OrderItem(order_id=oid, menu_item_id=mi.id, name=item_name, price=item_price, qty=qty, veg=mi.veg))

    db.commit()  # credit already decremented atomically above
    db.refresh(order)
    return serialize(order)


@app.get("/orders/{oid}")
def get_order(oid: str, db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    return serialize(o)


@app.get("/kitchens/{kid}/orders")
def kitchen_orders(kid: str, db: Session = Depends(get_db)):
    orders = (db.query(Order).filter_by(kitchen_id=kid)
              .order_by(Order.created_at.desc()).limit(20).all())
    return [serialize(o) for o in orders]


@app.get("/kitchens/{kid}/orders/history")
def kitchen_order_history(kid: str, q: str = "", db: Session = Depends(get_db)):
    query = db.query(Order).filter_by(kitchen_id=kid).order_by(Order.created_at.desc())
    if q:
        query = query.filter(Order.id.ilike(f"%{q}%"))
    orders = query.limit(100).all()
    return [serialize(o) for o in orders]


@app.post("/orders/{oid}/items/{item_id}/remove")
def toggle_remove_item(oid: str, item_id: int,
                       authorization: str = Header(default=""),
                       db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    verify_kitchen_owner(o.kitchen_id, authorization, db)
    existing = db.query(OrderItemRemoval).filter_by(
        order_id=oid, order_item_id=item_id).first()
    if existing:
        db.delete(existing)
    else:
        db.add(OrderItemRemoval(order_id=oid, order_item_id=item_id))
    db.commit()
    db.refresh(o)
    return serialize(o)


@app.post("/kitchens/{kid}/menu/bulk")
def bulk_add_menu_items(kid: str, body: list[dict],
                        authorization: str = Header(default=""),
                        db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    if not db.get(Kitchen, kid):
        raise HTTPException(404, "Kitchen not found")
    created = []
    for row in body[:200]:
        name = (row.get("name") or "").strip()
        price = row.get("price")
        if not name or price is None:
            continue
        try:
            price = int(price)
        except (TypeError, ValueError):
            continue
        # resolve category by name
        cat_name = (row.get("category") or "").strip()
        cat_id = None
        if cat_name:
            cat = db.query(MenuCategory).filter_by(kitchen_id=kid, name=cat_name).first()
            if not cat:
                cat = MenuCategory(id=secrets.token_hex(6), kitchen_id=kid,
                                   name=cat_name, sort_order=0)
                db.add(cat)
                db.flush()
            cat_id = cat.id
        veg_val = str(row.get("veg") or "").strip().lower()
        veg = veg_val not in ("false", "0", "no", "non-veg")
        item = MenuItem(
            id=secrets.token_hex(8), kitchen_id=kid, category_id=cat_id,
            name=name, price=price, veg=veg,
            descr=(row.get("description") or "").strip(),
            available=True,
        )
        db.add(item)
        created.append(item.id)
    db.commit()
    return {"created": len(created)}


@app.get("/kitchens/{kid}/analytics")
def kitchen_analytics(kid: str, authorization: str = Header(default=""),
                      db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)

    now         = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=6)

    week_orders = (db.query(Order)
                   .filter(Order.kitchen_id == kid, Order.created_at >= week_start)
                   .all())
    today_orders = [o for o in week_orders if o.created_at >= today_start]

    # daily breakdown — last 7 days
    daily_map = defaultdict(lambda: {"count": 0, "revenue": 0})
    for o in week_orders:
        day = o.created_at.strftime("%Y-%m-%d")
        daily_map[day]["count"]   += 1
        daily_map[day]["revenue"] += o.total
    daily = []
    for i in range(6, -1, -1):
        d   = today_start - timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        daily.append({
            "date": key,
            "label": "Today" if i == 0 else d.strftime("%d %b"),
            "count":   daily_map[key]["count"],
            "revenue": daily_map[key]["revenue"],
        })

    # mode breakdown (all-time)
    all_orders = db.query(Order).filter(Order.kitchen_id == kid).all()
    modes: dict = {}
    for o in all_orders:
        m = modes.setdefault(o.mode, {"count": 0, "revenue": 0})
        m["count"]   += 1
        m["revenue"] += o.total

    # top items all-time
    item_map: dict = {}
    for oi in (db.query(OrderItem).join(Order).filter(Order.kitchen_id == kid).all()):
        e = item_map.setdefault(oi.name, {"name": oi.name, "qty": 0, "revenue": 0})
        e["qty"]     += oi.qty
        e["revenue"] += oi.price * oi.qty
    top_items = sorted(item_map.values(), key=lambda x: x["qty"], reverse=True)[:5]

    active_week  = [o for o in week_orders  if not (o.cancelled or False)]
    active_today = [o for o in today_orders if not (o.cancelled or False)]
    recent_earning = sorted(
        [o for o in all_orders if not (o.cancelled or False)],
        key=lambda x: x.created_at, reverse=True
    )[:20]

    return {
        "today":     {"count": len(active_today), "revenue": sum(o.total for o in active_today),
                      "food_earnings": sum(o.food_total for o in active_today)},
        "week":      {"count": len(active_week),  "revenue": sum(o.total for o in active_week),
                      "food_earnings": sum(o.food_total for o in active_week)},
        "daily":     daily,
        "modes":     modes,
        "top_items": top_items,
        "earnings":  [{"id": o.id,
                        "date": o.created_at.strftime("%d %b, %I:%M %p"),
                        "food_total": o.food_total,
                        "skip_fee":   o.skip_fee,
                        "net":        o.food_total - o.skip_fee} for o in recent_earning],
    }


@app.post("/orders/{oid}/advance")
def advance(oid: str, body: AdvanceIn, db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    flow = FLOW[o.mode]
    if o.status_index >= len(flow) - 1:
        raise HTTPException(400, "Order already complete")

    moving_to_final = o.status_index == len(flow) - 2
    if moving_to_final and o.mode == "pickup":
        if not body.otp or body.otp != o.otp:
            raise HTTPException(403, "Pickup code does not match")

    o.status_index += 1
    db.commit()
    db.refresh(o)
    return serialize(o)


class RiderIn(BaseModel):
    name: str
    veh: str

@app.patch("/orders/{oid}/rider")
def assign_rider(oid: str, body: RiderIn, db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    if o.mode != "deliver":
        raise HTTPException(400, "Not a delivery order")
    o.rider_name = body.name.strip()
    o.rider_veh  = body.veh.strip()
    db.commit()
    db.refresh(o)
    return serialize(o)


@app.post("/orders/{oid}/book-porter")
def book_porter(oid: str, authorization: str = Header(default=""),
                db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    verify_kitchen_owner(o.kitchen_id, authorization, db)
    if o.mode != "deliver":
        raise HTTPException(400, "Not a delivery order")
    if o.porter_order_id:
        raise HTTPException(400, "Porter rider already booked for this order")
    if not o.delivery_address:
        raise HTTPException(400, "Order has no delivery address")

    kitchen = db.get(Kitchen, o.kitchen_id)
    pickup_addr = kitchen.location_address or (kitchen.name + ", India")
    drop_addr   = o.delivery_address

    # Geocode both addresses
    p_lat, p_lng, p_city = _geocode(pickup_addr)
    d_lat, d_lng, d_city = _geocode(drop_addr)

    if not p_lat:
        raise HTTPException(400,
            "Could not locate your restaurant. Set a precise address in your kitchen profile.")
    if not d_lat:
        raise HTTPException(400,
            "Could not locate the customer's delivery address. Ask them to re-enter it.")

    result = _porter("POST", "/orders", {
        "request_id":   oid,
        "delivery_instructions": {
            "instructions_list": [{"type": "text",
                                   "description": f"Food order #{oid} — handle with care"}]
        },
        "pickup_details": {
            "address": _porter_address_block(pickup_addr, p_lat, p_lng, p_city),
            "contact": {
                "name": kitchen.name,
                "phone_number": {"country_code": "+91", "number": "8040004000"},
            },
        },
        "drop_details": {
            "address": _porter_address_block(drop_addr, d_lat, d_lng, d_city),
            "contact": {
                "name": "Customer",
                "phone_number": {
                    "country_code": "+91",
                    "number": (o.customer_phone or "").lstrip("+91").lstrip("91"),
                },
            },
        },
        "additional_comments": f"Skip Wait · order #{oid}",
        "is_return_trip_required": False,
    })

    o.porter_order_id = result.get("order_id")
    tracking = (result.get("tracking_link") or
                f"https://porter.in/track/{o.porter_order_id}")
    o.porter_tracking_url = tracking

    partner = result.get("partner_info") or {}
    if partner.get("name"):
        o.rider_name = partner["name"]
        veh = partner.get("vehicle_details", {})
        o.rider_veh  = veh.get("number") or veh.get("type") or "Two-wheeler"

    db.commit()
    return {
        "porter_order_id":    o.porter_order_id,
        "porter_tracking_url": o.porter_tracking_url,
        "partner": partner or None,
        "fare_inr": (result.get("fare", {}).get("minor_amount", 0) or 0) // 100,
    }


@app.get("/orders/{oid}/porter-status")
def get_porter_status(oid: str, authorization: str = Header(default=""),
                      db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    if not o.porter_order_id:
        raise HTTPException(404, "No Porter delivery booked for this order")

    result = _porter("GET", f"/orders/{o.porter_order_id}")
    partner = result.get("partner_info") or {}

    # Sync rider info if Porter assigned someone after booking
    if partner.get("name") and not o.rider_name:
        o.rider_name = partner["name"]
        veh = partner.get("vehicle_details", {})
        o.rider_veh  = veh.get("number") or veh.get("type") or "Two-wheeler"
        db.commit()

    return {
        "status":         result.get("status"),
        "partner":        partner or None,
        "tracking_url":   o.porter_tracking_url,
        "fare_inr":       (result.get("fare", {}).get("minor_amount", 0) or 0) // 100,
    }


class RateIn(BaseModel):
    rating: int

@app.post("/orders/{oid}/rate")
def rate_order(oid: str, body: RateIn, phone: str = Depends(current_phone),
               db: Session = Depends(get_db)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be 1-5")
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    if o.customer_phone != phone:
        raise HTTPException(403, "Not your order")
    if not o.done if hasattr(o, 'done') else o.status_index < len(FLOW[o.mode]) - 1:
        raise HTTPException(400, "Order not complete yet")
    o.order_rating = body.rating
    # recalculate kitchen's average rating
    kitchen = db.get(Kitchen, o.kitchen_id)
    if kitchen:
        rated = db.query(Order).filter(
            Order.kitchen_id == kitchen.id,
            Order.order_rating.isnot(None)
        ).all()
        kitchen.rating = round(sum(r.order_rating for r in rated) / len(rated), 1)
    db.commit()
    return {"ok": True}


@app.post("/orders/{oid}/cancel")
def cancel_order(oid: str, phone: str = Depends(current_phone),
                 db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    if o.customer_phone != phone:
        raise HTTPException(403, "Not your order")
    if o.status_index > 0:
        raise HTTPException(400, "Order already accepted — contact the kitchen")
    if o.cancelled:
        raise HTTPException(400, "Already cancelled")
    o.cancelled = True
    kitchen = db.get(Kitchen, o.kitchen_id)
    if kitchen:
        kitchen.credit_balance += o.skip_fee   # refund the deducted fee
    db.commit()
    db.refresh(o)
    return serialize(o)


@app.post("/orders/{oid}/reject")
def reject_order(oid: str, authorization: str = Header(default=""),
                 db: Session = Depends(get_db)):
    o = db.get(Order, oid)
    if not o:
        raise HTTPException(404, "Order not found")
    verify_kitchen_owner(o.kitchen_id, authorization, db)
    if o.status_index > 0:
        raise HTTPException(400, "Order already in progress")
    if o.cancelled:
        raise HTTPException(400, "Already cancelled")
    o.cancelled = True
    kitchen = db.get(Kitchen, o.kitchen_id)
    if kitchen:
        kitchen.credit_balance += o.skip_fee
    db.commit()
    db.refresh(o)
    return serialize(o)


# ── saved addresses ──
class AddressIn(BaseModel):
    label:   str
    address: str

@app.get("/me/addresses")
def list_addresses(phone: str = Depends(current_phone), db: Session = Depends(get_db)):
    rows = db.query(SavedAddress).filter_by(phone=phone).all()
    return [{"id": r.id, "label": r.label, "address": r.address} for r in rows]

@app.post("/me/addresses")
def add_address(body: AddressIn, phone: str = Depends(current_phone),
                db: Session = Depends(get_db)):
    row = SavedAddress(phone=phone, label=body.label.strip(), address=body.address.strip())
    db.add(row); db.commit(); db.refresh(row)
    return {"id": row.id, "label": row.label, "address": row.address}

@app.delete("/me/addresses/{aid}")
def delete_address(aid: int, phone: str = Depends(current_phone),
                   db: Session = Depends(get_db)):
    row = db.query(SavedAddress).filter_by(id=aid, phone=phone).first()
    if not row:
        raise HTTPException(404, "Address not found")
    db.delete(row); db.commit()
    return {"ok": True}


# ── variants ──
class VariantIn(BaseModel):
    name:  str
    price: int

@app.post("/kitchens/{kid}/menu/{iid}/variants")
def add_variant(kid: str, iid: str, body: VariantIn,
                authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    mi = db.get(MenuItem, iid)
    if not mi or mi.kitchen_id != kid:
        raise HTTPException(404, "Item not found")
    vid = "v" + str(random.randint(100000, 999999))
    v = ItemVariant(id=vid, item_id=iid, name=body.name.strip(), price=body.price)
    db.add(v); db.commit(); db.refresh(v)
    return {"id": v.id, "name": v.name, "price": v.price}

@app.delete("/kitchens/{kid}/menu/{iid}/variants/{vid}")
def delete_variant(kid: str, iid: str, vid: str,
                   authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    v = db.get(ItemVariant, vid)
    if not v or v.item_id != iid:
        raise HTTPException(404, "Variant not found")
    db.delete(v); db.commit()
    return {"ok": True}


# ── promo codes ──
class PromoIn(BaseModel):
    code:      str
    type:      str = "flat"   # flat | percent
    value:     int
    min_order: int = 0
    max_uses:  Optional[int] = None

def promo_dict(p: PromoCode):
    return {"id": p.id, "code": p.code, "type": p.type, "value": p.value,
            "min_order": p.min_order, "max_uses": p.max_uses,
            "used_count": p.used_count, "active": p.active}

@app.get("/kitchens/{kid}/promos")
def list_promos(kid: str, authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    return [promo_dict(p) for p in db.query(PromoCode).filter_by(kitchen_id=kid).all()]

class PromoValidateIn(BaseModel):
    code:       str
    kitchen_id: str
    food_total: int

@app.post("/promos/validate")
def validate_promo(body: PromoValidateIn, db: Session = Depends(get_db)):
    from sqlalchemy import or_
    code = body.code.upper().strip()
    promo = db.query(PromoCode).filter(
        PromoCode.code == code, PromoCode.active == True,
    ).filter(
        or_(PromoCode.kitchen_id == body.kitchen_id, PromoCode.kitchen_id.is_(None))
    ).first()
    if not promo:
        raise HTTPException(400, "Invalid or expired promo code")
    if body.food_total < promo.min_order:
        raise HTTPException(400, f"Minimum order ₹{promo.min_order} required")
    if promo.max_uses and promo.used_count >= promo.max_uses:
        raise HTTPException(400, "Promo usage limit reached")
    discount = min(
        round(body.food_total * promo.value / 100) if promo.type == "percent" else promo.value,
        body.food_total
    )
    return {"code": promo.code, "discount": discount, "type": promo.type, "value": promo.value}

@app.post("/kitchens/{kid}/promos")
def create_promo(kid: str, body: PromoIn,
                 authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    code = body.code.upper().strip()
    if db.query(PromoCode).filter_by(code=code).first():
        raise HTTPException(400, "Code already exists")
    p = PromoCode(kitchen_id=kid, code=code, type=body.type, value=body.value,
                  min_order=body.min_order, max_uses=body.max_uses)
    db.add(p); db.commit(); db.refresh(p)
    return promo_dict(p)

@app.delete("/kitchens/{kid}/promos/{pid}")
def delete_promo(kid: str, pid: int,
                 authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    p = db.query(PromoCode).filter_by(id=pid, kitchen_id=kid).first()
    if not p: raise HTTPException(404, "Promo not found")
    db.delete(p); db.commit()
    return {"ok": True}


# ── kitchen hours ──
class HourSlot(BaseModel):
    day:    int
    open:   str = "09:00"
    close:  str = "22:00"
    closed: bool = False

class HoursIn(BaseModel):
    schedule: list[HourSlot]

@app.get("/kitchens/{kid}/hours")
def get_hours(kid: str, db: Session = Depends(get_db)):
    rows = db.query(KitchenHours).filter_by(kitchen_id=kid).order_by(KitchenHours.day_of_week).all()
    return [{"day": r.day_of_week, "open": r.open_time, "close": r.close_time, "closed": r.is_closed} for r in rows]

@app.put("/kitchens/{kid}/hours")
def set_hours(kid: str, body: HoursIn,
              authorization: str = Header(default=""), db: Session = Depends(get_db)):
    verify_kitchen_owner(kid, authorization, db)
    db.query(KitchenHours).filter_by(kitchen_id=kid).delete()
    for s in body.schedule:
        db.add(KitchenHours(kitchen_id=kid, day_of_week=s.day,
                            open_time=s.open, close_time=s.close, is_closed=s.closed))
    db.commit()
    return {"ok": True}


# ── admin stats ──
@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db), _: str = Depends(require_admin)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_start  = today_start - timedelta(days=6)
    all_orders  = db.query(Order).filter(Order.cancelled == False).all()
    today_orders = [o for o in all_orders if o.created_at and o.created_at >= today_start]
    week_orders  = [o for o in all_orders if o.created_at and o.created_at >= week_start]
    kitchens = db.query(Kitchen).all()
    kitchen_rows = []
    for k in kitchens:
        kt = [o for o in today_orders if o.kitchen_id == k.id]
        kw = [o for o in week_orders  if o.kitchen_id == k.id]
        kitchen_rows.append({
            "id": k.id, "name": k.name, "is_open": k.is_open,
            "credit_balance": k.credit_balance,
            "orders_today": len(kt), "revenue_today": sum(o.total for o in kt),
            "orders_week":  len(kw), "revenue_week":  sum(o.total for o in kw),
        })
    return {
        "orders_today":  len(today_orders),
        "revenue_today": sum(o.total for o in today_orders),
        "orders_week":   len(week_orders),
        "revenue_week":  sum(o.total for o in week_orders),
        "kitchens":      kitchen_rows,
    }


# ── admin ──
@app.get("/admin/kitchens")
def admin_kitchens(db: Session = Depends(get_db), _: str = Depends(require_admin)):
    owners = {u.kitchen_id: u.phone
              for u in db.query(User).filter(User.kitchen_id.isnot(None)).all()}
    return [{
        "id": k.id, "name": k.name, "tag": k.tag, "rating": k.rating,
        "eta": k.eta, "dist": k.dist, "grad": [k.grad_from, k.grad_to],
        "credit_balance": k.credit_balance,
        "owner_phone": owners.get(k.id),
    } for k in db.query(Kitchen).all()]


@app.post("/admin/kitchens/{kid}/topup")
def admin_topup(kid: str, body: dict, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    amount = int(body.get("amount", 0))
    if amount <= 0:
        raise HTTPException(400, "Amount must be positive")
    k.credit_balance += amount
    db.commit()
    return {"id": k.id, "credit_balance": k.credit_balance}


@app.post("/admin/kitchens")
def admin_create_kitchen(body: KitchenCreateIn, db: Session = Depends(get_db),
                         _: str = Depends(require_admin)):
    kid = body.id or ("k_" + secrets.token_urlsafe(5))
    if db.get(Kitchen, kid):
        raise HTTPException(400, f"Kitchen id '{kid}' already exists")
    db.add(Kitchen(
        id=kid, name=body.name, tag=body.tag, eta=body.eta, dist=body.dist,
        grad_from=body.grad_from, grad_to=body.grad_to,
        rating=4.0, credit_balance=body.credit_balance,
    ))
    owner_phone = (body.owner_phone or "").strip()
    if owner_phone:
        u = db.get(User, owner_phone)
        if not u:
            db.add(User(phone=owner_phone, role="kitchen", kitchen_id=kid))
        else:
            u.role = "kitchen"
            u.kitchen_id = kid
    db.commit()
    return {
        "id": kid, "name": body.name, "tag": body.tag, "rating": 4.0,
        "eta": body.eta, "dist": body.dist, "grad": [body.grad_from, body.grad_to],
        "credit_balance": body.credit_balance,
        "owner_phone": owner_phone or None,
    }


@app.get("/admin/users")
def admin_users(db: Session = Depends(get_db), _: str = Depends(require_admin)):
    return [{"phone": u.phone, "role": u.role, "kitchen_id": u.kitchen_id,
             "is_banned": bool(u.is_banned)}
            for u in db.query(User).all()]


@app.patch("/admin/users/{phone}/role")
def admin_set_role(phone: str, body: dict, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    u = db.get(User, phone)
    if not u:
        raise HTTPException(404, "User not found")
    new_role = body.get("role")
    if new_role not in ("customer", "kitchen", "admin"):
        raise HTTPException(400, "role must be customer | kitchen | admin")
    u.role = new_role
    if new_role != "kitchen":
        u.kitchen_id = None
    db.commit()
    return {"phone": u.phone, "role": u.role, "kitchen_id": u.kitchen_id}


@app.patch("/admin/users/{phone}/kitchen")
def admin_assign_kitchen(phone: str, body: dict, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    u = db.get(User, phone)
    if not u:
        raise HTTPException(404, "User not found")
    if u.role != "kitchen":
        raise HTTPException(400, "User must have kitchen role first")
    kid = body.get("kitchen_id")
    if kid and not db.get(Kitchen, kid):
        raise HTTPException(404, "Kitchen not found")
    u.kitchen_id = kid or None
    db.commit()
    return {"phone": u.phone, "role": u.role, "kitchen_id": u.kitchen_id}


@app.patch("/admin/users/{phone}/ban")
def admin_ban_user(phone: str, body: dict, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    if phone == ADMIN_PHONE:
        raise HTTPException(400, "Cannot ban the super admin")
    u = db.get(User, phone)
    if not u:
        raise HTTPException(404, "User not found")
    u.is_banned = bool(body.get("banned", True))
    db.commit()
    return {"phone": u.phone, "is_banned": u.is_banned}


@app.patch("/admin/users/{phone}/set-password")
def admin_set_user_password(phone: str, body: SetPasswordIn,
                             db: Session = Depends(get_db),
                             _: str = Depends(require_admin)):
    user = db.get(User, phone)
    if not user:
        raise HTTPException(404, "User not found")
    if len(body.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    user.hashed_pw = _hash_pw(phone, body.password)
    db.commit()
    return {"ok": True}


@app.delete("/admin/kitchens/{kid}")
def admin_delete_kitchen(kid: str, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    k = db.get(Kitchen, kid)
    if not k:
        raise HTTPException(404, "Kitchen not found")
    # disown any users assigned to this kitchen
    for u in db.query(User).filter(User.kitchen_id == kid).all():
        u.kitchen_id = None
        u.role = "customer"
    db.delete(k)
    db.commit()
    return {"deleted": kid}


def _order_status(o: Order) -> str:
    flow = FLOW.get(o.mode, FLOW["pickup"])
    idx  = max(0, min(o.status_index, len(flow) - 1))
    return flow[idx]


@app.get("/admin/orders")
def admin_all_orders(db: Session = Depends(get_db), _: str = Depends(require_admin)):
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(200).all()
    kitchens = {k.id: k.name for k in db.query(Kitchen).all()}
    return [{
        "id": o.id, "kitchen_id": o.kitchen_id,
        "kitchen_name": kitchens.get(o.kitchen_id, o.kitchen_id),
        "customer_phone": o.customer_phone,
        "mode": o.mode, "status": _order_status(o), "total": o.total,
        "cancelled": o.cancelled,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    } for o in orders]


@app.get("/admin/users/{phone}/orders")
def admin_user_orders(phone: str, db: Session = Depends(get_db), _: str = Depends(require_admin)):
    orders = db.query(Order).filter(Order.customer_phone == phone)\
               .order_by(Order.created_at.desc()).all()
    kitchens = {k.id: k.name for k in db.query(Kitchen).all()}
    return [{
        "id": o.id, "kitchen_name": kitchens.get(o.kitchen_id, o.kitchen_id),
        "mode": o.mode, "status": _order_status(o), "total": o.total,
        "cancelled": o.cancelled,
        "created_at": o.created_at.isoformat() if o.created_at else None,
    } for o in orders]


# ─────────────────────────── seed ───────────────────────────
def seed():
    db = SessionLocal()
    if db.query(Kitchen).count() == 0:
        kitchens_data = [
            ("k1", "Pink City Rotis",  "North Indian, Thalis", 4.3, 14, "1.2 km", "#F6B14E", "#E8702A"),
            ("k2", "Tandoori Tales",   "Kebabs, Tandoor",      4.5, 18, "2.0 km", "#E0524E", "#9C1F2B"),
            ("k3", "Chai Pin Cafe",    "Snacks, Beverages",    4.1,  8, "0.6 km", "#D7A86E", "#8C5A2B"),
        ]
        for kid, name, tag, rating, eta, dist, gf, gt in kitchens_data:
            db.add(Kitchen(id=kid, name=name, tag=tag, rating=rating, eta=eta,
                           dist=dist, grad_from=gf, grad_to=gt, credit_balance=5000))
        db.commit()

        # Categories
        cats = [
            ("cat1", "k1", "Thalis",       0),
            ("cat2", "k1", "Single Dishes", 1),
            ("cat3", "k2", "Veg Starters",  0),
            ("cat4", "k2", "Non-Veg Mains", 1),
            ("cat5", "k3", "Snacks",        0),
            ("cat6", "k3", "Beverages",     1),
        ]
        for cid, kid, name, order in cats:
            db.add(MenuCategory(id=cid, kitchen_id=kid, name=name, sort_order=order))
        db.commit()

        # Menu items
        items = [
            ("i1", "k1", "cat2", "Dal Baati Churma",       180, True,  "Baked baati, ghee, churma"),
            ("i2", "k1", "cat2", "Gatte ki Sabzi + 4 Roti",150, True,  "Gram-flour dumplings in curd gravy"),
            ("i3", "k1", "cat1", "Rajasthani Thali",       240, True,  "Dal, kadhi, sabzi, roti, rice, sweet"),
            ("i4", "k2", "cat3", "Paneer Tikka",           220, True,  "Char-grilled cottage cheese"),
            ("i5", "k2", "cat3", "Tandoori Chaap",         190, True,  "Soya chaap, smoky masala"),
            ("i6", "k2", "cat4", "Butter Chicken + Naan",  280, False, "Creamy makhani, butter naan"),
            ("i7", "k3", "cat5", "Pyaaz Kachori (2)",       70, True,  "Flaky onion kachori"),
            ("i8", "k3", "cat6", "Masala Chai",             30, True,  "Cutting chai, kulhad"),
            ("i9", "k3", "cat5", "Maggi + Chai Combo",      90, True,  "Masala Maggi & chai"),
        ]
        for iid, kid, cid, name, price, veg, descr in items:
            db.add(MenuItem(id=iid, kitchen_id=kid, category_id=cid,
                            name=name, price=price, veg=veg, descr=descr))
        db.commit()

        # Seed a couple of tables for Pink City Rotis
        tables = [
            ("tbl1", "k1", "Table 1", secrets.token_urlsafe(12)),
            ("tbl2", "k1", "Table 2", secrets.token_urlsafe(12)),
            ("tbl3", "k1", "Counter", secrets.token_urlsafe(12)),
        ]
        for tid, kid, label, token in tables:
            db.add(DineTable(id=tid, kitchen_id=kid, label=label, qr_token=token))
        db.commit()

    # Test accounts
    test_users = [
        ("9000000001", "admin",    None),
        ("9000000002", "kitchen",  "k1"),
        ("9000000003", "customer", None),
    ]
    for phone, role, kid in test_users:
        if not db.get(User, phone):
            db.add(User(phone=phone, role=role, kitchen_id=kid))
    db.commit()

    # Real admin account — always ensure it exists with the correct password
    real_admin = db.get(User, ADMIN_PHONE)
    if not real_admin:
        db.add(User(phone=ADMIN_PHONE, role="admin", hashed_pw=ADMIN_PW_HASH))
    else:
        real_admin.role      = "admin"
        real_admin.hashed_pw = ADMIN_PW_HASH
    db.commit()
    db.close()

# ── serve built frontend in production (if present) ────────────────────────
if os.path.isdir(_FRONTEND_DIST):
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    app.mount("/assets", StaticFiles(directory=os.path.join(_FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def _serve_frontend(full_path: str):
        candidate = os.path.join(_FRONTEND_DIST, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(_FRONTEND_DIST, "index.html"))


seed()
