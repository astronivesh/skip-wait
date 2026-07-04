import React, { useState, useEffect } from "react";
import { Store, Users, CreditCard, LogOut, Plus, X, TrendingUp, ShoppingBag, Trash2, Ban, ChevronDown, ChevronUp } from "lucide-react";
import { api, getToken, getRole, setSession, clearSession } from "./api.js";

const C = {
  primary: "#B03526", primarySoft: "#F8E4DE", primaryBorder: "#EBC2B7",
  red: "#B03526", rating: "#3E7C4F",
  text: "#2B1E16", sub: "rgba(43,30,22,.6)", line: "rgba(43,30,22,.1)",
  bg: "#FBF4EA", card: "#FFFBF4", panel: "#F0E6D6",
};
const SANS    = `'Schibsted Grotesk',system-ui,-apple-system,sans-serif`;
const DISPLAY = `'Bricolage Grotesque',system-ui,sans-serif`;
const MONO    = `ui-monospace,"SF Mono",Menlo,monospace`;

const shell = {
  maxWidth: 480, margin: "0 auto", background: C.bg, minHeight: "100vh",
  borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}`,
};
const Note = ({ children }) => (
  <div style={{ padding: "20px 16px", color: C.sub, fontSize: 13.5 }}>{children}</div>
);

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken() && getRole() === "admin");
  const [err,    setErr]    = useState("");

  const logout = () => { clearSession(); setAuthed(false); };

  // If somehow a non-admin token is in storage, clear it
  if (getToken() && getRole() !== "admin" && authed) logout();

  return (
    <div style={{ fontFamily: SANS, color: C.text, ...shell }}>
      {authed ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", background: C.text, color: C.card }}>
            <div>
              <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 17, letterSpacing: "-.02em" }}>
                skip<span style={{ color: C.primary }}>·</span>wait
              </div>
              <div style={{ fontSize: 11, opacity: .6, marginTop: 1, letterSpacing: ".5px" }}>
                SUPER ADMIN PORTAL
              </div>
            </div>
            <button onClick={logout} title="Log out"
              style={{ cursor: "pointer", border: "none", background: "rgba(255,255,255,.1)",
                color: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                borderRadius: 8, fontSize: 12.5 }}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
          <AdminDashboard />
        </>
      ) : (
        <AdminLogin onLogin={() => setAuthed(true)} globalErr={err} setGlobalErr={setErr} />
      )}
    </div>
  );
}

/* ── admin login ── */
function AdminLogin({ onLogin }) {
  const [phone,  setPhone]  = useState("");
  const [pw,     setPw]     = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState("");

  const login = async () => {
    if (phone.length < 10) return setErr("Enter your 10-digit mobile number");
    if (!pw)               return setErr("Enter your password");
    setBusy(true); setErr("");
    try {
      const r = await api.adminPasswordLogin(phone, pw);
      if (r.role !== "admin") { setErr("Not an admin account."); clearSession(); return; }
      setSession(r.token, r.role);
      onLogin();
    }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const onKey = (e) => { if (e.key === "Enter") login(); };

  return (
    <div style={{ padding: "60px 28px" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em",
        color: C.text }}>
        skip<span style={{ color: C.primary }}>·</span>wait
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, letterSpacing: "1px", color: C.sub,
          marginLeft: 10, verticalAlign: "middle", textTransform: "uppercase" }}>Admin</span>
      </div>
      <div style={{ color: C.sub, marginTop: 6, fontSize: 13.5 }}>Admin portal — sign in to continue</div>

      <div style={{ marginTop: 40 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Mobile number</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${C.line}`,
          borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
          <span style={{ color: C.sub, fontFamily: MONO }}>+91</span>
          <input value={phone} inputMode="numeric" placeholder="9876543210" onKeyDown={onKey}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            style={{ border: "none", outline: "none", fontSize: 16, flex: 1, fontFamily: MONO }} />
        </div>

        <label style={{ fontSize: 13, fontWeight: 700, color: C.sub, display: "block", marginTop: 16 }}>
          Password
        </label>
        <div style={{ display: "flex", alignItems: "center", border: `1.5px solid ${C.line}`,
          borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
          <input value={pw} type={showPw ? "text" : "password"} placeholder="••••••••"
            onKeyDown={onKey}
            onChange={(e) => setPw(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 15, flex: 1 }} />
          <button onClick={() => setShowPw((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.sub,
              fontSize: 12, padding: "0 4px" }}>
            {showPw ? "Hide" : "Show"}
          </button>
        </div>

        <button onClick={login} disabled={busy}
          style={{ width: "100%", marginTop: 24, background: busy ? C.sub : C.text, color: C.card,
            border: "none", borderRadius: 999, padding: "15px", fontWeight: 800, fontSize: 15,
            cursor: busy ? "default" : "pointer", boxShadow: "0 8px 24px -8px rgba(43,30,22,.3)" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>

        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12, fontWeight: 600 }}>{err}</div>}
      </div>
    </div>
  );
}

