import React, { useState, useEffect, useCallback } from "react";
import {
  Search, MapPin, ChevronLeft, ChevronRight, Star, Plus, Minus,
  Phone, Clock, Bike, ShoppingBag, Check, ShieldCheck, Timer, LogOut,
  Pencil, Trash2, Tag, QrCode, UtensilsCrossed, X, History,
  Eye, EyeOff, Power, Image, TrendingUp, User,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { api, getToken, getRole, getKitchenId, getPhone, setPhone, setSession, clearSession } from "./api.js";

const C = {
  primary: "#B03526", primarySoft: "#F8E4DE", primaryBorder: "#EBC2B7",
  primaryDark: "#8A2418", red: "#B03526", rating: "#3E7C4F",
  text: "#2B1E16", sub: "rgba(43,30,22,.6)", line: "rgba(43,30,22,.1)",
  bg: "#FBF4EA", card: "#FFFBF4", panel: "#F0E6D6",
  veg: "#3E7C4F", nonveg: "#B03526",
};
const SANS    = `'Schibsted Grotesk',system-ui,-apple-system,sans-serif`;
const DISPLAY = `'Bricolage Grotesque',system-ui,sans-serif`;
const MONO    = `ui-monospace,"SF Mono",Menlo,monospace`;
const DINE_IN_ENABLED = false; // temporarily disabled — dine-in is "coming soon"

const FLOW = {
  pickup:  ["Order placed", "Preparing", "Ready for pickup", "Picked up"],
  deliver: ["Order placed", "Preparing", "Out for delivery", "Delivered"],
  dine_in: ["Order placed", "Preparing", "Served at table", "Completed"],
};
const bill = (food, mode) => {
  const pack = Math.round(food * 0.04) + 8, gst = Math.round(food * 0.05);
  const delivery = mode === "deliver" ? 38 : 0, skipFee = 5;
  return { pack, gst, delivery, skipFee, total: food + pack + gst + delivery + skipFee };
};

/* ── shared ── */
const VegMark = ({ veg }) => {
  const col = veg ? C.veg : C.nonveg;
  return (
    <span style={{ display: "inline-flex", width: 15, height: 15, border: `1.5px solid ${col}`,
      borderRadius: 3, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: col }} />
    </span>
  );
};
const RatingPill = ({ r }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 2, background: C.rating,
    color: "#fff", borderRadius: 5, padding: "1px 5px", fontSize: 12, fontWeight: 700 }}>
    {r} <Star size={10} fill="#fff" stroke="none" />
  </span>
);
const Bar = ({ children }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>{children}</div>
);
const Note = ({ children }) => (
  <div style={{ padding: "20px 16px", color: C.sub, fontSize: 13.5 }}>{children}</div>
);
const shell = {
  maxWidth: 440, margin: "0 auto", background: C.bg, minHeight: "100vh",
  borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`,
};

/* ── set password modal ── */
function SetPasswordModal({ onClose }) {
  const [pw,  setPw]  = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState("");
  const [err,  setErr]  = useState("");

  const save = async () => {
    if (pw.length < 6) return setErr("At least 6 characters");
    if (pw !== pw2)    return setErr("Passwords don't match");
    setBusy(true); setErr("");
    try {
      await api.setMyPassword(pw);
      setMsg("Password set! You can now log in with password next time.");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const inp = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12,
    padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
    background: C.bg, marginTop: 8, marginBottom: 14 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.card, borderRadius: "24px 24px 0 0",
        padding: "22px 24px 40px", zIndex: 50, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18 }}>Set a password</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.sub }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 1.5 }}>
          Set a password so you can log in without OTP next time.
        </div>
        {msg ? (
          <div style={{ background: C.primarySoft, color: C.primary, borderRadius: 12,
            padding: "14px 16px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>
            {msg}
            <br />
            <button onClick={onClose} style={{ marginTop: 12, background: C.primary, color: "#fff",
              border: "none", borderRadius: 999, padding: "10px 24px", fontWeight: 800,
              cursor: "pointer", fontSize: 14 }}>Done</button>
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>New password</label>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)}
              placeholder="At least 6 characters" style={inp} />
            <label style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>Confirm password</label>
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
              placeholder="Repeat password" style={{ ...inp, marginBottom: 0 }} />
            {err && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginTop: 8 }}>{err}</div>}
            <button onClick={save} disabled={busy}
              style={{ width: "100%", marginTop: 18, background: busy ? C.sub : C.primary,
                color: "#fff", border: "none", borderRadius: 999, padding: "14px",
                fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
              {busy ? "Saving…" : "Save password"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ── profile (saved addresses) ── */
function ProfileModal({ onClose }) {
  const [addrs,  setAddrs]  = useState([]);
  const [label,  setLabel]  = useState("");
  const [addr,   setAddr]   = useState("");
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  useEffect(() => { api.listAddresses().then(setAddrs).catch(() => {}); }, []);

  const add = async () => {
    if (!label.trim() || !addr.trim()) return setErr("Enter a label and address");
    setBusy(true); setErr("");
    try {
      const saved = await api.addAddress(label.trim(), addr.trim());
      setAddrs((a) => [...a, saved]);
      setLabel(""); setAddr("");
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const remove = async (aid) => {
    try { await api.deleteAddress(aid); setAddrs((a) => a.filter((x) => x.id !== aid)); }
    catch (e) { setErr(e.message); }
  };

  const inp = { width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 12,
    padding: "12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
    background: C.bg, marginTop: 8, marginBottom: 14 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.card, borderRadius: "24px 24px 0 0",
        padding: "22px 24px 40px", zIndex: 50, boxSizing: "border-box",
        maxHeight: "85vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18 }}>My profile</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.sub }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 18, fontFamily: MONO }}>
          +91 {getPhone()}
        </div>

        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Saved addresses</div>
        {addrs.length === 0 && (
          <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 14 }}>
            No saved addresses yet. Add one below for faster checkout.
          </div>
        )}
        {addrs.map((a) => (
          <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 10,
            background: C.panel, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
            <MapPin size={15} style={{ color: C.primary, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</div>
              <div style={{ fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 1.4 }}>{a.address}</div>
            </div>
            <button onClick={() => remove(a.id)} title="Delete address"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.sub, flexShrink: 0 }}>
              <Trash2 size={15} />
            </button>
          </div>
        ))}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Add a new address</div>
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>Label</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Home, Office" style={inp} />
          <label style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>Address</label>
          <textarea value={addr} onChange={(e) => setAddr(e.target.value)} rows={3}
            placeholder="Flat / house no., street, area, landmark…"
            style={{ ...inp, resize: "none", fontFamily: SANS }} />
          {err && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{err}</div>}
          <button onClick={add} disabled={busy}
            style={{ width: "100%", background: busy ? C.sub : C.primary,
              color: "#fff", border: "none", borderRadius: 999, padding: "14px",
              fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
            {busy ? "Saving…" : "Save address"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── top bar ── */
function TopBar({ role, brand, onLogout, onHistory, onSetPassword, onProfile }) {
  if (brand && role === "customer") {
    const g = brand.grad || [C.primary, "#E8702A"];
    return (
      <div style={{ background: `linear-gradient(135deg,${g[0]},${g[1]})`,
        padding: "12px 16px 10px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, lineHeight: 1.1, letterSpacing: "-.02em" }}>{brand.kitchen_name}</div>
            {brand.kitchen_tag && (
              <div style={{ fontSize: 12, opacity: .85, marginTop: 2 }}>{brand.kitchen_tag}</div>
            )}
            {brand.table_label && (
              <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
                background: "rgba(255,255,255,.2)", borderRadius: 99, padding: "3px 10px",
                fontSize: 12, fontWeight: 700 }}>
                🍽 {brand.table_label}
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 2 }}>
            <button onClick={onProfile} title="My profile"
              style={{ cursor: "pointer", border: "none", background: "rgba(255,255,255,.2)",
                color: "#fff", display: "flex", padding: 7, borderRadius: 8 }}>
              <User size={15} />
            </button>
            <button onClick={onHistory} title="My orders"
              style={{ cursor: "pointer", border: "none", background: "rgba(255,255,255,.2)",
                color: "#fff", display: "flex", padding: 7, borderRadius: 8 }}>
              <History size={15} />
            </button>
            <button onClick={onSetPassword} title="Set password"
              style={{ cursor: "pointer", border: "none", background: "rgba(255,255,255,.2)",
                color: "#fff", display: "flex", padding: 7, borderRadius: 8 }}>
              <ShieldCheck size={15} />
            </button>
            <button onClick={onLogout} title="Log out"
              style={{ cursor: "pointer", border: "none", background: "rgba(255,255,255,.2)",
                color: "#fff", display: "flex", padding: 7, borderRadius: 8 }}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 10, opacity: .55, marginTop: 6, letterSpacing: ".3px" }}>
          powered by skip·wait
        </div>
      </div>
    );
  }

  const badge = role === "kitchen"
    ? { bg: C.rating, color: "#fff", label: "Kitchen" }
    : { bg: C.primary, color: "#fff", label: "Customer" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px", background: C.panel, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, letterSpacing: "-.02em", color: C.text }}>
        skip<span style={{ color: C.primary }}>·</span>wait
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 99,
          background: badge.bg, color: badge.color, letterSpacing: ".4px" }}>
          {badge.label}
        </span>
        {role === "customer" && (
          <>
            <button onClick={onProfile} title="My profile"
              style={{ cursor: "pointer", border: "none", background: "transparent", color: C.sub,
                display: "flex", padding: 4 }}><User size={15} /></button>
            <button onClick={onHistory} title="My orders"
              style={{ cursor: "pointer", border: "none", background: "transparent", color: C.sub,
                display: "flex", padding: 4 }}><History size={15} /></button>
            <button onClick={onSetPassword} title="Set password"
              style={{ cursor: "pointer", border: "none", background: "transparent", color: C.sub,
                display: "flex", padding: 4 }}><ShieldCheck size={15} /></button>
          </>
        )}
        <button onClick={onLogout} title="Log out"
          style={{ cursor: "pointer", border: "none", background: "transparent", color: C.sub,
            display: "flex", padding: 4 }}><LogOut size={15} /></button>
      </div>
    </div>
  );
}

/* ── root ── */
export default function App({ tableToken, kitchenSlug, sharedOrderId }) {
  const [authed,    setAuthed]    = useState(!!getToken());
  const [role,      setRole]      = useState(getRole() || "customer");
  const [kitchenId, setKitchenId] = useState(getKitchenId() || null);
  // brand = { kitchen_id, kitchen_name, kitchen_tag, grad, table_id?, table_label? }
  const [brand,     setBrand]     = useState(null);
  const [showHistory,   setShowHistory]   = useState(false);
  const [showSetPw,     setShowSetPw]     = useState(false);
  const [showProfile,   setShowProfile]   = useState(false);
  const [reorderIntent, setReorderIntent] = useState(null);
  const [showRegister,  setShowRegister]  = useState(false);

  useEffect(() => {
    if (tableToken) {
      // Dine-in is temporarily disabled — resolve the kitchen only, drop table_id/table_label
      // so the customer lands on the normal pickup/delivery flow instead of being locked to a table.
      api.resolveTable(tableToken).then((info) => setBrand({
        kitchen_id: info.kitchen_id, kitchen_name: info.kitchen_name,
        kitchen_tag: info.kitchen_tag, grad: info.grad,
        ...(DINE_IN_ENABLED ? { table_id: info.table_id, table_label: info.table_label } : {}),
      })).catch(() => {});
    } else if (kitchenSlug) {
      api.resolveKitchen(kitchenSlug).then((info) => setBrand({
        kitchen_id: info.kitchen_id, kitchen_name: info.kitchen_name,
        kitchen_tag: info.kitchen_tag, grad: info.grad,
      })).catch(() => {});
    }
  }, [tableToken, kitchenSlug]);

  const logout = () => {
    clearSession(); setAuthed(false); setRole("customer"); setKitchenId(null);
    if (tableToken || kitchenSlug) window.location.href = "/";
  };

  if (sharedOrderId && !authed)
    return (
      <div style={{ fontFamily: SANS, ...shell }}>
        <div style={{ padding: "10px 16px", background: C.primary, color: "#fff",
          fontFamily: MONO, fontWeight: 800, fontSize: 15, letterSpacing: "-0.5px" }}>
          skip<span style={{ opacity: .7 }}>·</span>wait — order tracking
        </div>
        <Track orderId={sharedOrderId} reset={() => window.location.href = "/"} tableInfo={null} />
      </div>
    );

  if (!authed)
    return (
      <div style={{ fontFamily: SANS, ...shell }}>
        <Login brand={brand} onLogin={(r, kid) => { setRole(r); setKitchenId(kid); setAuthed(true); }} />
      </div>
    );

  const handleRegistered = (kid) => {
    setRole("kitchen");
    setKitchenId(kid);
    setShowRegister(false);
    // persist to localStorage so refresh keeps the new role
    const token = getToken();
    setSession(token, "kitchen", kid);
  };

  return (
    <div style={{ fontFamily: SANS, color: C.text, ...shell, padding: 0 }}>
      <TopBar role={role} brand={brand} onLogout={logout}
        onHistory={() => setShowHistory(true)}
        onSetPassword={() => setShowSetPw(true)}
        onProfile={() => setShowProfile(true)} />
      {showSetPw && <SetPasswordModal onClose={() => setShowSetPw(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {role === "admin"   && <AdminView />}
      {role === "kitchen" && <KitchenView kitchenId={kitchenId} />}
      {role === "customer" && (
        showHistory
          ? <OrderHistory onClose={() => setShowHistory(false)}
              onReorder={(kid, items) => { setReorderIntent({ kitchenId: kid, items }); setShowHistory(false); }} />
          : <CustomerView brand={brand} tableToken={tableToken} reorderIntent={reorderIntent}
              clearReorder={() => setReorderIntent(null)}
              onRegister={() => setShowRegister(true)} />
      )}
      {showRegister && (
        <KitchenRegisterModal
          onDone={handleRegistered}
          onClose={() => setShowRegister(false)} />
      )}
    </div>
  );
}

/* ── admin panel ── */
function AdminView() {
  const [kitchens,     setKitchens]     = useState([]);
  const [users,        setUsers]        = useState([]);
  const [tab,          setTab]          = useState("kitchens");
  const [showCreate,   setShowCreate]   = useState(false);
  const [topupTarget,  setTopupTarget]  = useState(null);
  const [topupAmt,     setTopupAmt]     = useState("200");
  const [busy,         setBusy]         = useState(false);
  const [err,          setErr]          = useState("");

  const load = () => {
    api.adminKitchens().then(setKitchens).catch(() => {});
    api.adminUsers().then(setUsers).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const doTopup = async (kid) => {
    setBusy(true); setErr("");
    try { await api.adminTopup(kid, parseInt(topupAmt) || 0); setTopupTarget(null); load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const TAB = (id, label) => (
    <button onClick={() => setTab(id)}
      style={{ padding: "7px 18px", borderRadius: 99, border: "none", cursor: "pointer",
        fontWeight: 700, fontSize: 13,
        background: tab === id ? C.primary : C.panel,
        color: tab === id ? "#fff" : C.sub }}>
      {label}
    </button>
  );

  return (
    <div style={{ padding: "16px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Admin panel</div>
        <div style={{ display: "flex", gap: 8 }}>
          {TAB("kitchens", "Kitchens")}
          {TAB("users", "Users")}
        </div>
      </div>

      {tab === "kitchens" && (
        <>
          <button onClick={() => setShowCreate(true)}
            style={{ marginBottom: 14, padding: "9px 18px", background: C.primary, color: "#fff",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            + Add restaurant
          </button>
          {kitchens.map((k) => (
            <div key={k.id} style={{ background: C.card, borderRadius: 12, padding: "12px 14px",
              marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{k.tag || "—"}</div>
                  <div style={{ fontSize: 11.5, color: C.sub, fontFamily: MONO, marginTop: 3 }}>
                    {k.id}
                  </div>
                  {k.owner_phone && (
                    <div style={{ fontSize: 12, color: C.primary, marginTop: 3 }}>
                      Owner: {k.owner_phone}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: k.credit_balance < 20 ? C.red : C.rating,
                    fontSize: 13 }}>₹{k.credit_balance} cr</div>
                  <button onClick={() => { setTopupTarget(k.id); setTopupAmt("200"); }}
                    style={{ marginTop: 6, padding: "5px 12px", background: C.panel,
                      border: "none", borderRadius: 8, fontSize: 12, cursor: "pointer",
                      fontWeight: 600 }}>
                    Topup
                  </button>
                </div>
              </div>
              {topupTarget === k.id && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <input value={topupAmt} inputMode="numeric"
                    onChange={(e) => setTopupAmt(e.target.value.replace(/\D/g, ""))}
                    style={{ ...inp, marginTop: 0, flex: 1, fontFamily: MONO }} />
                  <button onClick={() => doTopup(k.id)} disabled={busy}
                    style={{ padding: "8px 16px", background: C.primary, color: "#fff",
                      border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                      cursor: busy ? "default" : "pointer" }}>
                    {busy ? "…" : "Add"}
                  </button>
                  <button onClick={() => setTopupTarget(null)}
                    style={{ padding: "8px 12px", background: C.panel,
                      border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "users" && (
        <div>
          {users.map((u) => (
            <div key={u.phone} style={{ background: C.card, borderRadius: 12, padding: "11px 14px",
              marginBottom: 8, boxShadow: "0 1px 6px rgba(0,0,0,.06)",
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontFamily: MONO, fontSize: 14 }}>{u.phone}</div>
                {u.kitchen_id && (
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                    Kitchen: {u.kitchen_id}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700,
                color: u.role === "kitchen" ? C.primary : u.role === "admin" ? "#7B5EA7" : C.sub }}>
                {u.role}
              </div>
            </div>
          ))}
        </div>
      )}

      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 8 }}>{err}</div>}

      {showCreate && (
        <AdminCreateKitchenModal
          onDone={() => { setShowCreate(false); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function AdminCreateKitchenModal({ onDone, onClose }) {
  const [name,    setName]    = useState("");
  const [tag,     setTag]     = useState("");
  const [phone,   setPhone]   = useState("");
  const [credits, setCredits] = useState("100");
  const [busy,    setBusy]    = useState(false);
  const [err,     setErr]     = useState("");

  const submit = async () => {
    if (!name.trim()) return setErr("Restaurant name is required");
    setBusy(true); setErr("");
    try {
      await api.adminCreateKitchen({
        name: name.trim(), tag: tag.trim(),
        credit_balance: parseInt(credits) || 0,
        owner_phone: phone.trim(),
      });
      onDone();
    }
    catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title="Add restaurant" onClose={onClose}>
      <label style={lbl}>Restaurant name *</label>
      <input value={name} onChange={(e) => setName(e.target.value)}
        style={{ ...inp, marginBottom: 12 }} placeholder="e.g. Spice Garden" />
      <label style={lbl}>Cuisine / tagline</label>
      <input value={tag} onChange={(e) => setTag(e.target.value)}
        style={{ ...inp, marginBottom: 12 }} placeholder="e.g. North Indian, Thalis" />
      <label style={lbl}>Owner phone (10 digits) — they can log in immediately</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${C.line}`,
        borderRadius: 10, padding: "10px 12px", marginBottom: 12 }}>
        <span style={{ color: C.sub, fontFamily: MONO, fontSize: 13 }}>+91</span>
        <input value={phone} inputMode="numeric" placeholder="9876543210"
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          style={{ border: "none", outline: "none", fontSize: 14, flex: 1, fontFamily: MONO }} />
      </div>
      <label style={lbl}>Starting credits (₹)</label>
      <input value={credits} inputMode="numeric"
        onChange={(e) => setCredits(e.target.value.replace(/\D/g, ""))}
        style={{ ...inp, marginBottom: 16 }} />
      <div style={{ fontSize: 12, color: C.sub, background: C.panel, borderRadius: 8,
        padding: "8px 12px", marginBottom: 16, lineHeight: 1.6 }}>
        The owner will log in with OTP on their phone and immediately see their kitchen dashboard.
        No separate onboarding needed.
      </div>
      {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
      <button onClick={submit} disabled={busy}
        style={{ width: "100%", padding: "13px", background: busy ? C.sub : C.primary, color: "#fff",
          border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: busy ? "default" : "pointer" }}>
        {busy ? "Creating…" : "Create restaurant"}
      </button>
    </Modal>
  );
}

/* ── login ── */
function Login({ brand, onLogin }) {
  const [tab,    setTab]    = useState("otp");    // "otp" | "password"
  const [phone,  setPhone]  = useState("");
  const [code,   setCode]   = useState("");
  const [pw,     setPw]     = useState("");
  const [showPw, setShowPw] = useState(false);
  const [step,   setStep]   = useState(1);
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  const switchTab = (t) => { setTab(t); setErr(""); setStep(1); setCode(""); };

  const send = async () => {
    if (phone.length < 10) return setErr("Enter a 10-digit number");
    setBusy(true); setErr("");
    try {
      const r = await api.requestOtp(phone);
      if (r.dev_otp) {
        // No real SMS configured yet — log straight in with the known code, no typing needed.
        const v = await api.verifyOtp(phone, r.dev_otp);
        setSession(v.token, v.role, v.kitchen_id);
        setPhone(phone);
        onLogin(v.role, v.kitchen_id);
        return;
      }
      setStep(2);
    }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true); setErr("");
    try {
      const r = await api.verifyOtp(phone, code);
      setSession(r.token, r.role, r.kitchen_id);
      setPhone(phone);
      onLogin(r.role, r.kitchen_id);
    }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const loginWithPassword = async () => {
    if (phone.length < 10) return setErr("Enter a 10-digit number");
    if (!pw) return setErr("Enter your password");
    setBusy(true); setErr("");
    try {
      const r = await api.passwordLogin(phone, pw);
      setSession(r.token, r.role, r.kitchen_id);
      setPhone(phone);
      onLogin(r.role, r.kitchen_id);
    }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const PhoneInput = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${C.line}`,
      borderRadius: 12, padding: "12px 14px", marginTop: 8, background: C.card }}>
      <span style={{ color: C.sub, fontFamily: MONO }}>+91</span>
      <input value={phone} inputMode="numeric" placeholder="9876543210"
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        style={{ border: "none", outline: "none", fontSize: 16, flex: 1, fontFamily: MONO,
          background: "transparent" }} />
    </div>
  );

  const g = brand?.grad;
  return (
    <div style={{ padding: 0 }}>
      {brand ? (
        <div style={{ background: g ? `linear-gradient(135deg,${g[0]},${g[1]})` : C.primary,
          padding: "40px 28px 28px", color: "#fff" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, letterSpacing: "-.02em" }}>{brand.kitchen_name}</div>
          {brand.kitchen_tag && (
            <div style={{ fontSize: 13, opacity: .85, marginTop: 3 }}>{brand.kitchen_tag}</div>
          )}
          {brand.table_label && (
            <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 5,
              background: "rgba(255,255,255,.2)", borderRadius: 99, padding: "4px 12px",
              fontSize: 12.5, fontWeight: 700 }}>
              🍽 {brand.table_label} · Log in to order
            </div>
          )}
          {!brand.table_label && (
            <div style={{ marginTop: 8, fontSize: 13, opacity: .8 }}>Log in to place your order</div>
          )}
          <div style={{ fontSize: 10, opacity: .5, marginTop: 14, letterSpacing: ".3px" }}>
            powered by skip·wait
          </div>
        </div>
      ) : (
        <div style={{ padding: "52px 28px 0" }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 34, letterSpacing: "-0.02em", color: C.text }}>
            skip<span style={{ color: C.primary }}>·</span>wait
          </div>
          <div style={{ color: C.sub, marginTop: 6, fontSize: 14.5, lineHeight: 1.5 }}>
            Order ahead · skip the line · no platform fee
          </div>
        </div>
      )}

      {/* tab switcher */}
      <div style={{ display: "flex", margin: "24px 28px 0", background: C.panel,
        borderRadius: 999, padding: 4, gap: 4 }}>
        {[["otp", "OTP"], ["password", "Password"]].map(([t, label]) => (
          <button key={t} onClick={() => switchTab(t)}
            style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 999, padding: "8px 0",
              fontWeight: 700, fontSize: 13, transition: "all .2s",
              background: tab === t ? C.card : "transparent",
              color: tab === t ? C.text : C.sub,
              boxShadow: tab === t ? "0 2px 8px rgba(43,30,22,.1)" : "none" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 28px 40px" }}>
        {tab === "otp" ? (
          step === 1 ? (
            <>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Mobile number</label>
              {PhoneInput}
              <Btn onClick={send} busy={busy} label="Send OTP" />
            </>
          ) : (
            <>
              <label style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>
                Code sent to +91 {phone}
              </label>
              <input value={code} inputMode="numeric" placeholder="• • • •"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                style={{ width: "100%", marginTop: 12, padding: "13px", borderRadius: 12, fontFamily: MONO,
                  fontSize: 22, letterSpacing: "10px", textAlign: "center", border: `1.5px solid ${C.line}`,
                  outline: "none", boxSizing: "border-box", background: C.card }} />
              <Btn onClick={verify} busy={busy} label="Verify & continue" />
              <button onClick={() => { setStep(1); setCode(""); }}
                style={{ background: "none", border: "none", color: C.sub, marginTop: 14,
                  cursor: "pointer", fontSize: 13 }}>← Change number</button>
            </>
          )
        ) : (
          <>
            <label style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Mobile number</label>
            {PhoneInput}
            <label style={{ fontSize: 13, fontWeight: 700, color: C.sub, display: "block", marginTop: 14 }}>
              Password
            </label>
            <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.line}`,
              borderRadius: 12, padding: "12px 14px", marginTop: 8, background: C.card }}>
              <input value={pw} type={showPw ? "text" : "password"} placeholder="••••••••"
                onKeyDown={(e) => e.key === "Enter" && loginWithPassword()}
                onChange={(e) => setPw(e.target.value)}
                style={{ border: "none", outline: "none", fontSize: 15, flex: 1, background: "transparent" }} />
              <button onClick={() => setShowPw(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: C.sub, fontSize: 12, padding: "0 4px" }}>
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
            <Btn onClick={loginWithPassword} busy={busy} label="Sign in" />
            <div style={{ marginTop: 12, fontSize: 12, color: C.sub, textAlign: "center" }}>
              Don't have a password?{" "}
              <button onClick={() => switchTab("otp")}
                style={{ background: "none", border: "none", color: C.primary, cursor: "pointer",
                  fontWeight: 700, fontSize: 12, padding: 0 }}>
                Use OTP instead
              </button>
            </div>
          </>
        )}
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12, fontWeight: 600 }}>{err}</div>}
        <div style={{ marginTop: 20, textAlign: "center", fontSize: 12, color: C.sub }}>
          By continuing you agree to our{" "}
          <a href="/privacy" style={{ color: C.primary, textDecoration: "none", fontWeight: 600 }}>
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
const Btn = ({ onClick, busy, label }) => (
  <button onClick={onClick} disabled={busy}
    style={{ width: "100%", marginTop: 20, background: busy ? C.sub : C.primary, color: "#fff",
      border: "none", borderRadius: 999, padding: "15px", fontWeight: 800, fontSize: 15.5,
      cursor: busy ? "default" : "pointer",
      boxShadow: busy ? "none" : "0 12px 28px -10px rgba(176,53,38,.55)" }}>
    {busy ? "…" : label}
  </button>
);

/* ── customer view ── */
const CART_KEY = "sw_cart_v1";
function loadSavedCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "null"); } catch { return null; }
}

function CustomerView({ brand, tableToken, reorderIntent, clearReorder, onRegister }) {
  // derive tableInfo shape from brand (only when it has table_id) — disabled while dine-in is "coming soon"
  const tableInfo = DINE_IN_ENABLED && brand?.table_id ? brand : null;
  const brandKid  = brand?.kitchen_id || null;   // set for both table QR and /k/ link

  const saved = loadSavedCart();
  const [stage,         setStage]         = useState(
    brandKid ? "menu" : (saved?.kitchenId && Object.keys(saved.cart || {}).length ? "menu" : "home")
  );
  const [activeKitchen, setActiveKitchen] = useState(
    brandKid || saved?.kitchenId || null
  );
  const [cart,          setCart]          = useState(saved?.cart || {});
  const [menuCache,     setMenuCache]     = useState({});
  const [mode,          setMode]          = useState(tableInfo ? "dine_in" : "pickup");
  const [arrival,       setArrival]       = useState(20);
  const [orderId,       setOrderId]       = useState(null);
  const [kitchensList,  setKitchensList]  = useState([]);

  // persist cart to localStorage whenever it changes
  useEffect(() => {
    if (activeKitchen && Object.keys(cart).some((k) => cart[k] > 0)) {
      localStorage.setItem(CART_KEY, JSON.stringify({ kitchenId: activeKitchen, cart }));
    } else {
      localStorage.removeItem(CART_KEY);
    }
  }, [cart, activeKitchen]);

  useEffect(() => { api.kitchens().then(setKitchensList).catch(() => {}); }, []);

  // if brand resolved after mount (QR or /k/ link), lock to that kitchen
  useEffect(() => {
    if (brandKid && stage === "home") {
      setActiveKitchen(brandKid);
      setMode(tableInfo ? "dine_in" : "pickup");
      setStage("menu");
    }
  }, [brand]);

  // handle reorder intent from history
  useEffect(() => {
    if (!reorderIntent) return;
    const { kitchenId, items } = reorderIntent;
    api.menu(kitchenId).then((menuItems) => {
      const newCart = {};
      items.forEach(({ id, name, qty }) => {
        const found = id
          ? menuItems.find((m) => m.id === id && m.available)
          : menuItems.find((m) => m.name === name && m.available);
        if (found) newCart[found.id] = (newCart[found.id] || 0) + qty;
      });
      setMenuCache((m) => ({ ...m, [kitchenId]: menuItems }));
      setActiveKitchen(kitchenId);
      setCart(newCart);
      setStage(Object.keys(newCart).length ? "cart" : "menu");
    }).finally(() => clearReorder && clearReorder());
  }, [reorderIntent]);

  const flatItems = Object.values(menuCache).flat().flatMap((item) =>
    item.variants && item.variants.length > 0
      ? item.variants.map((v) => ({ ...item, id: `${item.id}__${v.id}`, name: `${item.name} — ${v.name}`, price: v.price }))
      : [item]
  );
  const lines = Object.entries(cart).filter(([, q]) => q > 0)
    .map(([id, q]) => ({ ...flatItems.find((i) => i.id === id), qty: q }))
    .filter((l) => l.id);
  const foodTotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const sub = (id) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) - 1) }));
  const reset = () => {
    setCart({}); setOrderId(null);
    localStorage.removeItem(CART_KEY);
    if (brandKid) { setStage("menu"); } else { setActiveKitchen(null); setStage("home"); }
  };

  return (
    <>
      {stage === "home" && (
        <Home onPick={(id) => { setActiveKitchen(id); setMode("pickup"); setStage("menu"); }}
          onRegister={onRegister} />
      )}
      {stage === "menu" && (
        <Menu kid={activeKitchen} cart={cart} add={add} sub={sub}
          cacheMenu={(kid, items) => setMenuCache((m) => ({ ...m, [kid]: items }))}
          count={lines.reduce((s, l) => s + l.qty, 0)} foodTotal={foodTotal}
          back={brandKid ? null : () => setStage("home")}
          next={() => setStage("cart")} />
      )}
      {stage === "cart" && (
        <Cart kid={activeKitchen} lines={lines} foodTotal={foodTotal}
          mode={mode} setMode={tableInfo ? null : setMode}
          arrival={arrival} setArrival={setArrival}
          tableInfo={tableInfo}
          back={() => setStage("menu")}
          onPlaced={(oid) => { setOrderId(oid); setStage("track"); }} />
      )}
      {stage === "track" && orderId && (
        <Track orderId={orderId} reset={reset} tableInfo={tableInfo}
          kitchenName={brand?.kitchen_name || kitchensList.find((k) => k.id === activeKitchen)?.name || ""} />
      )}
    </>
  );
}