/* ── admin dashboard ── */
function AdminDashboard() {
  const [tab,             setTab]             = useState("stats");
  const [kitchens,        setKitchens]        = useState(null);
  const [users,           setUsers]           = useState(null);
  const [orders,          setOrders]          = useState(null);
  const [stats,           setStats]           = useState(null);
  const [topupAmt,        setTopupAmt]        = useState({});
  const [busy,            setBusy]            = useState({});
  const [msg,             setMsg]             = useState("");
  const [creatingKitchen, setCreatingKitchen] = useState(false);
  const [expandedUser,    setExpandedUser]    = useState(null);
  const [userOrders,      setUserOrders]      = useState({});
  const [orderSearch,     setOrderSearch]     = useState("");

  const loadKitchens = () => api.adminKitchens().then(setKitchens).catch((e) => setMsg(e.message));
  const loadUsers    = () => api.adminUsers().then(setUsers).catch((e) => setMsg(e.message));
  const loadStats    = () => api.adminStats().then(setStats).catch((e) => setMsg(e.message));
  const loadOrders   = () => api.adminOrders().then(setOrders).catch((e) => setMsg(e.message));
  useEffect(() => { loadKitchens(); loadUsers(); loadStats(); }, []);
  useEffect(() => { if (tab === "orders") loadOrders(); }, [tab]);

  const topup = async (kid) => {
    const amt = parseInt(topupAmt[kid] || "0", 10);
    if (!amt || amt <= 0) return;
    setBusy((b) => ({ ...b, [kid]: true }));
    try {
      const k = await api.adminTopup(kid, amt);
      setMsg(`Topped up ₹${amt} → ${k.id} (new balance ₹${k.credit_balance})`);
      setTopupAmt((a) => ({ ...a, [kid]: "" }));
      loadKitchens();
    } catch (e) { setMsg(e.message); }
    finally { setBusy((b) => ({ ...b, [kid]: false })); }
  };

  const deleteKitchen = async (kid, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [kid]: true }));
    try { await api.adminDeleteKitchen(kid); setMsg(`"${name}" deleted`); loadKitchens(); loadUsers(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy((b) => ({ ...b, [kid]: false })); }
  };

  const setRole = async (phone, role) => {
    setBusy((b) => ({ ...b, [phone]: true }));
    try { await api.adminSetRole(phone, role); setMsg(`${phone} → ${role}`); loadUsers(); }
    catch (e) { setMsg(e.message); }
    finally { setBusy((b) => ({ ...b, [phone]: false })); }
  };

  const assignKitchen = async (phone, kitchen_id) => {
    try {
      await api.adminAssignKitchen(phone, kitchen_id || null);
      setMsg(`${phone} → ${kitchens?.find((k) => k.id === kitchen_id)?.name || "unassigned"}`);
      loadUsers();
    } catch (e) { setMsg(e.message); }
  };

  const toggleBan = async (phone, currently_banned) => {
    setBusy((b) => ({ ...b, [phone]: true }));
    try {
      await api.adminBanUser(phone, !currently_banned);
      setMsg(`${phone} ${!currently_banned ? "banned" : "unbanned"}`);
      loadUsers();
    } catch (e) { setMsg(e.message); }
    finally { setBusy((b) => ({ ...b, [phone]: false })); }
  };

  const toggleUserOrders = async (phone) => {
    if (expandedUser === phone) { setExpandedUser(null); return; }
    setExpandedUser(phone);
    if (!userOrders[phone]) {
      try {
        const o = await api.adminUserOrders(phone);
        setUserOrders((prev) => ({ ...prev, [phone]: o }));
      } catch (e) { setMsg(e.message); }
    }
  };

  const createKitchen = async (data) => {
    try {
      await api.adminCreateKitchen(data);
      setMsg(`Kitchen "${data.name}" created`);
      setCreatingKitchen(false);
      loadKitchens();
    } catch (e) { setMsg(e.message); }
  };

  const TAB = (id, label, Icon) => (
    <button onClick={() => setTab(id)}
      style={{ flex: 1, cursor: "pointer", border: "none", padding: "11px 0", fontWeight: 700,
        fontSize: 12, borderBottom: `2.5px solid ${tab === id ? C.primary : "transparent"}`,
        background: "transparent", color: tab === id ? C.primary : C.sub, display: "flex",
        alignItems: "center", justifyContent: "center", gap: 5 }}>
      <Icon size={13} /> {label}
    </button>
  );

  const statusColor = (s, cancelled) => cancelled ? C.sub : s === "done" ? C.rating : C.primary;
  const fmt = (iso) => iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—";

  return (
    <div style={{ background: C.bg, minHeight: "calc(100vh - 53px)" }}>
      <div style={{ background: C.card, borderBottom: `1px solid ${C.line}`,
        display: "flex", padding: "0 8px" }}>
        {TAB("stats",    "Stats",    TrendingUp)}
        {TAB("kitchens", "Kitchens", Store)}
        {TAB("orders",   "Orders",   ShoppingBag)}
        {TAB("users",    "Users",    Users)}
      </div>

      {msg && (
        <div style={{ margin: "10px 14px 0", padding: "10px 14px", borderRadius: 10,
          background: C.primarySoft, color: C.primary, fontSize: 13, fontWeight: 600,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {msg}
          <button onClick={() => setMsg("")}
            style={{ background: "none", border: "none", color: C.primary, cursor: "pointer",
              fontSize: 16, lineHeight: 1 }}>×</button>
        </div>
      )}

      {/* ── stats ── */}
      {tab === "stats" && (
        <div style={{ padding: 14 }}>
          {!stats && <Note>Loading…</Note>}
          {stats && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                {[
                  { label: "Orders today",    value: stats.orders_today },
                  { label: "Revenue today",   value: `₹${stats.revenue_today}` },
                  { label: "Orders (7 days)", value: stats.orders_week },
                  { label: "Revenue (7 days)",value: `₹${stats.revenue_week}` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: C.card, borderRadius: 18, padding: "14px 16px",
                    border: `1px solid ${C.line}` }}>
                    <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700, marginBottom: 6 }}>
                      {label.toUpperCase()}
                    </div>
                    <div style={{ fontFamily: MONO, fontWeight: 900, fontSize: 22 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 800, color: C.sub,
                letterSpacing: "1px", marginBottom: 8 }}>PER KITCHEN</div>
              {stats.kitchens.map((k) => (
                <div key={k.id} style={{ background: C.card, borderRadius: 18, padding: 16,
                  marginBottom: 10, border: `1px solid ${C.line}` }}>
                  <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{k.name}</div>
                  <div style={{ fontSize: 11.5, color: k.is_open ? C.rating : C.sub, marginBottom: 10 }}>
                    {k.is_open ? "Open" : "Closed"} · ₹{k.credit_balance} credits
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      ["Today orders",  k.orders_today],
                      ["Today revenue", `₹${k.revenue_today}`],
                      ["Week orders",   k.orders_week],
                      ["Week revenue",  `₹${k.revenue_week}`],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: C.panel, borderRadius: 10, padding: "9px 12px" }}>
                        <div style={{ fontSize: 10.5, color: C.sub, fontWeight: 700 }}>{label.toUpperCase()}</div>
                        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 16, marginTop: 3 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── kitchens ── */}
      {tab === "kitchens" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 800, color: C.sub, letterSpacing: "1px" }}>
              {kitchens ? `${kitchens.length} KITCHENS` : "KITCHENS"}
            </div>
            <button onClick={() => setCreatingKitchen(true)}
              style={{ cursor: "pointer", border: "none", background: C.text, color: C.card,
                borderRadius: 999, padding: "7px 14px", fontWeight: 700, fontSize: 12.5,
                display: "flex", alignItems: "center", gap: 5 }}>
              <Plus size={13} /> New kitchen
            </button>
          </div>
          {!kitchens && <Note>Loading…</Note>}
          {kitchens && kitchens.map((k) => (
            <div key={k.id} style={{ background: C.card, borderRadius: 18, padding: 16,
              marginBottom: 10, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15 }}>{k.name}</div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{k.tag}</div>
                  {k.owner_phone && (
                    <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3, fontFamily: MONO }}>
                      Owner: {k.owner_phone}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 20,
                    color: k.credit_balance < 20 ? C.red : C.rating }}>
                    ₹{k.credit_balance}
                  </div>
                  <button onClick={() => deleteKitchen(k.id, k.name)} disabled={busy[k.id]}
                    style={{ cursor: "pointer", border: "none", background: "rgba(176,53,38,.1)",
                      color: C.red, borderRadius: 8, padding: "4px 10px", fontSize: 11,
                      fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={topupAmt[k.id] || ""} inputMode="numeric" placeholder="Top-up amount"
                  onChange={(e) => setTopupAmt((a) => ({ ...a, [k.id]: e.target.value.replace(/\D/g, "") }))}
                  style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 10,
                    padding: "9px 12px", fontFamily: MONO, fontSize: 14, outline: "none",
                    background: C.bg }} />
                <button onClick={() => topup(k.id)} disabled={busy[k.id]}
                  style={{ cursor: busy[k.id] ? "default" : "pointer", border: "none",
                    background: busy[k.id] ? C.sub : C.primary, color: "#fff", borderRadius: 10,
                    padding: "9px 16px", fontWeight: 800, fontSize: 13, display: "flex",
                    alignItems: "center", gap: 5 }}>
                  <CreditCard size={14} /> {busy[k.id] ? "…" : "Top up"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── all orders ── */}
      {tab === "orders" && (
        <div style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card,
            borderRadius: 10, padding: "8px 12px", marginBottom: 12,
            border: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 13 }}>🔍</span>
            <input value={orderSearch} placeholder="Search by phone or kitchen…"
              onChange={(e) => setOrderSearch(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, background: "transparent" }} />
          </div>
          {!orders && <Note>Loading…</Note>}
          {orders && (() => {
            const q = orderSearch.trim().toLowerCase();
            const filtered = q
              ? orders.filter((o) => o.customer_phone?.includes(q) || o.kitchen_name?.toLowerCase().includes(q))
              : orders;
            return filtered.length === 0
              ? <Note>No orders found.</Note>
              : filtered.map((o) => (
                <div key={o.id} style={{ background: C.card, borderRadius: 16, padding: "12px 14px",
                  marginBottom: 8, border: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{o.id}</div>
                      <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                        {o.kitchen_name} · {o.mode}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: C.sub, marginTop: 1 }}>
                        {o.customer_phone}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 15 }}>₹{o.total}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3,
                        color: statusColor(o.status, o.cancelled) }}>
                        {o.cancelled ? "CANCELLED" : o.status?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: C.sub, marginTop: 6 }}>{fmt(o.created_at)}</div>
                </div>
              ));
          })()}
        </div>
      )}

      {/* ── users ── */}
      {tab === "users" && (
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontFamily: MONO, fontWeight: 800, color: C.sub,
            letterSpacing: "1px", marginBottom: 12 }}>
            {users ? `${users.length} USERS` : "USERS"}
          </div>
          {!users && <Note>Loading…</Note>}
          {users && users.map((u) => (
            <div key={u.phone} style={{ background: u.is_banned ? "rgba(176,53,38,.04)" : C.card,
              borderRadius: 18, padding: "12px 14px", marginBottom: 8,
              border: `1px solid ${u.is_banned ? C.primaryBorder : C.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14 }}>{u.phone}</span>
                    {u.is_banned && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: C.primarySoft,
                        color: C.red, borderRadius: 5, padding: "2px 6px" }}>BANNED</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: C.sub, marginTop: 2, textTransform: "capitalize" }}>
                    {u.role}{u.kitchen_id ? ` · ${kitchens?.find((k) => k.id === u.kitchen_id)?.name || u.kitchen_id}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {["customer","kitchen","admin"].map((r) => (
                    <button key={r} onClick={() => setRole(u.phone, r)}
                      disabled={busy[u.phone] || u.role === r}
                      style={{ cursor: u.role === r ? "default" : "pointer", border: "none",
                        borderRadius: 8, padding: "4px 8px", fontSize: 10.5, fontWeight: 700,
                        background: u.role === r ? C.text : C.panel,
                        color: u.role === r ? C.card : C.sub }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {u.role === "kitchen" && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <Store size={13} style={{ color: C.sub, flexShrink: 0 }} />
                  <select value={u.kitchen_id || ""} disabled={busy[u.phone]}
                    onChange={(e) => assignKitchen(u.phone, e.target.value)}
                    style={{ flex: 1, border: `1.5px solid ${C.line}`, borderRadius: 8,
                      padding: "7px 10px", fontSize: 13, outline: "none", cursor: "pointer",
                      background: C.bg, color: u.kitchen_id ? C.text : C.sub }}>
                    <option value="">— assign a kitchen —</option>
                    {(kitchens || []).map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button onClick={() => toggleBan(u.phone, u.is_banned)} disabled={busy[u.phone]}
                  style={{ cursor: "pointer", border: `1.5px solid ${u.is_banned ? C.rating : C.red}`,
                    background: "transparent", color: u.is_banned ? C.rating : C.red,
                    borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4 }}>
                  <Ban size={12} /> {u.is_banned ? "Unban" : "Ban"}
                </button>
                <button onClick={() => toggleUserOrders(u.phone)}
                  style={{ cursor: "pointer", border: `1.5px solid ${C.line}`,
                    background: "transparent", color: C.sub,
                    borderRadius: 8, padding: "5px 10px", fontSize: 11.5, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 4 }}>
                  <ShoppingBag size={12} /> Orders
                  {expandedUser === u.phone ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
              </div>

              {expandedUser === u.phone && (
                <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
                  {!userOrders[u.phone] && <div style={{ fontSize: 12, color: C.sub }}>Loading…</div>}
                  {userOrders[u.phone]?.length === 0 && (
                    <div style={{ fontSize: 12, color: C.sub }}>No orders yet.</div>
                  )}
                  {userOrders[u.phone]?.map((o) => (
                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.kitchen_name}</div>
                        <div style={{ fontSize: 11, color: C.sub }}>{fmt(o.created_at)} · {o.mode}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>₹{o.total}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 700,
                          color: statusColor(o.status, o.cancelled) }}>
                          {o.cancelled ? "CANCELLED" : o.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creatingKitchen && (
        <CreateKitchenModal onSave={createKitchen} onClose={() => setCreatingKitchen(false)} />
      )}
    </div>
  );
}

/* ── create kitchen modal ── */
function CreateKitchenModal({ onSave, onClose }) {
  const [name,  setName]  = useState("");
  const [tag,   setTag]   = useState("");
  const [id,    setId]    = useState("");
  const [busy,  setBusy]  = useState(false);
  const [err,   setErr]   = useState("");

  const submit = async () => {
    if (!name.trim()) return setErr("Name is required");
    setBusy(true); setErr("");
    try {
      await onSave({ name: name.trim(), tag: tag.trim(), id: id.trim() || undefined });
    } catch (e) { setErr(e.message); setBusy(false); }
  };

  const lbl = { fontSize: 12, fontWeight: 700, color: C.sub, marginBottom: 5, display: "block" };
  const inp = {
    width: "100%", border: `1.5px solid ${C.line}`, borderRadius: 10,
    padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: SANS, marginBottom: 14,
  };

  return (
    <>
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 40 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, background: "#fff", borderRadius: "20px 20px 0 0",
        padding: "22px 20px 36px", zIndex: 50, boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>New kitchen</div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.sub }}>
            <X size={20} />
          </button>
        </div>

        <label style={lbl}>Kitchen name *</label>
        <input value={name} placeholder="Pink City Roti" onChange={(e) => setName(e.target.value)}
          style={inp} />

        <label style={lbl}>Tag line</label>
        <input value={tag} placeholder="North Indian · Rajasthani" onChange={(e) => setTag(e.target.value)}
          style={inp} />

        <label style={lbl}>Kitchen ID (optional — auto-generated if blank)</label>
        <input value={id} placeholder="e.g. k4" onChange={(e) => setId(e.target.value.replace(/\s/g, ""))}
          style={{ ...inp, fontFamily: MONO }} />

        {err && <div style={{ color: C.red, fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{err}</div>}

        <button onClick={submit} disabled={busy}
          style={{ width: "100%", background: busy ? C.sub : C.text, color: C.card,
            border: "none", borderRadius: 999, padding: "14px", fontWeight: 800, fontSize: 15,
            cursor: busy ? "default" : "pointer" }}>
          {busy ? "Creating…" : "Create kitchen"}
        </button>
      </div>
    </>
  );
}