/* ── home ── */
function Home({ onPick, onRegister }) {
  const [kitchens,  setKitchens]  = useState(null);
  const [query,     setQuery]     = useState("");
  const [activeCuisine, setActiveCuisine] = useState(null);
  const [sort,      setSort]      = useState("default"); // default | rating | eta
  const [userCoords, setUserCoords] = useState(null);
  const [err,       setErr]       = useState("");

  useEffect(() => {
    api.kitchens().then(setKitchens).catch((e) => setErr(e.message));
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }, []);

  // extract unique cuisine tags from comma-separated tag strings
  const cuisines = kitchens
    ? [...new Set(kitchens.flatMap((k) => k.tag.split(",").map((t) => t.trim())).filter(Boolean))]
    : [];

  const q = query.trim().toLowerCase();
  let visible = kitchens
    ? kitchens.filter((k) => {
        const matchQ = !q || k.name.toLowerCase().includes(q) || k.tag.toLowerCase().includes(q);
        const matchC = !activeCuisine || k.tag.toLowerCase().includes(activeCuisine.toLowerCase());
        return matchQ && matchC;
      })
    : null;

  if (visible) {
    if (sort === "rating") visible = [...visible].sort((a, b) => b.rating - a.rating);
    else if (sort === "eta") visible = [...visible].sort((a, b) => a.eta - b.eta);
  }

  return (
    <div>
      <div style={{ padding: "14px 16px 10px", background: C.primary, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 800, fontSize: 16 }}>
            <MapPin size={16} fill="#fff" stroke={C.primary} />
            {userCoords ? "Near you" : "Malviya Nagar, Jaipur"}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["default","All"],["rating","★ Top"],["eta","⚡ Fast"]].map(([s, label]) => (
              <button key={s} onClick={() => setSort(s)}
                style={{ border: "none", cursor: "pointer", borderRadius: 999, padding: "4px 10px",
                  fontSize: 11.5, fontWeight: 700,
                  background: sort === s ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.1)",
                  color: "#fff" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card,
          borderRadius: 10, padding: "8px 12px", marginTop: 12 }}>
          <Search size={16} style={{ color: C.sub, flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search kitchens & cuisines"
            style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1,
              color: C.text, background: "transparent" }}
          />
          {query && (
            <button onClick={() => setQuery("")}
              style={{ border: "none", background: "none", cursor: "pointer",
                color: C.sub, padding: 0, display: "flex" }}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {cuisines.length > 0 && (
        <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto",
          borderBottom: `1px solid ${C.line}`, scrollbarWidth: "none" }}>
          <button onClick={() => setActiveCuisine(null)}
            style={{ flexShrink: 0, border: "none", cursor: "pointer", borderRadius: 999,
              padding: "6px 14px", fontSize: 12.5, fontWeight: 700, transition: "all .2s",
              background: !activeCuisine ? C.text : C.panel,
              color: !activeCuisine ? C.card : C.sub }}>
            All
          </button>
          {cuisines.map((c) => (
            <button key={c} onClick={() => setActiveCuisine(activeCuisine === c ? null : c)}
              style={{ flexShrink: 0, border: "none", cursor: "pointer", borderRadius: 999,
                padding: "6px 14px", fontSize: 12.5, fontWeight: 700, transition: "all .2s",
                background: activeCuisine === c ? C.primary : C.panel,
                color: activeCuisine === c ? "#fff" : C.sub }}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, padding: "10px 16px", background: C.primarySoft,
        alignItems: "center", borderBottom: `1px solid ${C.primaryBorder}` }}>
        <Timer size={18} style={{ color: C.primary }} />
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>
          Order ahead · skip the line · <span style={{ color: C.primary, fontWeight: 700 }}>no ₹17.58 platform fee</span>
        </div>
      </div>

      {err && <Note>{err} — is the backend running?</Note>}
      {!kitchens && !err && <Note>Loading kitchens…</Note>}

      {visible && visible.length === 0 && (q || activeCuisine) && (
        <Note>No kitchens match{activeCuisine ? ` "${activeCuisine}"` : ""}{q ? ` "${query}"` : ""}</Note>
      )}

      {visible && visible.length === 0 && !q && !activeCuisine && kitchens && (
        <div style={{ padding: "32px 20px", textAlign: "center", color: C.sub, fontSize: 13.5 }}>
          No kitchens open yet in your area.
        </div>
      )}

      {visible && visible.map((k) => (
        <button key={k.id} onClick={() => onPick(k.id)}
          style={{ width: "100%", textAlign: "left", cursor: "pointer", background: C.card,
            border: "none", display: "flex", gap: 12, padding: "14px 16px",
            borderBottom: `1px solid ${C.line}`, alignItems: "center",
            opacity: k.is_open === false ? 0.55 : 1 }}>
          <div style={{ width: 74, height: 74, borderRadius: 18, flexShrink: 0,
            background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`, display: "flex",
            alignItems: "flex-end", padding: 7, boxShadow: "0 4px 12px rgba(43,30,22,.18)" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>{k.dist}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, letterSpacing: "-.01em" }}>{k.name}</span>
              {k.is_open === false && (
                <span style={{ fontSize: 10, fontWeight: 700, background: C.panel, color: C.sub,
                  borderRadius: 5, padding: "2px 6px", letterSpacing: ".5px" }}>CLOSED</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, margin: "4px 0" }}>
              <RatingPill r={k.rating} />
              <span style={{ fontSize: 12.5, color: C.sub }}>•</span>
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12.5,
                color: C.sub, fontWeight: 600 }}><Clock size={12} /> {k.eta} min</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.sub }}>{k.tag}</div>
          </div>
          <ChevronRight size={18} style={{ color: C.line }} />
        </button>
      ))}

      {/* restaurant registration CTA */}
      {onRegister && (
        <button onClick={onRegister}
          style={{ width: "100%", padding: "16px", background: "none", border: "none",
            borderTop: `1px solid ${C.line}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <UtensilsCrossed size={15} style={{ color: C.sub }} />
          <span style={{ fontSize: 13, color: C.sub, fontWeight: 600 }}>
            Own a restaurant? <span style={{ color: C.primary, fontWeight: 800 }}>Register it free →</span>
          </span>
        </button>
      )}
    </div>
  );
}

/* ── menu (customer read-only) ── */
function Menu({ kid, cart, add, sub, count, foodTotal, back, next, cacheMenu }) {
  const [items,        setItems]        = useState(null);
  const [cats,         setCats]         = useState([]);
  const [k,            setK]            = useState(null);
  const [menuQuery,    setMenuQuery]    = useState("");
  const [vegOnly,      setVegOnly]      = useState(false);
  const [variantItem,  setVariantItem]  = useState(null);
  const [todayHours,   setTodayHours]  = useState(null); // {open, close, closed} | null

  useEffect(() => {
    api.kitchens().then((ks) => setK(ks.find((x) => x.id === kid)));
    api.menu(kid).then((it) => { setItems(it); cacheMenu(kid, it); });
    api.categories(kid).then(setCats);
    api.getHours(kid).then((rows) => {
      const dow = (new Date().getDay() + 6) % 7; // JS Sun=0 → Mon=0
      const row = rows.find((r) => r.day === dow);
      if (row) setTodayHours(row);
    }).catch(() => {});
  }, [kid]);

  if (!items || !k) return <Note>Loading menu…</Note>;

  const mq = menuQuery.trim().toLowerCase();
  const matchItem = (i) => i.available
    && (!vegOnly || i.veg)
    && (!mq || i.name.toLowerCase().includes(mq) || (i.descr || "").toLowerCase().includes(mq));
  // group by category (apply search + veg filter)
  const grouped = [];
  const used    = new Set();
  cats.forEach((c) => {
    const catItems = items.filter((i) => i.category_id === c.id && matchItem(i));
    if (catItems.length) { grouped.push({ cat: c, items: catItems }); catItems.forEach((i) => used.add(i.id)); }
  });
  const uncatItems = items.filter((i) => !used.has(i.id) && matchItem(i));
  if (uncatItems.length) grouped.push({ cat: null, items: uncatItems });

  return (
    <div>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
        {back && (
          <button onClick={back} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
            background: "none", border: "none", color: C.sub, fontSize: 13.5, padding: 0, marginBottom: 8 }}>
            <ChevronLeft size={16} /> Back
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, letterSpacing: "-.02em" }}>{k.name}</div>
          {k.is_open === false && (
            <span style={{ fontSize: 10, fontWeight: 700, background: C.panel, color: C.sub,
              borderRadius: 5, padding: "2px 7px", letterSpacing: ".5px" }}>CLOSED</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <RatingPill r={k.rating} />
          <span style={{ fontSize: 12.5, color: C.sub, fontWeight: 600 }}>
            {k.eta} min • {k.dist} • {k.tag}</span>
        </div>
        {todayHours && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6,
            fontSize: 12.5, fontWeight: 600,
            color: todayHours.closed ? C.red : "#267E3E" }}>
            <Clock size={12} />
            {todayHours.closed
              ? "Closed today"
              : `Open today ${todayHours.open} – ${todayHours.close}`}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.panel,
            borderRadius: 10, padding: "8px 12px", flex: 1 }}>
            <Search size={14} style={{ color: C.sub, flexShrink: 0 }} />
            <input value={menuQuery} onChange={(e) => setMenuQuery(e.target.value)}
              placeholder="Search menu…"
              style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1,
                color: C.text, background: "transparent" }} />
            {menuQuery && (
              <button onClick={() => setMenuQuery("")}
                style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, padding: 0, display: "flex" }}>
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setVegOnly((v) => !v)}
            style={{ flexShrink: 0, border: `1.5px solid ${vegOnly ? C.veg : C.line}`,
              background: vegOnly ? "rgba(62,124,79,.12)" : C.card, borderRadius: 10, padding: "7px 11px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
              fontWeight: 700, fontSize: 12.5, color: vegOnly ? C.veg : C.sub }}>
            <VegMark veg={true} /> Veg
          </button>
        </div>
      </div>
      {k.is_open === false && (
        <div style={{ margin: "12px 16px", padding: "10px 14px", background: C.panel,
          borderRadius: 12, fontSize: 13, color: C.sub, fontWeight: 600,
          border: `1px solid ${C.line}` }}>
          This kitchen is currently closed. You can browse the menu but ordering is unavailable.
        </div>
      )}

      {mq && grouped.length === 0 && (
        <Note>No items match "{menuQuery}"</Note>
      )}

      {grouped.map(({ cat, items: gitems }) => (
        <div key={cat?.id || "uncat"}>
          {cat && (
            <div style={{ padding: "10px 16px 4px", fontSize: 12.5, fontWeight: 800,
              color: C.sub, textTransform: "uppercase", letterSpacing: ".5px",
              borderBottom: `1px solid ${C.line}` }}>
              {cat.name}
            </div>
          )}
          {gitems.map((it) => {
            const q = cart[it.id] || 0;
            return (
              <React.Fragment key={it.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12,
                padding: "14px 16px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ flex: 1 }}>
                  <VegMark veg={it.veg} />
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{it.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 14, marginTop: 3 }}>₹{it.price}</div>
                  <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5, lineHeight: 1.4 }}>{it.descr}</div>
                </div>
                <div style={{ width: 96, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name}
                      style={{ width: 96, height: 76, borderRadius: 12, objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: 96, height: 76, borderRadius: 12,
                      background: `linear-gradient(135deg,${k.grad[0]},${k.grad[1]})`, opacity: .85 }} />
                  )}
                  {k.is_open === false ? null : it.variants && it.variants.length > 0 ? (
                    <div style={{ marginTop: -14 }}>
                      <button onClick={() => setVariantItem(variantItem?.id === it.id ? null : it)}
                        style={{ cursor: "pointer", background: C.card, color: C.veg,
                          border: `1px solid ${C.line}`, borderRadius: 9, padding: "7px 14px",
                          fontWeight: 800, fontSize: 12.5, boxShadow: "0 3px 8px rgba(43,30,22,.08)",
                          display: "flex", alignItems: "center", gap: 4 }}>
                        {it.variants.some((v) => cart[`${it.id}__${v.id}`] > 0) ? (
                          <><Check size={12} /> {it.variants.reduce((s,v) => s + (cart[`${it.id}__${v.id}`]||0), 0)} added</>
                        ) : (<>ADD <ChevronRight size={12} /></>)}
                      </button>
                    </div>
                  ) : q === 0 ? (
                    <button onClick={() => add(it.id)} style={{ marginTop: -14, cursor: "pointer",
                      background: C.card, color: C.veg, border: `1px solid ${C.line}`, borderRadius: 9,
                      padding: "7px 22px", fontWeight: 800, fontSize: 13.5,
                      boxShadow: "0 3px 8px rgba(43,30,22,.08)" }}>ADD</button>
                  ) : (
                    <div style={{ marginTop: -14, display: "flex", alignItems: "center", gap: 14,
                      background: C.card, color: C.veg, border: `1px solid ${C.line}`, borderRadius: 9,
                      padding: "7px 12px", boxShadow: "0 3px 8px rgba(43,30,22,.08)" }}>
                      <button onClick={() => sub(it.id)} style={{ background: "none", border: "none",
                        cursor: "pointer", padding: 0, color: C.veg, display: "flex" }}><Minus size={14} /></button>
                      <span style={{ fontWeight: 800, fontSize: 14, fontFamily: MONO }}>{q}</span>
                      <button onClick={() => add(it.id)} style={{ background: "none", border: "none",
                        cursor: "pointer", padding: 0, color: C.veg, display: "flex" }}><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
              {variantItem?.id === it.id && (
                <div style={{ background: C.panel, padding: "12px 16px",
                  borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 8 }}>
                    Choose size / variant
                  </div>
                  {it.variants.map((v) => {
                    const vkey = `${it.id}__${v.id}`;
                    const vq = cart[vkey] || 0;
                    return (
                      <div key={v.id} style={{ display: "flex", alignItems: "center",
                        justifyContent: "space-between", padding: "8px 0",
                        borderBottom: `1px solid ${C.line}` }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                          <span style={{ fontFamily: MONO, fontSize: 13, color: C.sub, marginLeft: 8 }}>₹{v.price}</span>
                        </div>
                        {vq === 0 ? (
                          <button onClick={() => add(vkey)} style={{ border: `1px solid ${C.line}`,
                            background: C.card, color: C.veg, borderRadius: 8,
                            padding: "5px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>ADD</button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 12,
                            border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "5px 10px" }}>
                            <button onClick={() => sub(vkey)} style={{ background: "none", border: "none",
                              cursor: "pointer", padding: 0, color: C.veg, display: "flex" }}><Minus size={13} /></button>
                            <span style={{ fontWeight: 800, fontFamily: MONO }}>{vq}</span>
                            <button onClick={() => add(vkey)} style={{ background: "none", border: "none",
                              cursor: "pointer", padding: 0, color: C.veg, display: "flex" }}><Plus size={13} /></button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </React.Fragment>
            );
          })}
        </div>
      ))}

      {count > 0 && (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 16px 18px",
          background: `linear-gradient(to top, ${C.bg} 65%, rgba(251,244,234,0))` }}>
          <button onClick={next} style={{ width: "100%", cursor: "pointer", border: "none",
            background: C.text, color: C.card, borderRadius: 999, padding: "14px 20px", display: "flex",
            alignItems: "center", justifyContent: "space-between", fontWeight: 800, fontSize: 14.5,
            boxShadow: "0 12px 28px -10px rgba(43,30,22,.5)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: C.primary, borderRadius: 8, fontSize: 12, fontWeight: 700,
                padding: "3px 8px" }}>{count}</span>
              View order
            </span>
            <span style={{ fontWeight: 800 }}>₹{foodTotal}</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── cart ── */
function Cart({ kid, lines, foodTotal, mode, setMode, arrival, setArrival, tableInfo, back, onPlaced }) {
  const [busy,        setBusy]       = useState(false);
  const [err,         setErr]        = useState("");
  const [address,     setAddress]    = useState("");
  const [savedAddrs,  setSavedAddrs] = useState([]);
  const [saveLabel,   setSaveLabel]  = useState("");
  const [showSave,    setShowSave]   = useState(false);
  const [promoInput,   setPromoInput]   = useState("");
  const [promoApplied, setPromoApplied] = useState(null);
  const [promoErr,     setPromoErr]     = useState("");
  const [addrSuggestions, setAddrSuggestions] = useState([]);
  const [addrType,    setAddrType]    = useState("Home");
  const [pincode,     setPincode]     = useState("");
  const [locating,    setLocating]    = useState(false);
  const [locErr,      setLocErr]      = useState("");
  const addrTimer = React.useRef(null);

  useEffect(() => {
    if (mode === "deliver") {
      api.listAddresses().then(setSavedAddrs).catch(() => {});
    }
  }, [mode]);

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocErr("Location not supported on this device"); return; }
    setLocating(true); setLocErr("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude: lat, longitude: lon } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "en", "User-Agent": "SkipWait/1.0" } }
          );
          const data = await res.json();
          setAddress(data.display_name || "");
          const pc = data.address?.postcode || "";
          if (pc) setPincode(pc);
        } catch {
          setLocErr("Couldn't detect your address, please enter it manually");
        } finally {
          setLocating(false);
        }
      },
      () => { setLocErr("Location permission denied — enter address manually"); setLocating(false); }
    );
  };
  const b      = bill(foodTotal, mode);
  const saving = Math.round(17.58 + (mode === "deliver" ? 49 : 0) + foodTotal * 0.12 - 5);

  const place = async () => {
    if (mode === "deliver" && !address.trim()) {
      setErr("Please enter a delivery address"); return;
    }
    if (mode === "deliver" && !pincode.trim()) {
      setErr("Please enter a pincode"); return;
    }
    setBusy(true); setErr("");
    try {
      const fullAddress = mode === "deliver"
        ? `${address.trim()}${pincode.trim() ? " — " + pincode.trim() : ""} (${addrType})`
        : null;
      const o = await api.createOrder({
        kitchen_id: kid, mode, arrival,
        table_id: tableInfo?.table_id || null,
        delivery_address: fullAddress,
        promo_code: promoApplied?.code || null,
        items: lines.map((l) => {
          const parts = l.id.split("__");
          return parts.length === 2
            ? { id: parts[0], variant_id: parts[1], qty: l.qty }
            : { id: l.id, qty: l.qty };
        }),
      });
      onPlaced(o.id);
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      <div style={{ padding: "12px 16px", background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <button onClick={back} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          background: "none", border: "none", color: C.sub, fontSize: 13.5, padding: 0 }}>
          <ChevronLeft size={16} /> Menu</button>
      </div>

      <div style={{ background: C.card, margin: "10px 12px", borderRadius: 18, padding: 16,
        boxShadow: "0 4px 16px rgba(43,30,22,.06)", border: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, marginBottom: 12, letterSpacing: "-.01em" }}>How do you want it?</div>

        {/* Dine-in is locked when coming from a QR table scan */}
        {tableInfo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12,
            borderRadius: 12, border: `1.5px solid ${C.primary}`, background: C.primarySoft }}>
            <UtensilsCrossed size={18} style={{ color: C.primary }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>Dine-in · {tableInfo.table_label}</div>
              <div style={{ fontSize: 12, color: C.sub }}>Food served to your table</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", background: C.panel, borderRadius: 999, padding: 4, gap: 4 }}>
              {[
                ["pickup",  Timer,           "Pick Up",  true],
                ["deliver", Bike,            "Delivery", true],
                ["dine_in", UtensilsCrossed, "Dine-in",  DINE_IN_ENABLED],
              ].map(([m, Icon, t, enabled]) => (
                <button key={m} disabled={!enabled}
                  onClick={() => { if (!enabled) return; setMode(m); }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: "center", gap: 2, cursor: enabled ? "pointer" : "default",
                    borderRadius: 999, padding: "7px 6px", border: "none",
                    fontWeight: 700, fontSize: 13, transition: "all .25s",
                    background: mode === m ? C.primary : "transparent",
                    color: !enabled ? C.line : (mode === m ? "#fff" : C.sub),
                    opacity: enabled ? 1 : .55,
                    boxShadow: mode === m ? "0 3px 10px rgba(43,30,22,.18)" : "none" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon size={14} /> {t}
                  </span>
                  {!enabled && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".03em" }}>COMING SOON</span>}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.sub, justifyContent: "center" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.rating,
                display: "inline-block", flexShrink: 0 }} />
              {mode === "pickup"  && "You collect your order at the counter"}
              {mode === "deliver" && "Rider drops your order at the door · ₹38 fee"}
              {mode === "dine_in" && "Food is served to your table at the restaurant"}
            </div>
          </>
        )}

        {mode === "dine_in" && !tableInfo && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>
              When will you arrive? Your table will be booked and ready — staff will seat you.</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[10, 20, 30].map((m) => (
                <button key={m} onClick={() => setArrival(m)} style={{ flex: 1, cursor: "pointer",
                  borderRadius: 9, padding: "9px 0", fontWeight: 800, fontFamily: MONO, fontSize: 13.5,
                  border: `1.5px solid ${arrival === m ? C.primary : C.line}`,
                  background: arrival === m ? C.primarySoft : "#fff",
                  color: arrival === m ? C.primary : C.text }}>{m} min</button>
              ))}
            </div>
          </div>
        )}

        {mode === "pickup" && !tableInfo && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>
              Tell us when you're arriving — food will be hot.</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[10, 20, 30].map((m) => (
                <button key={m} onClick={() => setArrival(m)} style={{ flex: 1, cursor: "pointer",
                  borderRadius: 9, padding: "9px 0", fontWeight: 800, fontFamily: MONO, fontSize: 13.5,
                  border: `1.5px solid ${arrival === m ? C.primary : C.line}`,
                  background: arrival === m ? C.primarySoft : "#fff",
                  color: arrival === m ? C.primary : C.text }}>{m} min</button>
              ))}
            </div>
          </div>
        )}
        {mode === "deliver" && !tableInfo && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 12.5, fontWeight: 700, color: C.sub }}>
                Delivery address
              </label>
              <button onClick={detectLocation} disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none",
                  border: "none", color: C.primary, fontSize: 12.5, fontWeight: 700,
                  cursor: locating ? "default" : "pointer", padding: 0, opacity: locating ? .6 : 1 }}>
                <MapPin size={13} /> {locating ? "Detecting…" : "Use current location"}
              </button>
            </div>
            {locErr && (
              <div style={{ fontSize: 11.5, color: C.primary, marginTop: 4 }}>{locErr}</div>
            )}
            {savedAddrs.length > 0 && (
              <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                {savedAddrs.map((a) => (
                  <button key={a.id}
                    onClick={() => setAddress(a.address)}
                    style={{ border: `1.5px solid ${address === a.address ? C.primary : C.line}`,
                      background: address === a.address ? C.primarySoft : "#fff",
                      borderRadius: 99, padding: "5px 12px", fontSize: 12.5, fontWeight: 700,
                      cursor: "pointer", color: address === a.address ? C.primary : C.sub,
                      display: "flex", alignItems: "center", gap: 5 }}>
                    <MapPin size={11} /> {a.label}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {["Home", "Work", "Other"].map((t) => (
                <button key={t} onClick={() => setAddrType(t)}
                  style={{ flex: 1, cursor: "pointer", borderRadius: 9, padding: "7px 0",
                    fontWeight: 700, fontSize: 12.5,
                    border: `1.5px solid ${addrType === t ? C.primary : C.line}`,
                    background: addrType === t ? C.primarySoft : "#fff",
                    color: addrType === t ? C.primary : C.text }}>{t}</button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <textarea
                value={address}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddress(val); setShowSave(false);
                  clearTimeout(addrTimer.current);
                  if (val.trim().length < 4) { setAddrSuggestions([]); return; }
                  addrTimer.current = setTimeout(() => {
                    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&countrycodes=in`,
                      { headers: { "Accept-Language": "en", "User-Agent": "SkipWait/1.0" } })
                      .then((r) => r.json())
                      .then((res) => setAddrSuggestions(res.map((r) => r.display_name)))
                      .catch(() => {});
                  }, 500);
                }}
                placeholder="Flat / house no., street, area, landmark…"
                rows={3}
                style={{ width: "100%", marginTop: 8, padding: "10px 12px",
                  border: `1.5px solid ${address.trim() ? C.primary : C.line}`,
                  borderRadius: 10, fontSize: 13.5, outline: "none",
                  resize: "none", boxSizing: "border-box", fontFamily: SANS,
                  lineHeight: 1.5 }}
              />
              {addrSuggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                  background: C.card, border: `1px solid ${C.line}`, borderRadius: 10,
                  boxShadow: "0 4px 16px rgba(0,0,0,.12)", overflow: "hidden" }}>
                  {addrSuggestions.map((s, i) => (
                    <button key={i} onClick={() => { setAddress(s); setAddrSuggestions([]); }}
                      style={{ width: "100%", textAlign: "left", padding: "9px 12px", background: "none",
                        border: "none", cursor: "pointer", fontSize: 12.5, color: C.text,
                        borderBottom: i < addrSuggestions.length - 1 ? `1px solid ${C.line}` : "none",
                        display: "flex", alignItems: "flex-start", gap: 7 }}>
                      <MapPin size={12} style={{ color: C.sub, marginTop: 2, flexShrink: 0 }} />
                      <span style={{ lineHeight: 1.4 }}>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="Pincode"
              inputMode="numeric"
              style={{ width: "100%", marginTop: 8, padding: "10px 12px",
                border: `1.5px solid ${pincode.trim() ? C.primary : C.line}`,
                borderRadius: 10, fontSize: 13.5, outline: "none",
                boxSizing: "border-box", fontFamily: SANS }}
            />
            {address.trim() && !savedAddrs.some((a) => a.address === address) && (
              <div style={{ marginTop: 6 }}>
                {!showSave ? (
                  <button onClick={() => setShowSave(true)}
                    style={{ background: "none", border: "none", color: C.primary, fontSize: 12.5,
                      fontWeight: 700, cursor: "pointer", padding: 0 }}>
                    + Save this address
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <input value={saveLabel} onChange={(e) => setSaveLabel(e.target.value)}
                      placeholder="Label (e.g. Home, Office)"
                      style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: `1.5px solid ${C.line}`,
                        fontSize: 12.5, outline: "none" }} />
                    <button onClick={async () => {
                      if (!saveLabel.trim()) return;
                      const saved = await api.addAddress(saveLabel.trim(), address.trim());
                      setSavedAddrs((a) => [...a, saved]);
                      setSaveLabel(""); setShowSave(false);
                    }} style={{ background: C.primary, border: "none", color: "#fff",
                      borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5,
                      cursor: "pointer" }}>Save</button>
                  </div>
                )}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: C.sub, marginTop: 6, display: "flex", gap: 5 }}>
              <Bike size={13} style={{ color: C.primary, flexShrink: 0, marginTop: 1 }} />
              Rider via Porter/Rapido at actual cost — ₹{b.delivery}, no markup.
            </div>
          </div>
        )}
      </div>

      <div style={{ background: C.card, margin: "0 12px 10px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
        {lines.map((l) => (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between",
            alignItems: "center", padding: "6px 0" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
              <VegMark veg={l.veg} /> {l.qty} × {l.name}</span>
            <span style={{ fontFamily: MONO, fontSize: 13.5 }}>₹{l.price * l.qty}</span>
          </div>
        ))}
      </div>

      {/* promo code */}
      <div style={{ background: C.card, margin: "0 12px 10px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
          <Tag size={13} style={{ verticalAlign: "middle", marginRight: 5, color: C.rating }} />
          Promo code
        </div>
        {promoApplied ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(38,126,62,.1)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: C.rating }}>
              {promoApplied.code} — ₹{promoApplied.discount} off
            </span>
            <button onClick={() => { setPromoApplied(null); setPromoInput(""); }}
              style={{ border: "none", background: "none", cursor: "pointer", color: C.sub, display: "flex" }}>
              <X size={15} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input value={promoInput} onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoErr(""); }}
              placeholder="Enter code"
              style={{ flex: 1, padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.line}`,
                fontSize: 13.5, fontFamily: MONO, outline: "none", letterSpacing: 1 }} />
            <button onClick={async () => {
              if (!promoInput.trim()) return;
              setPromoErr("");
              try {
                const r = await api.validatePromo(promoInput.trim(), kid, foodTotal);
                setPromoApplied({ code: r.code, discount: r.discount });
                setPromoInput("");
              } catch (e) { setPromoErr(e.message); }
            }} style={{ background: C.primary, border: "none", color: "#fff", borderRadius: 9,
              padding: "10px 14px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}>
              Apply
            </button>
          </div>
        )}
        {promoErr && <div style={{ color: C.red, fontSize: 12.5, marginTop: 6, fontWeight: 600 }}>{promoErr}</div>}
      </div>

      <div style={{ background: C.card, margin: "0 12px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.sub, textTransform: "uppercase",
          letterSpacing: ".4px", marginBottom: 8 }}>Bill details</div>
        {[["Item total", foodTotal], ["Packaging", b.pack],
          ...(mode === "deliver" ? [["Delivery (at cost)", b.delivery]] : []), ["GST", b.gst]]
          .map(([k, v]) => (
          <Bar key={k}><span style={{ fontSize: 13.5, color: C.sub }}>{k}</span>
            <span style={{ fontFamily: MONO, fontSize: 13.5, color: C.sub }}>₹{v}</span></Bar>
        ))}
        <Bar>
          <span style={{ fontSize: 13.5, color: C.sub, display: "flex", alignItems: "center", gap: 6 }}>
            Skip Wait fee <span style={{ background: C.primarySoft, color: C.primary, fontSize: 10,
              fontWeight: 800, padding: "1px 6px", borderRadius: 99 }}>FLAT</span></span>
          <span style={{ fontFamily: MONO, fontSize: 13.5, color: C.primary, fontWeight: 700 }}>₹{b.skipFee}</span>
        </Bar>
        {promoApplied && (
          <Bar>
            <span style={{ fontSize: 13.5, color: C.rating, fontWeight: 700 }}>Promo ({promoApplied.code})</span>
            <span style={{ fontFamily: MONO, fontSize: 13.5, color: C.rating, fontWeight: 700 }}>
              {promoApplied.discount === "?" ? "Applied" : `−₹${promoApplied.discount}`}
            </span>
          </Bar>
        )}
        <div style={{ height: 1, background: C.line, margin: "9px 0" }} />
        <Bar><span style={{ fontWeight: 800, fontSize: 15 }}>To pay</span>
          <span style={{ fontWeight: 800, fontSize: 15, fontFamily: MONO }}>₹{b.total}</span></Bar>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 12px 0",
        background: "rgba(38,126,62,.1)", border: `1px solid rgba(38,126,62,.28)`, borderRadius: 12,
        padding: "10px 13px" }}>
        <ShieldCheck size={16} style={{ color: C.rating }} />
        <div style={{ fontSize: 12.5, color: C.rating }}>Saving ~<b>₹{saving}</b> vs Zomato/Swiggy.</div>
      </div>

      {err && <div style={{ color: C.red, fontSize: 13, margin: "10px 12px 0", fontWeight: 600 }}>{err}</div>}
      <div style={{ padding: 14 }}>
        <button onClick={place} disabled={busy} style={{ width: "100%", cursor: busy ? "default" : "pointer",
          border: "none", background: busy ? C.sub : C.primary, color: "#fff", borderRadius: 12,
          padding: "15px", fontWeight: 800, fontSize: 15.5 }}>
          {busy ? "Placing…" : `Place order · ₹${Math.max(0, b.total - (promoApplied?.discount || 0))}`}</button>
      </div>
    </div>
  );
}

/* ── track ── */
function StarRating({ orderId, initial, onChange }) {
  const [rated,   setRated]   = useState(initial || 0);
  const [hover,   setHover]   = useState(0);
  const [saved,   setSaved]   = useState(!!initial);
  const [busy,    setBusy]    = useState(false);

  const submit = async (star) => {
    if (saved) return;
    setBusy(true);
    try {
      await api.rateOrder(orderId, star);
      setRated(star); setSaved(true);
      if (onChange) onChange(star);
    } catch {} finally { setBusy(false); }
  };

  return (
    <div style={{ textAlign: "center", padding: "6px 0" }}>
      <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginBottom: 8 }}>
        {saved ? "Thanks for your rating!" : "Rate your experience"}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
        {[1,2,3,4,5].map((s) => (
          <button key={s}
            onClick={() => submit(s)}
            onMouseEnter={() => !saved && setHover(s)}
            onMouseLeave={() => setHover(0)}
            disabled={busy || saved}
            style={{ background: "none", border: "none", cursor: saved ? "default" : "pointer",
              padding: 2, opacity: busy ? .5 : 1 }}>
            <Star size={28}
              fill={(hover || rated) >= s ? "#F6B14E" : "none"}
              stroke={(hover || rated) >= s ? "#F6B14E" : C.line}
              strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PrepCountdown({ startedAt, minutes }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startMs = startedAt ? new Date(startedAt + (startedAt.endsWith("Z") ? "" : "Z")).getTime() : now;
  const totalMs = minutes * 60 * 1000;
  const elapsed = Math.max(0, now - startMs);
  const remainingMs = Math.max(0, totalMs - elapsed);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const overdue = remainingMs <= 0;

  return (
    <div style={{ margin: "0 12px 12px", borderRadius: 18, padding: 16,
      background: overdue ? "rgba(38,126,62,.08)" : C.primarySoft,
      border: `1px solid ${overdue ? "rgba(38,126,62,.25)" : C.primaryBorder}`,
      display: "flex", alignItems: "center", gap: 12 }}>
      <Clock size={18} style={{ color: overdue ? C.rating : C.primary, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: overdue ? C.rating : C.primary }}>
          {overdue ? "Your order should be ready any moment" : "Kitchen is preparing your order"}
        </div>
        {!overdue && (
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: C.primary, marginTop: 2 }}>
            {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
          </div>
        )}
      </div>
    </div>
  );
}

function Track({ orderId, reset, tableInfo, onBack, kitchenName }) {
  const [order,        setOrder]       = useState(null);
  const [cancelling,   setCancelling]  = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);
  const [showReceipt,  setShowReceipt] = useState(false);
  const [paymentQr,    setPaymentQr]   = useState(null);
  const prevIdx = React.useRef(null);

  const notifyStatusChange = (o) => {
    const label = o.flow?.[o.status_index];
    if (!label) return;
    setStatusBanner(label);
    setTimeout(() => setStatusBanner(null), 4000);
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Skip Wait — order update", { body: label, icon: "/favicon.ico" });
    }
  };

  const poll = useCallback(() => {
    api.getOrder(orderId).then((o) => {
      setOrder((prev) => {
        const prevStatus = prev?.status_index ?? null;
        if (prevStatus !== null && o.status_index !== prevStatus) notifyStatusChange(o);
        return o;
      });
    }).catch(() => {});
  }, [orderId]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    if (order?.kitchen_id) {
      api.getPaymentQr(order.kitchen_id).then((r) => setPaymentQr(r.payment_qr || null)).catch(() => {});
    }
  }, [order?.kitchen_id]);

  if (!order) return <Note>Loading order…</Note>;

  const doCancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try { await api.cancelOrder(orderId); poll(); }
    catch (e) { alert(e.message); }
    finally { setCancelling(false); }
  };

  const flow = order.flow, idx = order.status_index, done = order.done;
  const showRider = order.mode === "deliver" && idx >= 2;
  const eta = order.mode === "pickup"
    ? (done ? "Collected" : `Ready in ~${order.arrival} min`)
    : order.mode === "dine_in"
    ? (done ? "Completed" : "Kitchen is preparing your order")
    : (done ? "Delivered" : `Arriving in ~${12 + order.arrival} min`);

  if (order.cancelled) return (
    <div style={{ background: C.panel, minHeight: "100vh" }}>
      <div style={{ background: C.red, color: "#fff", padding: "18px 16px" }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, opacity: .75 }}>#{order.id}</span>
        <div style={{ fontWeight: 800, fontSize: 23, marginTop: 8 }}>Order Cancelled</div>
        <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>Skip fee refunded to kitchen's credit balance.</div>
      </div>
      <div style={{ padding: 16 }}>
        <button onClick={reset} style={{ width: "100%", border: "none", background: C.text,
          color: "#fff", borderRadius: 12, padding: 14, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
          Back to menu
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.panel, minHeight: "100vh" }}>
      {statusBanner && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          background: C.primary, color: "#fff", textAlign: "center",
          padding: "12px 16px", fontWeight: 700, fontSize: 14,
          boxShadow: "0 2px 10px rgba(0,0,0,.2)", animation: "none" }}>
          {statusBanner}
        </div>
      )}
      <div style={{ background: C.text, color: "#fff", padding: "18px 16px",
        marginTop: statusBanner ? 44 : 0, transition: "margin-top .2s" }}>
        <span style={{ fontFamily: MONO, fontSize: 12.5, opacity: .75 }}>#{order.id}</span>
        {order.mode === "dine_in" && order.table_label && (
          <div style={{ fontSize: 12, opacity: .6, marginTop: 2 }}>
            Dine-in · {order.table_label}
          </div>
        )}
        <div style={{ fontWeight: 800, fontSize: 23, marginTop: 8 }}>{order.status}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 13,
          opacity: .85 }}><Clock size={14} /> {eta}</div>
      </div>

      {order.mode !== "dine_in" && (
        <div style={{ background: C.card, margin: 12, borderRadius: 18, padding: 16,
          border: `1.5px dashed ${C.primaryBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <ShieldCheck size={22} style={{ color: C.primary }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>
                {order.mode === "pickup" ? "PICKUP CODE — show at counter" : "DELIVERY OTP — share with rider"}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {String(order.otp).split("").map((d, i) => (
                  <span key={i} style={{ width: 34, height: 40, borderRadius: 8, background: C.panel,
                    display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO,
                    fontWeight: 800, fontSize: 20 }}>{d}</span>
                ))}
              </div>
            </div>
          </div>
          {order.mode === "deliver" && order.delivery_address && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`,
              display: "flex", gap: 8, alignItems: "flex-start" }}>
              <MapPin size={14} style={{ color: C.sub, flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.5 }}>
                {order.delivery_address}
              </div>
            </div>
          )}
        </div>
      )}

      {!done && (
        paymentQr ? (
          <div style={{ background: C.card, margin: "0 12px 12px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, display: "flex",
              alignItems: "center", gap: 6 }}>
              <QrCode size={14} color={C.primary} /> Scan to pay
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <img src={paymentQr} alt="Payment QR"
                style={{ maxWidth: 180, maxHeight: 180, borderRadius: 8,
                  border: `1px solid ${C.line}` }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: C.sub, textAlign: "center" }}>
              UPI / PhonePe / GPay · ₹{order.total}
            </div>
          </div>
        ) : (
          <div style={{ background: C.card, margin: "0 12px 12px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, display: "flex",
              alignItems: "center", gap: 6 }}>
              <QrCode size={14} color={C.primary} /> Payment
            </div>
            <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
              Pay ₹{order.total} in cash {order.mode === "deliver" ? "to the rider on delivery" : order.mode === "pickup" ? "at the counter on pickup" : "at the restaurant"}. This kitchen hasn't set up UPI/QR payments yet.
            </div>
          </div>
        )
      )}

      {!done && idx === 0 && (
        <div style={{ margin: "0 12px 12px", borderRadius: 18, padding: 16,
          background: C.primarySoft, border: `1px solid ${C.primaryBorder}`,
          display: "flex", alignItems: "center", gap: 10 }}>
          <Clock size={18} style={{ color: C.primary, flexShrink: 0 }} />
          <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>
            Waiting for the restaurant to confirm your payment
          </div>
        </div>
      )}

      {!done && idx === 1 && order.payment_confirmed && order.prep_minutes && (
        <PrepCountdown startedAt={order.prep_started_at} minutes={order.prep_minutes} />
      )}

      {showRider && !done && (
        <div style={{ background: C.card, margin: "0 12px 12px", borderRadius: 18, padding: 16,
          border: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 99, background: C.primarySoft, display: "flex",
            alignItems: "center", justifyContent: "center" }}><Bike size={20} style={{ color: C.primary }} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14.5 }}>{order.rider?.name || "Rider assigned"} <RatingPill r={order.rider?.rating} /></div>
            <div style={{ fontSize: 12, color: C.sub, fontFamily: MONO }}>
              {order.rider?.veh || "Two-wheeler"} · {order.porter_order_id ? "Porter" : "Rider"}
            </div>
            {order.porter_tracking_url && (
              <a href={order.porter_tracking_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: "#0066CC", fontWeight: 700 }}>
                Track on Porter →
              </a>
            )}
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 99, background: C.veg, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={17} /></div>
        </div>
      )}

      <div style={{ background: C.card, margin: "0 12px 12px", borderRadius: 18, padding: "16px 16px 6px",
        border: `1px solid ${C.line}` }}>
        {flow.map((s, i) => {
          const reached = i <= idx, current = i === idx;
          return (
            <div key={s} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ width: 22, height: 22, borderRadius: 99, flexShrink: 0,
                  background: reached ? C.veg : "#fff", border: `2px solid ${reached ? C.veg : C.line}`,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {reached && <Check size={12} color="#fff" />}</div>
                {i < flow.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 26, background: i < idx ? C.veg : C.line }} />
                )}
              </div>
              <div style={{ paddingBottom: 18 }}>
                <div style={{ fontSize: 14, fontWeight: current ? 800 : 600,
                  color: reached ? C.text : C.sub }}>{s}</div>
                {current && <div style={{ fontSize: 12, color: C.primary, fontWeight: 700, marginTop: 2 }}>In progress</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: C.card, margin: "0 12px", borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
        {order.items.map((l, i) => (
          <Bar key={i} style={{ opacity: l.removed ? 0.4 : 1 }}>
            <span style={{ fontSize: 13.5, textDecoration: l.removed ? "line-through" : "none",
              color: l.removed ? C.sub : C.text }}>
              {l.qty} × {l.name}
              {l.removed && <span style={{ fontSize: 11, color: C.red, marginLeft: 6, fontWeight: 700 }}>
                unavailable</span>}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 13.5,
              color: l.removed ? C.sub : C.text }}>₹{l.price * l.qty}</span>
          </Bar>
        ))}
        <div style={{ height: 1, background: C.line, margin: "9px 0" }} />
        <Bar><span style={{ fontWeight: 800 }}>Paid</span>
          <span style={{ fontWeight: 800, fontFamily: MONO }}>₹{order.total}</span></Bar>
      </div>

      {!done ? (
        <div style={{ padding: 14 }}>
          <div style={{ textAlign: "center", fontSize: 12.5, color: C.sub, marginBottom: 12 }}>
            {order.mode === "dine_in"
              ? "Sit back — your food is being prepared."
              : "Ask the kitchen to advance this order from their device."}
          </div>
          <button onClick={() => {
            const url = `${window.location.origin}/order/${orderId}`;
            if (navigator.share) navigator.share({ title: `Order #${orderId}`, url });
            else { navigator.clipboard.writeText(url); alert("Link copied!"); }
          }} style={{ width: "100%", marginBottom: 8, border: `1px solid ${C.line}`, background: C.card,
            color: C.sub, borderRadius: 11, padding: 10, fontWeight: 700, fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Share order link
          </button>
          {order.status_index === 0 && (
            <button onClick={doCancel} disabled={cancelling}
              style={{ width: "100%", border: `1.5px solid ${C.red}`, background: C.card,
                color: C.red, borderRadius: 11, padding: 11, fontWeight: 700, fontSize: 13.5,
                cursor: cancelling ? "default" : "pointer" }}>
              {cancelling ? "Cancelling…" : "Cancel order"}
            </button>
          )}
        </div>
      ) : (
        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: C.card, borderRadius: 18, padding: "16px 14px", border: `1px solid ${C.line}` }}>
            <StarRating orderId={orderId} initial={order.order_rating}
              onChange={() => poll()} />
          </div>

          {/* receipt toggle */}
          <button onClick={() => setShowReceipt((s) => !s)}
            style={{ width: "100%", cursor: "pointer", border: `1.5px solid ${C.line}`,
              background: C.card, color: C.text, borderRadius: 12, padding: 12,
              fontWeight: 700, fontSize: 13.5, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 7 }}>
            <ShoppingBag size={15} />
            {showReceipt ? "Hide receipt" : "View receipt"}
          </button>

          {showReceipt && (
            <div style={{ background: C.card, borderRadius: 18, padding: "18px 16px", border: `1px solid ${C.line}`,
              fontFamily: MONO }}>
              {/* header */}
              <div style={{ textAlign: "center", borderBottom: `1px dashed ${C.line}`,
                paddingBottom: 14, marginBottom: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 17, fontFamily: "inherit" }}>
                  {kitchenName || "Skip Wait"}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4 }}>
                  Order #{order.id}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2, textTransform: "capitalize" }}>
                  {order.mode === "dine_in" ? "Dine-in" : order.mode === "deliver" ? "Delivery" : "Pickup"}
                  {order.mode === "dine_in" && order.table_label ? ` · ${order.table_label}` : ""}
                </div>
              </div>

              {/* items */}
              {order.items.map((l, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 13, marginBottom: 7 }}>
                  <span>{l.qty} × {l.name}</span>
                  <span>₹{l.price * l.qty}</span>
                </div>
              ))}

              {/* totals */}
              <div style={{ borderTop: `1px dashed ${C.line}`, marginTop: 10, paddingTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.sub, marginBottom: 5 }}>
                  <span>Food subtotal</span><span>₹{order.food_total}</span>
                </div>
                {order.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5,
                    color: "#267E3E", marginBottom: 5 }}>
                    <span>Promo ({order.promo_code})</span><span>−₹{order.discount}</span>
                  </div>
                )}
                {order.pack > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.sub, marginBottom: 5 }}>
                    <span>Packaging</span><span>₹{order.pack}</span>
                  </div>
                )}
                {order.delivery > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.sub, marginBottom: 5 }}>
                    <span>Delivery</span><span>₹{order.delivery}</span>
                  </div>
                )}
                {order.gst > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: C.sub, marginBottom: 5 }}>
                    <span>GST</span><span>₹{order.gst}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between",
                  fontWeight: 900, fontSize: 15, borderTop: `1px dashed ${C.line}`,
                  marginTop: 8, paddingTop: 8 }}>
                  <span>TOTAL</span><span>₹{order.total}</span>
                </div>
              </div>

              {order.mode === "deliver" && order.delivery_address && (
                <div style={{ marginTop: 12, fontSize: 11.5, color: C.sub,
                  borderTop: `1px dashed ${C.line}`, paddingTop: 10 }}>
                  Delivered to: {order.delivery_address}
                </div>
              )}

              <div style={{ textAlign: "center", marginTop: 14, fontSize: 11,
                color: C.sub, letterSpacing: ".5px" }}>
                POWERED BY SKIP WAIT · NO PLATFORM FEE
              </div>
            </div>
          )}

          {onBack && (
            <button onClick={onBack} style={{ width: "100%", cursor: "pointer", border: `1.5px solid ${C.line}`,
              background: C.card, color: C.text, borderRadius: 12, padding: 13, fontWeight: 700, fontSize: 14 }}>
              ← Back to orders
            </button>
          )}
          <button onClick={reset} style={{ width: "100%", cursor: "pointer", border: "none",
            background: C.text, color: "#fff", borderRadius: 12, padding: 14, fontWeight: 800,
            fontSize: 15 }}>Order again</button>
        </div>
      )}
    </div>
  );
}

/* ── customer: order history ── */
function OrderHistory({ onClose, onReorder }) {
  const [orders,   setOrders]   = useState(null);
  const [tracking, setTracking] = useState(null);

  const load = () => api.myOrders().then(setOrders).catch(() => setOrders([]));
  useEffect(() => { load(); }, []);

  if (tracking) {
    return (
      <Track
        orderId={tracking}
        reset={() => setTracking(null)}
        tableInfo={null}
        backLabel="← Orders"
        onBack={() => { setTracking(null); load(); }}
      />
    );
  }

  const modeLabel = { pickup: "Pickup", deliver: "Delivery", dine_in: "Dine-in" };
  const modeColor = { pickup: C.primary, deliver: C.rating, dine_in: C.sub };
  const phone = getPhone();
  const doneCount = orders ? orders.filter((o) => o.done).length : 0;

  return (
    <div style={{ background: C.panel, minHeight: "100vh" }}>
      {/* header */}
      <div style={{ background: C.card, padding: "12px 16px", borderBottom: `1px solid ${C.line}`,
        display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: C.sub,
            display: "flex", alignItems: "center", gap: 4, fontSize: 13.5, padding: 0 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>My Profile</div>
      </div>

      {/* profile card */}
      <div style={{ background: C.card, margin: "12px 12px 0", borderRadius: 16, padding: "18px 16px",
        display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 99, background: C.primarySoft,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Phone size={22} style={{ color: C.primary }} />
        </div>
        <div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 17 }}>+91 {phone}</div>
          <div style={{ fontSize: 12.5, color: C.sub, marginTop: 3 }}>
            {orders === null ? "Loading…" : `${orders.length} order${orders.length !== 1 ? "s" : ""} · ${doneCount} completed`}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 6px", fontWeight: 800, fontSize: 13,
        color: C.sub, letterSpacing: ".5px" }}>ORDER HISTORY</div>

      {!orders && <Note>Loading…</Note>}
      {orders && orders.length === 0 && (
        <div style={{ padding: "48px 20px", textAlign: "center", color: C.sub, fontSize: 13.5 }}>
          No orders yet.<br />Place your first order from the home screen.
        </div>
      )}

      {orders && orders.map((o) => {
        const date = o.created_at
          ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : "";
        return (
          <div key={o.id} style={{ background: C.card, borderBottom: `1px solid ${C.line}` }}>
            <button onClick={() => setTracking(o.id)}
              style={{ width: "100%", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: o.done ? C.panel : C.primarySoft,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                {o.done
                  ? <Check size={18} style={{ color: C.rating }} />
                  : <Clock  size={18} style={{ color: C.primary }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{o.kitchen_name}</div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 99,
                    background: C.panel, color: modeColor[o.mode] }}>
                    {modeLabel[o.mode]}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.sub }}>#{o.id}</span>
                  <span style={{ fontSize: 12, color: C.sub }}>{date}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 15 }}>₹{o.total}</div>
                <div style={{ fontSize: 11.5, marginTop: 2,
                  color: o.done ? C.rating : C.primary, fontWeight: 700 }}>
                  {o.done ? "Completed" : o.status}
                </div>
              </div>
            </button>
            {o.done && (
              <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                <StarRating orderId={o.id} initial={o.order_rating} onChange={() => load()} />
                <button onClick={() => onReorder && onReorder(o.kitchen_id, o.items)}
                  style={{ width: "100%", border: `1.5px solid ${C.line}`, background: C.card,
                    borderRadius: 10, padding: "10px 14px", fontWeight: 700, fontSize: 13.5,
                    cursor: "pointer", color: C.text, display: "flex", alignItems: "center",
                    justifyContent: "center", gap: 6 }}>
                  <ShoppingBag size={15} /> Reorder
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════ KITCHEN VIEW ═══════════════════ */
function OpenToggle({ kitchenId, isOpen, onToggled }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try { await api.setKitchenOpen(kitchenId, !isOpen); onToggled(); }
    catch {} finally { setBusy(false); }
  };
  return (
    <button onClick={toggle} disabled={busy}
      style={{ cursor: busy ? "default" : "pointer", border: "none", borderRadius: 8,
        padding: "5px 10px", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", gap: 5,
        background: isOpen ? "#E8F5E9" : "#FDECEA",
        color: isOpen ? C.rating : C.red }}>
      <Power size={12} />
      {isOpen ? "Open" : "Closed"}
    </button>
  );
}

/* ── kitchen self-registration modal ── */
function KitchenRegisterModal({ onDone, onClose }) {
  const [name,     setName]     = useState("");
  const [cuisine,  setCuisine]  = useState("");
  const [eta,      setEta]      = useState(20);
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");

  const GRADIENTS = [
    ["#F6B14E", "#E8702A"], ["#4E9EF6", "#2A6AE8"], ["#7B5EA7", "#4A2A8A"],
    ["#50C878", "#2A8A50"], ["#F64E4E", "#A82A2A"], ["#F6E14E", "#A89A2A"],
  ];
  const [grad, setGrad] = useState(0);

  const submit = async () => {
    if (!name.trim()) return setErr("Restaurant name is required");
    setBusy(true); setErr("");
    try {
      const res = await api.registerKitchen({
        name: name.trim(), tag: cuisine.trim(), eta,
        grad_from: GRADIENTS[grad][0], grad_to: GRADIENTS[grad][1],
      });
      setSession(getToken(), "kitchen", res.kitchen_id);
      onDone(res.kitchen_id);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const inp = { border: `1.5px solid ${C.line}`, borderRadius: 11, padding: "11px 14px",
    fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: SANS };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 100 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: C.card, borderRadius: "24px 24px 0 0",
        padding: "24px 20px 40px", zIndex: 101, boxSizing: "border-box" }}>

        {/* drag handle */}
        <div style={{ width: 40, height: 4, background: C.line, borderRadius: 99,
          margin: "0 auto 20px" }} />

        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 4 }}>Register your restaurant</div>
        <div style={{ fontSize: 13, color: C.sub, marginBottom: 20 }}>
          You get <b style={{ color: C.rating }}>50 free credits</b> to start (≈ 10 orders).
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 5 }}>
          RESTAURANT NAME *
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sharma Ji Ka Dhaba" style={{ ...inp, marginBottom: 14 }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 5 }}>
          CUISINE / TAG LINE
        </div>
        <input value={cuisine} onChange={(e) => setCuisine(e.target.value)}
          placeholder="e.g. North Indian · Rajasthani" style={{ ...inp, marginBottom: 14 }} />

        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 5 }}>
          AVERAGE PREP TIME
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[10, 15, 20, 30].map((m) => (
            <button key={m} onClick={() => setEta(m)}
              style={{ flex: 1, padding: "9px 0", border: `1.5px solid ${eta === m ? C.primary : C.line}`,
                borderRadius: 10, background: eta === m ? C.primarySoft : "#fff",
                color: eta === m ? C.primary : C.text, fontWeight: 800, cursor: "pointer",
                fontFamily: MONO, fontSize: 13 }}>
              {m}m
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 8 }}>
          BRAND COLOUR
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {GRADIENTS.map(([from, to], i) => (
            <button key={i} onClick={() => setGrad(i)}
              style={{ width: 36, height: 36, borderRadius: 10, cursor: "pointer", flexShrink: 0,
                background: `linear-gradient(135deg,${from},${to})`,
                border: grad === i ? `3px solid ${C.text}` : `3px solid transparent`,
                outline: grad === i ? `2px solid #fff` : "none", outlineOffset: -4 }} />
          ))}
        </div>

        {err && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", background: busy ? C.sub : C.primary, color: "#fff",
            border: "none", borderRadius: 13, padding: 14, fontWeight: 900, fontSize: 16,
            cursor: busy ? "default" : "pointer" }}>
          {busy ? "Registering…" : "Register & go to dashboard →"}
        </button>
      </div>
    </>
  );
}

function KitchenView({ kitchenId }) {
  const [kitchen,        setKitchen]        = useState(null);
  const [tab,            setTab]            = useState("orders");
  const [editingProfile, setEditingProfile] = useState(false);
  const [showQR,         setShowQR]         = useState(false);

  const refreshKitchen = useCallback(() => {
    if (kitchenId)
      api.kitchens().then((ks) => setKitchen(ks.find((k) => k.id === kitchenId)));
  }, [kitchenId]);

  useEffect(() => {
    refreshKitchen();
    const t = setInterval(refreshKitchen, 10000);
    return () => clearInterval(t);
  }, [refreshKitchen]);

  if (!kitchenId) return (
    <div style={{ padding: "48px 24px", textAlign: "center" }}>
      <UtensilsCrossed size={40} style={{ color: C.line, marginBottom: 16 }} />
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>No restaurant linked</div>
      <div style={{ fontSize: 13.5, color: C.sub }}>
        Your account isn't linked to a kitchen yet.<br />Ask your admin to assign you one.
      </div>
    </div>
  );

  const TAB = (id, label) => (
    <button onClick={() => setTab(id)}
      style={{ flex: 1, cursor: "pointer", border: "none", padding: "11px 0", fontWeight: 700,
        fontSize: 13, borderBottom: `2.5px solid ${tab === id ? C.primary : "transparent"}`,
        background: "transparent", color: tab === id ? C.primary : C.sub }}>
      {label}
    </button>
  );

  return (
    <div style={{ background: C.panel, minHeight: "100vh" }}>
      {kitchen && (
        <div style={{ background: C.card, padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{kitchen.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <OpenToggle kitchenId={kitchenId} isOpen={kitchen.is_open !== false}
                onToggled={refreshKitchen} />
              <button onClick={() => setShowQR(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.sub,
                  display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, padding: 4 }}>
                <QrCode size={14} /> QR
              </button>
              <button onClick={() => setEditingProfile(true)}
                style={{ background: "none", border: "none", cursor: "pointer", color: C.sub,
                  display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, padding: 4 }}>
                <Pencil size={14} /> Edit
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 12.5, color: C.sub }}>{kitchen.tag}</span>
            <span style={{ fontSize: 12.5, color: C.sub }}>·</span>
            <span style={{ fontSize: 12.5, color: C.sub }}>{kitchen.eta} min · {kitchen.dist}</span>
            <span style={{ fontSize: 12.5, color: C.sub }}>·</span>
            <span style={{ fontSize: 12.5, fontFamily: MONO, fontWeight: 700,
              color: kitchen.credit_balance < 20 ? C.red : C.rating }}>
              ₹{kitchen.credit_balance} credits</span>
          </div>
        </div>
      )}
      <div style={{ background: C.card, borderBottom: `1px solid ${C.line}`,
        display: "flex", padding: "0 16px" }}>
        {TAB("orders",    "Orders")}
        {TAB("menu",      "Menu")}
        {TAB("tables",    "Tables")}
        {TAB("analytics", "Stats")}
        {TAB("offers",    "Offers")}
      </div>

      {tab === "orders"    && <KitchenOrders    kitchenId={kitchenId} />}
      {tab === "menu"      && <KitchenMenu      kitchenId={kitchenId} />}
      {tab === "tables"    && <KitchenTables    kitchenId={kitchenId} />}
      {tab === "analytics" && <KitchenAnalytics kitchenId={kitchenId} />}
      {tab === "offers"    && <KitchenOffers    kitchenId={kitchenId} />}

      {editingProfile && kitchen && (
        <KitchenProfileModal
          kitchen={kitchen}
          onSave={async (data) => {
            await api.editKitchenProfile(kitchenId, data);
            setEditingProfile(false);
            refreshKitchen();
          }}
          onClose={() => setEditingProfile(false)}
        />
      )}
      {showQR && kitchenId && (
        <div onClick={() => setShowQR(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.card, borderRadius: 16, padding: "28px 32px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16,
              boxShadow: "0 8px 40px rgba(0,0,0,0.18)", maxWidth: 320, width: "90%" }}>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Your menu QR code</div>
            <QRCodeSVG
              value={`${window.location.origin}/k/${kitchenId}`}
              size={220}
              bgColor="#ffffff"
              fgColor="#1a1a1a"
              level="M"
            />
            <div style={{ fontSize: 12, color: "#888", textAlign: "center", wordBreak: "break-all" }}>
              {window.location.origin}/k/{kitchenId}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(`${window.location.origin}/k/${kitchenId}`)
                    .then(() => alert("Link copied!"))
                    .catch(() => {});
                }}
                style={{ padding: "8px 18px", borderRadius: 8, border: "1.5px solid #ddd",
                  background: "#f9f9f9", cursor: "pointer", fontSize: 13 }}>
                Copy link
              </button>
              <button onClick={() => setShowQR(false)}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none",
                  background: C.primary, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── kitchen: edit profile modal ── */
function KitchenProfileModal({ kitchen, onSave, onClose }) {
  const [name,     setName]     = useState(kitchen.name);
  const [tag,      setTag]      = useState(kitchen.tag);
  const [eta,      setEta]      = useState(kitchen.eta);
  const [dist,     setDist]     = useState(kitchen.dist);
  const [addr,     setAddr]     = useState(kitchen.location_address || "");
  const [gradFrom, setGradFrom] = useState(kitchen.grad[0] || kitchen.grad_from || "#F6B14E");
  const [gradTo,   setGradTo]   = useState(kitchen.grad[1] || kitchen.grad_to   || "#E8702A");
  const [busy,     setBusy]     = useState(false);
  const [err,      setErr]      = useState("");

  const submit = async () => {
    if (!name.trim() || !tag.trim()) return;
    setBusy(true); setErr("");
    try { await onSave({ name: name.trim(), tag: tag.trim(), eta: parseInt(eta) || 15,
                         dist: dist.trim(), grad_from: gradFrom, grad_to: gradTo,
                         is_open: kitchen.is_open !== false,
                         location_address: addr.trim() }); }
    catch (e) { setErr(e.message); setBusy(false); }
  };

  return (
    <Modal title="Edit profile" onClose={onClose}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 2 }}>
          <label style={lbl}>Restaurant name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={lbl}>ETA (min)</label>
          <input value={eta} inputMode="numeric"
            onChange={(e) => setEta(e.target.value.replace(/\D/g,""))} style={inp} />
        </div>
      </div>
      <label style={lbl}>Cuisine / tag line</label>
      <input value={tag} onChange={(e) => setTag(e.target.value)} style={{ ...inp, marginBottom: 12 }}
        placeholder="e.g. North Indian, Thalis" />
      <label style={lbl}>Restaurant address (for Porter delivery)</label>
      <input value={addr} onChange={(e) => setAddr(e.target.value)} style={{ ...inp, marginBottom: 12 }}
        placeholder="e.g. 12 MG Road, Bengaluru 560001" />
      <label style={lbl}>Distance from centre</label>
      <input value={dist} onChange={(e) => setDist(e.target.value)} style={{ ...inp, marginBottom: 12 }}
        placeholder="e.g. 1.2 km" />
      <label style={lbl}>Brand colours</label>
      <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>From</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={gradFrom} onChange={(e) => setGradFrom(e.target.value)}
              style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer",
                padding: 2, background: "none" }} />
            <input value={gradFrom} onChange={(e) => setGradFrom(e.target.value)}
              style={{ ...inp, marginTop: 0, flex: 1, fontFamily: MONO, fontSize: 13 }} />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>To</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="color" value={gradTo} onChange={(e) => setGradTo(e.target.value)}
              style={{ width: 36, height: 36, border: "none", borderRadius: 8, cursor: "pointer",
                padding: 2, background: "none" }} />
            <input value={gradTo} onChange={(e) => setGradTo(e.target.value)}
              style={{ ...inp, marginTop: 0, flex: 1, fontFamily: MONO, fontSize: 13 }} />
          </div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg,${gradFrom},${gradTo})` }} />
      </div>
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
      <button onClick={submit} disabled={busy || !name.trim()}
        style={{ width: "100%", marginTop: 20, background: busy ? C.sub : C.primary, color: "#fff",
          border: "none", borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 14.5,
          cursor: busy ? "default" : "pointer" }}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </Modal>
  );
}

/* ── kitchen: orders tab ── */
function beep() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

const MODE_FILTERS = [
  { key: "all",     label: "All" },
  { key: "dine_in", label: "Dine-in" },
  { key: "pickup",  label: "Pickup" },
  { key: "deliver", label: "Delivery" },
];

function KitchenOrders({ kitchenId }) {
  const [orders,      setOrders]      = useState([]);
  const [filter,      setFilter]      = useState("all");
  const [showHistory, setShowHistory] = useState(false);
  const [histOrders,  setHistOrders]  = useState(null);
  const [histQuery,   setHistQuery]   = useState("");
  const knownIds = React.useRef(null);   // null = first load

  const poll = useCallback(() => {
    api.kitchenOrders(kitchenId).then((incoming) => {
      if (knownIds.current !== null) {
        const fresh = incoming.filter((o) => !knownIds.current.has(o.id));
        if (fresh.length > 0) {
          beep();
          if (Notification.permission === "granted") {
            fresh.forEach((o) =>
              new Notification(`New order #${o.id}`, {
                body: o.items.map((i) => `${i.qty}× ${i.name}`).join(", "),
                silent: true,
              })
            );
          }
        }
      }
      knownIds.current = new Set(incoming.map((o) => o.id));
      setOrders(incoming);
    }).catch(() => {});
  }, [kitchenId]);

  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, [poll]);

  const active  = orders.filter((o) => !o.cancelled);
  const visible = filter === "all" ? active : active.filter((o) => o.mode === filter);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {MODE_FILTERS.map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{ cursor: "pointer", border: "none", borderRadius: 99,
              padding: "5px 12px", fontSize: 12, fontWeight: 700,
              background: filter === key ? C.primary : C.panel,
              color: filter === key ? "#fff" : C.sub }}>
            {label}
            {key !== "all" && active.filter((o) => o.mode === key).length > 0 && (
              <span style={{ marginLeft: 5, background: filter === key ? "rgba(255,255,255,.3)" : C.line,
                borderRadius: 99, padding: "1px 6px", fontSize: 11 }}>
                {active.filter((o) => o.mode === key).length}
              </span>
            )}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, padding: "40px 20px", fontSize: 13.5 }}>
          {orders.length === 0
            ? <>No live orders yet.<br />Customers place orders from their own login.</>
            : `No ${filter} orders right now.`}
        </div>
      )}
      {visible.map((o) => <KitchenOrder key={o.id} o={o} onChanged={poll} />)}

      {/* order history */}
      <div style={{ marginTop: 8 }}>
        <button onClick={() => {
          setShowHistory((s) => {
            if (!s) api.kitchenOrderHistory(kitchenId, "").then(setHistOrders).catch(() => {});
            return !s;
          });
        }} style={{ width: "100%", background: "none", border: `1px solid ${C.line}`,
          borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontWeight: 700,
          fontSize: 13, color: C.sub, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <History size={14} /> {showHistory ? "Hide history" : "Order history"}
        </button>
        {showHistory && (
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8,
              background: C.card, borderRadius: 10, padding: "8px 12px", marginBottom: 10,
              border: `1px solid ${C.line}` }}>
              <Search size={14} style={{ color: C.sub }} />
              <input value={histQuery} placeholder="Search by order ID…"
                onChange={(e) => {
                  setHistQuery(e.target.value);
                  api.kitchenOrderHistory(kitchenId, e.target.value).then(setHistOrders).catch(() => {});
                }}
                style={{ border: "none", outline: "none", fontSize: 13, flex: 1, background: "transparent" }} />
            </div>
            {!histOrders && <Note>Loading…</Note>}
            {histOrders && histOrders.length === 0 && <Note>No orders found.</Note>}
            {histOrders && histOrders.map((o) => (
              <div key={o.id} style={{ background: C.card, borderRadius: 18, padding: "12px 14px", border: `1px solid ${C.line}`,
                marginBottom: 8, opacity: o.cancelled ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13.5 }}>#{o.id}</span>
                    {o.cancelled && <span style={{ fontSize: 11, color: C.red, fontWeight: 700,
                      marginLeft: 7 }}>CANCELLED</span>}
                  </div>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>₹{o.total}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 5 }}>
                  {o.items.map((it) => `${it.qty}× ${it.name}`).join(", ")}
                </div>
                <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>
                  {o.mode === "dine_in" ? "Dine-in" : o.mode === "deliver" ? "Delivery" : "Pickup"}
                  {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PREP_MIN_OPTIONS = [5, 10, 15, 20, 30, 40, 50];

function KitchenOrder({ o, onChanged }) {
  const [otp,            setOtp]           = useState("");
  const [err,            setErr]           = useState(false);
  const [busy,           setBusy]          = useState(false);
  const [porterBusy,     setPorterBusy]    = useState(false);
  const [porterErr,      setPorterErr]     = useState("");
  const [showRiderForm,  setShowRiderForm] = useState(false);
  const [riderName,      setRiderName]     = useState("");
  const [riderVeh,       setRiderVeh]      = useState("");
  const [riderErr,       setRiderErr]      = useState("");
  const [showPrepPicker, setShowPrepPicker] = useState(false);

  const flow = o.flow, idx = o.status_index, done = o.done;
  const isHandoff   = idx === flow.length - 2;
  const needsOtp    = isHandoff && o.mode === "pickup";
  const needsRider  = idx === 1 && o.mode === "deliver";
  const action = idx === 0 ? "Payment received — start preparing"
    : idx === 1 ? (o.mode === "pickup" ? "Mark ready for pickup" : o.mode === "dine_in" ? "Mark served" : "Hand to rider")
    : (o.mode === "pickup" ? "Confirm pickup" : o.mode === "dine_in" ? "Mark completed" : "Confirm delivery");

  const bookPorter = async () => {
    setPorterBusy(true); setPorterErr("");
    try {
      const r = await api.bookPorter(o.id);
      alert(`Porter booked! Rider will arrive shortly.\nFare: ₹${r.fare_inr || "—"}\nTracking: ${r.porter_tracking_url || "—"}`);
      onChanged();
    } catch (e) { setPorterErr(e.message); }
    finally { setPorterBusy(false); }
  };

  const act = async () => {
    if (idx === 0 && !showPrepPicker) { setShowPrepPicker(true); return; }
    if (needsRider && !o.porter_order_id && !o.rider.name && !showRiderForm) {
      setShowRiderForm(true); return;
    }
    if (needsRider && showRiderForm) {
      if (!riderName.trim() || !riderVeh.trim()) { setRiderErr("Enter rider name and vehicle"); return; }
      setBusy(true); setRiderErr("");
      try { await api.assignRider(o.id, riderName.trim(), riderVeh.trim()); }
      catch (e) { setRiderErr(e.message); setBusy(false); return; }
      setBusy(false);
    }
    setBusy(true); setErr(false);
    try {
      await api.advance(o.id, needsOtp ? otp : null);
      setOtp(""); setShowRiderForm(false); onChanged();
    }
    catch (e) { if (e.status === 403) setErr(true); } finally { setBusy(false); }
  };

  const confirmPrep = async (mins) => {
    setBusy(true); setErr(false);
    try {
      await api.confirmPayment(o.id, mins);
      setShowPrepPicker(false);
      onChanged();
    }
    catch (e) { if (e.status === 403) setErr(true); } finally { setBusy(false); }
  };

  const modeBadge = o.mode === "dine_in"
    ? { bg: "rgba(241,87,0,.12)", color: C.primary, label: `DINE-IN · ${o.table_label || ""}` }
    : o.mode === "pickup"
    ? { bg: C.primarySoft, color: C.primary, label: `PICKUP · ${o.arrival}m` }
    : { bg: "rgba(38,126,62,.12)", color: C.rating, label: "DELIVERY" };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16,
      marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>#{o.id}</div>
        <span style={{ fontSize: 11.5, fontWeight: 800, padding: "3px 9px", borderRadius: 99,
          background: modeBadge.bg, color: modeBadge.color }}>{modeBadge.label}</span>
      </div>
      <div style={{ margin: "12px 0", borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
        {o.items.map((l, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
            opacity: l.removed ? 0.45 : 1 }}>
            <VegMark veg={l.veg} />
            <span style={{ fontSize: 14.5, flex: 1, textDecoration: l.removed ? "line-through" : "none" }}>
              <b style={{ fontFamily: MONO }}>{l.qty}×</b> {l.name}</span>
            {!done && (
              <button onClick={async () => { await api.toggleRemoveItem(o.id, l.item_id); onChanged(); }}
                title={l.removed ? "Restore item" : "Remove item"}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2,
                  color: l.removed ? C.rating : C.sub, display: "flex", flexShrink: 0 }}>
                {l.removed ? <Check size={13} /> : <X size={13} />}
              </button>
            )}
          </div>
        ))}
      </div>
      {o.mode === "deliver" && o.delivery_address && (
        <div style={{ background: "rgba(38,126,62,.08)", border: "1px solid rgba(38,126,62,.25)",
          borderRadius: 10, padding: "9px 12px", marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.rating, marginBottom: 3, letterSpacing: .4 }}>
            DELIVER TO
          </div>
          <div style={{ fontSize: 13.5, color: "#222", lineHeight: 1.4 }}>{o.delivery_address}</div>
        </div>
      )}
      {o.customer_phone && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
          fontSize: 13, color: C.sub }}>
          <Phone size={13} />
          <a href={`tel:${o.customer_phone}`} style={{ color: C.text, fontFamily: MONO,
            fontWeight: 700, textDecoration: "none" }}>{o.customer_phone}</a>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5 }}>
        <span style={{ color: C.sub }}>Status:</span>
        <b style={{ color: done ? C.rating : C.primary }}>{o.status}</b>
      </div>
      {needsOtp && !done && (
        <div style={{ marginTop: 14, background: C.panel, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginBottom: 8 }}>
            Ask customer for their pickup code</div>
          <input value={otp} inputMode="numeric" placeholder="• • • •"
            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 4)); setErr(false); }}
            style={{ width: "100%", padding: "11px 12px", borderRadius: 9, fontFamily: MONO, fontSize: 18,
              letterSpacing: "6px", textAlign: "center", boxSizing: "border-box",
              border: `1.5px solid ${err ? C.red : C.line}`, outline: "none" }} />
          {err && <div style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 600 }}>
            Wrong code.</div>}
        </div>
      )}
      {/* Porter booking panel — delivery orders at "Preparing" stage */}
      {needsRider && !done && !o.porter_order_id && (
        <div style={{ marginTop: 14, background: "#EBF5FF", borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 8,
            display: "flex", alignItems: "center", gap: 5 }}>
            <Bike size={13} /> Assign delivery rider
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={bookPorter} disabled={porterBusy}
              style={{ flex: 1, padding: "10px", background: "#0066CC", color: "#fff",
                border: "none", borderRadius: 9, fontWeight: 700, fontSize: 13,
                cursor: porterBusy ? "default" : "pointer" }}>
              {porterBusy ? "Booking…" : "📦 Book Porter rider"}
            </button>
            <button onClick={() => setShowRiderForm((v) => !v)}
              style={{ padding: "10px 12px", background: C.card, color: C.sub,
                border: `1.5px solid ${C.line}`, borderRadius: 9, fontSize: 12.5,
                cursor: "pointer" }}>
              Manual
            </button>
          </div>
          {porterErr && <div style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{porterErr}</div>}
        </div>
      )}
      {o.porter_order_id && !done && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#EBF5FF",
          borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0066CC" }}>
            Porter booked · {o.rider.name || "Rider en route"}
          </div>
          {o.porter_tracking_url && (
            <a href={o.porter_tracking_url} target="_blank" rel="noreferrer"
              style={{ fontSize: 12, color: "#0066CC" }}>Track →</a>
          )}
        </div>
      )}
      {showRiderForm && !done && (
        <div style={{ marginTop: 14, background: C.panel, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginBottom: 10 }}>
            Manual rider details</div>
          <input value={riderName} placeholder="Rider name (e.g. Ramesh K.)"
            onChange={(e) => { setRiderName(e.target.value); setRiderErr(""); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 14,
              border: `1.5px solid ${C.line}`, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
          <input value={riderVeh} placeholder="Vehicle no. (e.g. RJ14 AB 1234)"
            onChange={(e) => { setRiderVeh(e.target.value); setRiderErr(""); }}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 9, fontSize: 14,
              border: `1.5px solid ${C.line}`, outline: "none", boxSizing: "border-box" }} />
          {riderErr && <div style={{ color: C.red, fontSize: 12, marginTop: 6, fontWeight: 600 }}>{riderErr}</div>}
        </div>
      )}
      {!done && idx === 0 && showPrepPicker ? (
        <div style={{ marginTop: 14, background: C.panel, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 12.5, color: C.sub, fontWeight: 700, marginBottom: 10 }}>
            How long will this order take to prepare?</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PREP_MIN_OPTIONS.map((m) => (
              <button key={m} onClick={() => confirmPrep(m)} disabled={busy}
                style={{ padding: "10px 14px", borderRadius: 9, fontWeight: 700, fontSize: 13.5,
                  border: `1.5px solid ${C.line}`, background: "#fff", color: C.text,
                  cursor: busy ? "default" : "pointer" }}>
                {m} min
              </button>
            ))}
          </div>
          <button onClick={() => setShowPrepPicker(false)} disabled={busy}
            style={{ marginTop: 10, border: "none", background: "none", color: C.sub,
              fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            Cancel
          </button>
        </div>
      ) : !done ? (
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          {idx === 0 && (
            <button onClick={async () => {
              if (!window.confirm("Reject this order?")) return;
              try { await api.rejectOrder(o.id); onChanged(); } catch {}
            }} style={{ flex: "0 0 auto", border: `1.5px solid ${C.red}`, background: C.card,
              color: C.red, borderRadius: 11, padding: "13px 14px", fontWeight: 700,
              fontSize: 13.5, cursor: "pointer" }}>Reject</button>
          )}
          <button onClick={act} disabled={busy} style={{ flex: 1,
            cursor: busy ? "default" : "pointer", border: "none", background: C.veg, color: "#fff",
            borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 14.5, display: "flex",
            alignItems: "center", justifyContent: "center", gap: 7 }}>
            <Check size={16} /> {busy ? "…" : (showRiderForm ? "Confirm & hand to rider" : action)}
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 14, textAlign: "center", color: C.rating, fontWeight: 800, fontSize: 14.5 }}>
          Order complete ✓</div>
      )}
    </div>
  );
}

/* ── kitchen: analytics tab ── */
function AnalyticsStatCard({ label, count, revenue, accent }) {
  return (
    <div style={{ flex: 1, background: C.card, borderRadius: 18, padding: "14px 16px", border: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: "1px",
        marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 26,
        color: accent }}>{count}</div>
      <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>orders</div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, marginTop: 8,
        color: C.text }}>₹{revenue.toLocaleString("en-IN")}</div>
      <div style={{ fontSize: 11.5, color: C.sub }}>revenue</div>
    </div>
  );
}

function KitchenAnalytics({ kitchenId }) {
  const [data, setData] = useState(null);
  const [err,  setErr]  = useState("");

  useEffect(() => {
    setData(null); setErr("");
    api.kitchenAnalytics(kitchenId)
      .then(setData)
      .catch((e) => setErr(e.message));
  }, [kitchenId]);

  if (err) return (
    <div style={{ padding: "24px 16px", textAlign: "center" }}>
      <div style={{ color: C.red, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{err}</div>
      {err.includes("logged in") && (
        <div style={{ fontSize: 12.5, color: C.sub }}>Try logging out and back in.</div>
      )}
    </div>
  );

  if (!data) return (
    <div style={{ padding: "40px 16px", textAlign: "center", color: C.sub, fontSize: 13.5 }}>
      Loading stats…
    </div>
  );

  const { today, week, daily, modes, top_items, earnings = [] } = data;

  const maxRev      = Math.max(...daily.map((d) => d.revenue), 1);
  const modeLabels  = { pickup: "Pickup", deliver: "Delivery", dine_in: "Dine-in" };
  const modeColors  = { pickup: C.primary, deliver: C.rating, dine_in: "#7B5EA7" };
  const totalOrders = Object.values(modes).reduce((s, m) => s + m.count, 0) || 1;

  return (
    <div style={{ padding: 14 }}>

      {/* today + week cards */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <AnalyticsStatCard label="TODAY" count={today.count} revenue={today.revenue} accent={C.primary} />
        <AnalyticsStatCard label="THIS WEEK" count={week.count} revenue={week.revenue} accent="#7B5EA7" />
      </div>

      {/* 7-day bar chart */}
      <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: "1px",
          marginBottom: 14 }}>DAILY REVENUE — LAST 7 DAYS</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
          {daily.map((d) => {
            const pct = d.revenue / maxRev;
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column",
                alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 10, color: C.sub, fontFamily: MONO, fontWeight: 700,
                  visibility: d.revenue ? "visible" : "hidden" }}>
                  {d.revenue >= 1000 ? `${(d.revenue/1000).toFixed(1)}k` : d.revenue}
                </div>
                <div style={{ width: "100%", borderRadius: "4px 4px 0 0",
                  height: Math.max(pct * 56, d.revenue ? 4 : 0),
                  background: d.label === "Today" ? C.primary : "#D0C4E8",
                  transition: "height .3s" }} />
                <div style={{ fontSize: 9.5, color: d.label === "Today" ? C.primary : C.sub,
                  fontWeight: d.label === "Today" ? 800 : 600, textAlign: "center",
                  lineHeight: 1.2 }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* mode breakdown */}
      <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: "1px",
          marginBottom: 12 }}>ORDER MODES</div>
        {Object.entries(modes).length === 0 && (
          <div style={{ color: C.sub, fontSize: 13 }}>No orders yet.</div>
        )}
        {Object.entries(modes).map(([mode, m]) => {
          const pct = m.count / totalOrders;
          const col = modeColors[mode] || C.sub;
          return (
            <div key={mode} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: col }}>
                  {modeLabels[mode] || mode}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: C.sub }}>
                  {m.count} · ₹{m.revenue.toLocaleString("en-IN")}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: C.panel }}>
                <div style={{ height: "100%", borderRadius: 99, background: col,
                  width: `${Math.round(pct * 100)}%`, transition: "width .4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* top items */}
      <div style={{ background: C.card, borderRadius: 18, padding: "14px 16px", border: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: "1px",
          marginBottom: 12 }}>TOP ITEMS (ALL TIME)</div>
        {top_items.length === 0 && (
          <div style={{ color: C.sub, fontSize: 13 }}>No orders yet.</div>
        )}
        {top_items.map((it, i) => (
          <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "9px 0", borderBottom: i < top_items.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ width: 24, height: 24, borderRadius: 99, background: i === 0 ? C.primary : C.panel,
              color: i === 0 ? "#fff" : C.sub, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{it.name}</div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>
                {it.qty} sold · ₹{it.revenue.toLocaleString("en-IN")}
              </div>
            </div>
            <TrendingUp size={14} style={{ color: i === 0 ? C.primary : C.line }} />
          </div>
        ))}
      </div>

      {/* Earnings statement */}
      <div style={{ background: C.card, borderRadius: 16, padding: "16px 16px 6px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>Earnings statement</div>
          <button onClick={() => window.print()}
            style={{ background: C.panel, border: "none", borderRadius: 8, padding: "5px 12px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", color: C.sub,
              display: "flex", alignItems: "center", gap: 5 }}>
            Print / PDF
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>
          Week food earnings: <b style={{ color: C.rating, fontFamily: MONO }}>
            ₹{(week.food_earnings || 0).toLocaleString("en-IN")}
          </b>
          &nbsp;·&nbsp;
          Today: <b style={{ color: C.rating, fontFamily: MONO }}>
            ₹{(today.food_earnings || 0).toLocaleString("en-IN")}
          </b>
        </div>
        {earnings.length === 0 && <div style={{ color: C.sub, fontSize: 13, paddingBottom: 10 }}>No orders yet.</div>}
        {earnings.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "9px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: C.sub }}>#{e.id}</div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 1 }}>{e.date}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.text }}>
                ₹{e.food_total}
              </div>
              <div style={{ fontSize: 11, color: C.sub }}>
                −₹{e.skip_fee} fee → <span style={{ color: C.rating, fontWeight: 700 }}>₹{e.net} net</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

/* ── kitchen: menu management tab ── */
function KitchenMenu({ kitchenId }) {
  const [items,     setItems]     = useState([]);
  const [cats,      setCats]      = useState([]);
  const [editItem,  setEditItem]  = useState(null);   // null | "new" | item object
  const [editCat,   setEditCat]   = useState(null);   // null | "new" | cat object
  const [busy,      setBusy]      = useState(false);
  const [msg,       setMsg]       = useState("");

  const load = () => {
    api.menu(kitchenId).then(setItems);
    api.categories(kitchenId).then(setCats);
  };
  useEffect(load, [kitchenId]);

  const saveItem = async (data) => {
    setBusy(true);
    try {
      if (editItem === "new") await api.addMenuItem(kitchenId, data);
      else await api.editMenuItem(kitchenId, editItem.id, data);
      setEditItem(null); load(); setMsg("Saved.");
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const deleteItem = async (iid) => {
    if (!confirm("Delete this item?")) return;
    await api.deleteMenuItem(kitchenId, iid).catch((e) => setMsg(e.message));
    load();
  };

  const toggleAvailable = async (it) => {
    await api.setItemAvailable(kitchenId, it.id, !it.available).catch((e) => setMsg(e.message));
    load();
  };

  const saveCat = async (data) => {
    setBusy(true);
    try {
      if (editCat === "new") await api.addCategory(kitchenId, data);
      else await api.editCategory(kitchenId, editCat.id, data);
      setEditCat(null); load();
    } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const deleteCat = async (cid) => {
    if (!confirm("Delete category? Items will become uncategorised.")) return;
    await api.deleteCategory(kitchenId, cid).catch((e) => setMsg(e.message));
    load();
  };

  // group items by category for display
  const catMap   = Object.fromEntries(cats.map((c) => [c.id, c]));
  const grouped  = [];
  const usedIds  = new Set();
  [...cats].sort((a, b) => a.sort_order - b.sort_order).forEach((c) => {
    const ci = items.filter((i) => i.category_id === c.id);
    grouped.push({ cat: c, items: ci });
    ci.forEach((i) => usedIds.add(i.id));
  });
  const uncategorised = items.filter((i) => !usedIds.has(i.id));
  if (uncategorised.length) grouped.push({ cat: null, items: uncategorised });

  return (
    <div style={{ padding: 14 }}>
      {msg && (
        <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 10,
          background: C.primarySoft, color: C.primary, fontSize: 13, fontWeight: 600,
          display: "flex", justifyContent: "space-between" }}>
          {msg} <button onClick={() => setMsg("")} style={{ border: "none", background: "none",
            color: C.primary, cursor: "pointer" }}>×</button>
        </div>
      )}

      {/* categories bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {cats.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 4,
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 99, padding: "5px 10px" }}>
            <Tag size={11} style={{ color: C.sub }} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
            <button onClick={() => setEditCat(c)} style={{ background: "none", border: "none",
              cursor: "pointer", color: C.sub, padding: 0, display: "flex" }}><Pencil size={11} /></button>
            <button onClick={() => deleteCat(c.id)} style={{ background: "none", border: "none",
              cursor: "pointer", color: C.red, padding: 0, display: "flex" }}><Trash2 size={11} /></button>
          </div>
        ))}
        <button onClick={() => setEditCat("new")}
          style={{ fontSize: 12, fontWeight: 700, color: C.primary, background: C.primarySoft,
            border: `1px dashed ${C.primary}`, borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}>
          + Add category
        </button>
      </div>

      {/* add item + bulk upload buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setEditItem("new")} style={{ flex: 1,
          padding: "11px", border: `1.5px dashed ${C.primary}`, borderRadius: 12, background: C.primarySoft,
          color: C.primary, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          + Add item
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, padding: "11px 14px",
          border: `1.5px dashed ${C.sub}`, borderRadius: 12, background: C.card,
          color: C.sub, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 }}>
          Import CSV
          <input type="file" accept=".csv,text/csv" style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              e.target.value = "";
              const reader = new FileReader();
              reader.onload = async (ev) => {
                const lines = ev.target.result.split("\n").map((l) => l.trim()).filter(Boolean);
                if (lines.length < 2) { setMsg("CSV must have a header row + at least one item."); return; }
                const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
                const rows = lines.slice(1).map((line) => {
                  const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
                  return Object.fromEntries(headers.map((h, i) => [h, cols[i] || ""]));
                });
                try {
                  const res = await api.bulkMenuUpload(kitchenId, rows);
                  setMsg(`Imported ${res.created} items.`);
                  load();
                } catch (ex) { setMsg(ex.message); }
              };
              reader.readAsText(file);
            }} />
        </label>
      </div>

      {/* items grouped */}
      {grouped.map(({ cat, items: gitems }) => (
        <div key={cat?.id || "uncat"}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 800, color: C.sub,
            letterSpacing: "1px", margin: "12px 0 6px" }}>
            {cat ? cat.name.toUpperCase() : "UNCATEGORISED"}
          </div>
          {gitems.map((it) => (
            <div key={it.id} style={{ background: C.card, borderRadius: 12, padding: "10px 12px",
              marginBottom: 8, display: "flex", alignItems: "center", gap: 10,
              opacity: it.available ? 1 : 0.5 }}>
              {it.image_url ? (
                <img src={it.image_url} alt={it.name}
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                  background: C.panel, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <VegMark veg={it.veg} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {it.image_url && <VegMark veg={it.veg} />}
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{it.name}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.sub, marginTop: 1 }}>{it.descr}</div>
                {!it.available && (
                  <div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>Unavailable</div>
                )}
              </div>
              <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 14 }}>₹{it.price}</div>
              <button onClick={() => toggleAvailable(it)} title={it.available ? "Mark unavailable" : "Mark available"}
                style={{ background: "none", border: "none", cursor: "pointer",
                  color: it.available ? C.rating : C.sub, padding: 4 }}>
                {it.available ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button onClick={() => setEditItem(it)} style={{ background: "none", border: "none",
                cursor: "pointer", color: C.sub, padding: 4 }}><Pencil size={15} /></button>
              <button onClick={() => deleteItem(it.id)} style={{ background: "none", border: "none",
                cursor: "pointer", color: C.red, padding: 4 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      ))}

      {/* item edit modal */}
      {editItem && (
        <ItemModal
          item={editItem === "new" ? null : editItem}
          cats={cats}
          kitchenId={kitchenId}
          busy={busy}
          onSave={saveItem}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* category edit modal */}
      {editCat && (
        <CatModal
          cat={editCat === "new" ? null : editCat}
          busy={busy}
          onSave={saveCat}
          onClose={() => setEditCat(null)}
        />
      )}
    </div>
  );
}

function compressImage(file, maxPx = 700, quality = 0.75) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function ItemModal({ item, cats, kitchenId, busy, onSave, onClose }) {
  const [name,       setName]       = useState(item?.name       || "");
  const [price,      setPrice]      = useState(item?.price       || "");
  const [descr,      setDescr]      = useState(item?.descr       || "");
  const [veg,        setVeg]        = useState(item?.veg         ?? true);
  const [catId,      setCatId]      = useState(item?.category_id || "");
  const [avail,      setAvail]      = useState(item?.available    ?? true);
  const [imageUrl,   setImageUrl]   = useState(item?.image_url    || "");
  const [imgBusy,    setImgBusy]    = useState(false);
  const [variants,   setVariants]   = useState(item?.variants || []);
  const [vName,      setVName]      = useState("");
  const [vPrice,     setVPrice]     = useState("");
  const [vBusy,      setVBusy]      = useState(false);

  const handleImageFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgBusy(true);
    const dataUrl = await compressImage(file);
    if (dataUrl) setImageUrl(dataUrl);
    setImgBusy(false);
  };

  const addVariant = async () => {
    if (!vName.trim() || !vPrice || !item?.id) return;
    setVBusy(true);
    try {
      const v = await api.addVariant(kitchenId, item.id, { name: vName.trim(), price: parseInt(vPrice) });
      setVariants((vs) => [...vs, v]);
      setVName(""); setVPrice("");
    } catch {} finally { setVBusy(false); }
  };
  const removeVariant = async (vid) => {
    if (!item?.id) return;
    try {
      await api.deleteVariant(kitchenId, item.id, vid);
      setVariants((vs) => vs.filter((v) => v.id !== vid));
    } catch {}
  };

  const submit = () => {
    if (!name.trim() || !price) return;
    onSave({ name: name.trim(), price: parseInt(price), veg, descr: descr.trim(),
              category_id: catId || null, available: avail,
              image_url: imageUrl.trim() || null });
  };

  return (
    <Modal title={item ? "Edit item" : "Add item"} onClose={onClose}>
      <label style={lbl}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="Item name" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <div>
          <label style={lbl}>Price (₹)</label>
          <input value={price} inputMode="numeric" onChange={(e) => setPrice(e.target.value.replace(/\D/g,""))}
            style={inp} placeholder="0" />
        </div>
        <div>
          <label style={lbl}>Category</label>
          <select value={catId} onChange={(e) => setCatId(e.target.value)} style={inp}>
            <option value="">None</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <label style={{ ...lbl, marginTop: 12 }}>Description</label>
      <input value={descr} onChange={(e) => setDescr(e.target.value)} style={inp} placeholder="Short description" />
      <label style={{ ...lbl, marginTop: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Image size={12} /> Photo</span>
      </label>
      {imageUrl ? (
        <div style={{ position: "relative", marginTop: 4 }}>
          <img src={imageUrl} alt="preview"
            style={{ width: "100%", height: 130, objectFit: "cover", borderRadius: 10 }}
            onError={(e) => { e.target.style.display = "none"; }} />
          <button onClick={() => setImageUrl("")}
            style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,.55)",
              border: "none", borderRadius: 99, color: "#fff", width: 24, height: 24,
              cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center",
              justifyContent: "center" }}>✕</button>
        </div>
      ) : (
        <label style={{ display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, marginTop: 4, padding: "28px 0", background: C.panel,
          border: `1.5px dashed ${C.line}`, borderRadius: 10, cursor: "pointer",
          fontSize: 13, color: C.sub }}>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageFile} />
          {imgBusy ? "Compressing…" : <><Image size={14} /> Upload photo</>}
        </label>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
          Vegetarian
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} />
          Available
        </label>
      </div>

      {item?.id && (
        <div style={{ marginTop: 18, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
            Sizes / Variants
            <span style={{ fontWeight: 400, color: C.sub, fontSize: 12, marginLeft: 6 }}>
              (if set, customer must pick one)
            </span>
          </div>
          {variants.map((v) => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
              <span style={{ fontSize: 13.5 }}>{v.name} <span style={{ fontFamily: MONO, color: C.sub }}>₹{v.price}</span></span>
              <button onClick={() => removeVariant(v.id)} style={{ background: "none", border: "none",
                cursor: "pointer", color: C.red, display: "flex" }}><Trash2 size={14} /></button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input value={vName} onChange={(e) => setVName(e.target.value)} placeholder="Name (e.g. Large)"
              style={{ flex: 1, ...inp, marginTop: 0 }} />
            <input value={vPrice} inputMode="numeric" onChange={(e) => setVPrice(e.target.value.replace(/\D/g,""))}
              placeholder="₹" style={{ width: 70, ...inp, marginTop: 0 }} />
            <button onClick={addVariant} disabled={vBusy || !vName.trim() || !vPrice}
              style={{ background: C.primary, border: "none", color: "#fff", borderRadius: 9,
                padding: "0 12px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {vBusy ? "…" : "Add"}
            </button>
          </div>
        </div>
      )}

      <button onClick={submit} disabled={busy || !name.trim() || !price}
        style={{ width: "100%", marginTop: 18, background: busy ? C.sub : C.primary, color: "#fff",
          border: "none", borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 14.5,
          cursor: busy ? "default" : "pointer" }}>
        {busy ? "Saving…" : "Save item"}
      </button>
    </Modal>
  );
}

function CatModal({ cat, busy, onSave, onClose }) {
  const [name,  setName]  = useState(cat?.name       || "");
  const [order, setOrder] = useState(cat?.sort_order ?? 0);
  return (
    <Modal title={cat ? "Edit category" : "Add category"} onClose={onClose}>
      <label style={lbl}>Category name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder="e.g. Starters" />
      <label style={{ ...lbl, marginTop: 12 }}>Sort order</label>
      <input value={order} inputMode="numeric" onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
        style={inp} placeholder="0" />
      <button onClick={() => name.trim() && onSave({ name: name.trim(), sort_order: order })}
        disabled={busy || !name.trim()}
        style={{ width: "100%", marginTop: 18, background: busy ? C.sub : C.primary, color: "#fff",
          border: "none", borderRadius: 11, padding: 13, fontWeight: 800, fontSize: 14.5,
          cursor: busy ? "default" : "pointer" }}>
        {busy ? "Saving…" : "Save category"}
      </button>
    </Modal>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: C.card, width: "100%", maxWidth: 440, borderRadius: "20px 20px 0 0",
        padding: "20px 20px 32px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer",
            color: C.sub }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const lbl = { fontSize: 12.5, fontWeight: 700, color: C.sub };
const inp = { width: "100%", marginTop: 6, padding: "10px 12px", border: `1.5px solid ${C.line}`,
  borderRadius: 9, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: SANS };

/* ── kitchen: tables & QR tab ── */
function KitchenTables({ kitchenId }) {
  const [tables,  setTables]  = useState([]);
  const [label,   setLabel]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [qrTable, setQrTable] = useState(null);   // table being shown full-screen QR

  const load = () => api.listTables(kitchenId).then(setTables).catch(() => {});
  useEffect(load, [kitchenId]);

  const add = async () => {
    if (!label.trim()) return;
    setBusy(true);
    await api.addTable(kitchenId, label.trim()).catch(() => {});
    setLabel(""); setBusy(false); load();
  };

  const del = async (tid) => {
    if (!confirm("Remove this table?")) return;
    await api.deleteTable(kitchenId, tid).catch(() => {});
    load();
  };

  const tableUrl = (tok) => `${window.location.origin}/t/${tok}`;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 800, color: C.sub,
        letterSpacing: "1px", marginBottom: 12 }}>TABLE QR CODES</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder='Table label — e.g. "Table 4"'
          onKeyDown={(e) => e.key === "Enter" && add()}
          style={{ flex: 1, padding: "11px 13px", border: `1.5px solid ${C.line}`, borderRadius: 11,
            fontSize: 14, outline: "none" }} />
        <button onClick={add} disabled={busy || !label.trim()}
          style={{ padding: "11px 16px", background: busy ? C.sub : C.primary, color: "#fff",
            border: "none", borderRadius: 11, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          Add
        </button>
      </div>

      {tables.length === 0 && (
        <div style={{ textAlign: "center", color: C.sub, padding: "30px 0", fontSize: 13.5 }}>
          No tables yet. Add one above.
        </div>
      )}

      {tables.map((t) => (
        <div key={t.id} style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 10, border: `1px solid ${C.line}`,
          display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flexShrink: 0 }}>
            <QRCodeSVG value={tableUrl(t.qr_token)} size={52} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: C.sub, fontFamily: MONO, marginTop: 2,
              wordBreak: "break-all" }}>/t/{t.qr_token}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={() => setQrTable(t)}
              style={{ background: C.panel, border: "none", borderRadius: 8, padding: "6px 10px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                fontWeight: 700 }}>
              <QrCode size={13} /> View
            </button>
            <button onClick={() => del(t.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: 4,
                display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <Trash2 size={13} /> Remove
            </button>
          </div>
        </div>
      ))}

      {/* full-screen QR modal */}
      {qrTable && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setQrTable(null)}>
          <div style={{ background: C.card, borderRadius: 20, padding: 32, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 18 }}>{qrTable.label}</div>
            <QRCodeSVG value={tableUrl(qrTable.qr_token)} size={220} />
            <div style={{ fontSize: 12, color: C.sub, marginTop: 16, fontFamily: MONO,
              wordBreak: "break-all", maxWidth: 240 }}>
              {tableUrl(qrTable.qr_token)}
            </div>
            <button onClick={() => setQrTable(null)}
              style={{ marginTop: 20, background: C.text, color: "#fff", border: "none",
                borderRadius: 10, padding: "10px 28px", fontWeight: 800, cursor: "pointer" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── kitchen: payment QR section ── */
function PaymentQrSection({ kitchenId }) {
  const [qr,      setQr]      = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState("");

  useEffect(() => {
    api.getPaymentQr(kitchenId)
      .then((r) => setQr(r.payment_qr || null))
      .catch(() => {});
  }, [kitchenId]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!preview && !qr) return;
    setBusy(true); setMsg("");
    try {
      await api.setPaymentQr(kitchenId, preview || "");
      setQr(preview || null);
      setPreview(null);
      setMsg(preview ? "Saved!" : "Removed");
    } catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true); setMsg("");
    try { await api.setPaymentQr(kitchenId, ""); setQr(null); setPreview(null); setMsg("Removed"); }
    catch (e) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const shown = preview || qr;

  return (
    <div style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 14, border: `1px solid ${C.line}` }}>
      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4, display: "flex",
        alignItems: "center", gap: 7 }}>
        <QrCode size={15} color={C.primary} /> Payment QR
      </div>
      <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 12 }}>
        Upload your UPI / PhonePe / GPay QR so customers can scan &amp; pay
      </div>
      {shown && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <img src={shown} alt="Payment QR"
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 10,
              border: `1px solid ${C.line}` }} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "9px", background: C.panel, border: `1.5px dashed ${C.line}`,
          borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
          {shown ? "Change image" : "Upload QR image"}
        </label>
        {shown && (
          <button onClick={save} disabled={busy || !preview}
            style={{ padding: "9px 16px", background: preview ? C.primary : C.panel,
              color: preview ? "#fff" : C.sub, border: "none", borderRadius: 10,
              fontWeight: 700, fontSize: 13, cursor: preview && !busy ? "pointer" : "default" }}>
            {busy ? "…" : "Save"}
          </button>
        )}
        {qr && (
          <button onClick={remove} disabled={busy}
            style={{ padding: "9px 12px", background: "#FFF0F0", color: C.red,
              border: "none", borderRadius: 10, fontSize: 13, cursor: "pointer" }}>
            Remove
          </button>
        )}
      </div>
      {!shown && (
        <button onClick={save} disabled={busy || !preview}
          style={{ width: "100%", marginTop: 8, padding: "9px",
            background: preview ? C.primary : C.panel, color: preview ? "#fff" : C.sub,
            border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13,
            cursor: preview && !busy ? "pointer" : "default" }}>
          {busy ? "Saving…" : "Save QR"}
        </button>
      )}
      {msg && <div style={{ marginTop: 8, fontSize: 12.5, color: C.sub }}>{msg}</div>}
    </div>
  );
}

/* ── kitchen: offers tab (promo codes + opening hours) ── */
function KitchenOffers({ kitchenId }) {
  const [promos,  setPromos]  = useState(null);
  const [hours,   setHours]   = useState(null);
  const [code,    setCode]    = useState("");
  const [type,    setType]    = useState("flat");
  const [value,   setValue]   = useState("");
  const [minOrd,  setMinOrd]  = useState("");
  const [busy,    setBusy]    = useState(false);
  const [hBusy,   setHBusy]   = useState(false);
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const loadPromos = () =>
    api.listPromos(kitchenId).then(setPromos).catch(() => setPromos([]));

  const loadHours = () =>
    api.getHours(kitchenId).then((rows) => {
      const map = Object.fromEntries(rows.map((r) => [r.day, r]));
      setHours(DAYS.map((_, i) => ({
        day: i,
        open:   map[i]?.open   || "09:00",
        close:  map[i]?.close  || "22:00",
        closed: map[i]?.closed ?? false,
      })));
    }).catch(() => {
      setHours(DAYS.map((_, i) => ({ day: i, open: "09:00", close: "22:00", closed: false })));
    });

  useEffect(() => { loadPromos(); loadHours(); }, []);

  const createPromo = async () => {
    if (!code.trim() || !value) return;
    setBusy(true);
    try {
      await api.createPromo(kitchenId, {
        code: code.trim().toUpperCase(),
        type,
        value: parseInt(value),
        min_order: parseInt(minOrd) || 0,
        max_uses: null,
      });
      setCode(""); setValue(""); setMinOrd("");
      loadPromos();
    } catch (e) { alert(e.message); } finally { setBusy(false); }
  };

  const saveHours = async () => {
    setHBusy(true);
    try {
      await api.setHours(kitchenId, hours);
    } catch (e) { alert(e.message); } finally { setHBusy(false); }
  };

  const updateDay = (i, field, val) =>
    setHours((h) => h.map((d, idx) => idx === i ? { ...d, [field]: val } : d));

  const inp = { border: `1.5px solid ${C.line}`, borderRadius: 9, padding: "9px 10px",
    fontSize: 13.5, outline: "none", width: "100%", boxSizing: "border-box",
    fontFamily: "inherit" };

  return (
    <div style={{ padding: 14 }}>
      {/* promo codes */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, marginBottom: 12, border: `1px solid ${C.line}` }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, display: "flex",
          alignItems: "center", gap: 7 }}>
          <Tag size={15} color={C.primary} /> Promo codes
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>CODE</div>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FIRST50" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>TYPE</div>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inp}>
              <option value="flat">Flat ₹ off</option>
              <option value="percent">% off</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>
              {type === "flat" ? "AMOUNT (₹)" : "PERCENT (%)"}
            </div>
            <input value={value} inputMode="numeric"
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
              placeholder="50" style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 4 }}>MIN ORDER (₹)</div>
            <input value={minOrd} inputMode="numeric"
              onChange={(e) => setMinOrd(e.target.value.replace(/\D/g, ""))}
              placeholder="0" style={inp} />
          </div>
        </div>
        <button onClick={createPromo} disabled={busy || !code.trim() || !value}
          style={{ width: "100%", background: busy || !code.trim() || !value ? C.sub : C.primary,
            color: "#fff", border: "none", borderRadius: 10, padding: 11,
            fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          {busy ? "Creating…" : "+ Create promo"}
        </button>

        {promos && promos.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.sub, marginBottom: 8 }}>ACTIVE CODES</div>
            {promos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center",
                justifyContent: "space-between", padding: "9px 0",
                borderBottom: `1px solid ${C.line}` }}>
                <div>
                  <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 14 }}>{p.code}</span>
                  <span style={{ fontSize: 12, color: C.sub, marginLeft: 8 }}>
                    {p.type === "flat" ? `₹${p.value} off` : `${p.value}% off`}
                    {p.min_order > 0 && ` · min ₹${p.min_order}`}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: C.sub }}>{p.used_count} used</span>
                  <button onClick={async () => { await api.deletePromo(kitchenId, p.id); loadPromos(); }}
                    style={{ background: "none", border: "none", cursor: "pointer",
                      color: C.red, display: "flex", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {promos && promos.length === 0 && (
          <div style={{ textAlign: "center", color: C.sub, fontSize: 13, marginTop: 12 }}>
            No promo codes yet
          </div>
        )}
      </div>

      {/* payment QR */}
      <PaymentQrSection kitchenId={kitchenId} />

      {/* opening hours */}
      <div style={{ background: C.card, borderRadius: 18, padding: 16, border: `1px solid ${C.line}` }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, display: "flex",
          alignItems: "center", gap: 7 }}>
          <Clock size={15} color={C.primary} /> Opening hours
        </div>
        {!hours && <div style={{ color: C.sub, fontSize: 13 }}>Loading…</div>}
        {hours && hours.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8,
            padding: "8px 0", borderBottom: i < 6 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ width: 36, fontSize: 13, fontWeight: 700,
              color: d.closed ? C.sub : C.text }}>{DAYS[i]}</div>
            <label style={{ display: "flex", alignItems: "center", gap: 5,
              fontSize: 12.5, cursor: "pointer", minWidth: 52 }}>
              <input type="checkbox" checked={!d.closed}
                onChange={(e) => updateDay(i, "closed", !e.target.checked)} />
              <span style={{ color: d.closed ? C.sub : C.text }}>Open</span>
            </label>
            {!d.closed && (
              <>
                <input type="time" value={d.open}
                  onChange={(e) => updateDay(i, "open", e.target.value)}
                  style={{ border: `1px solid ${C.line}`, borderRadius: 7,
                    padding: "4px 7px", fontSize: 12.5, outline: "none" }} />
                <span style={{ color: C.sub, fontSize: 12 }}>–</span>
                <input type="time" value={d.close}
                  onChange={(e) => updateDay(i, "close", e.target.value)}
                  style={{ border: `1px solid ${C.line}`, borderRadius: 7,
                    padding: "4px 7px", fontSize: 12.5, outline: "none" }} />
              </>
            )}
          </div>
        ))}
        <button onClick={saveHours} disabled={hBusy || !hours}
          style={{ width: "100%", marginTop: 14,
            background: hBusy || !hours ? C.sub : C.text,
            color: "#fff", border: "none", borderRadius: 10, padding: 11,
            fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          {hBusy ? "Saving…" : "Save hours"}
        </button>
      </div>
    </div>
  );
}
