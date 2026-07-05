export const API = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : "http://localhost:8000";

const tokenKey   = "sw_token";
const roleKey    = "sw_role";
const kitchenKey = "sw_kitchen_id";
const phoneKey   = "sw_phone";

export const getToken     = () => localStorage.getItem(tokenKey);
export const getRole      = () => localStorage.getItem(roleKey);
export const getKitchenId = () => localStorage.getItem(kitchenKey);
export const getPhone     = () => localStorage.getItem(phoneKey) || "";
export const setPhone     = (p) => localStorage.setItem(phoneKey, p);
export const setSession   = (token, role, kitchenId) => {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(roleKey, role);
  if (kitchenId) localStorage.setItem(kitchenKey, kitchenId);
  else localStorage.removeItem(kitchenKey);
};
export const clearSession = () => {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(roleKey);
  localStorage.removeItem(kitchenKey);
  localStorage.removeItem(phoneKey);
};

async function req(method, path, body, auth) {
  const headers = { "Content-Type": "application/json" };
  if (auth && getToken()) headers.Authorization = "Bearer " + getToken();
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Cannot reach server (${API}). Check your internet connection.`);
  }
  if (!res.ok) {
    let msg = "Request failed";
    try { msg = (await res.json()).detail || msg; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  // auth
  requestOtp:         (phone)           => req("POST", "/auth/request-otp",    { phone }),
  verifyOtp:          (phone, code)     => req("POST", "/auth/verify-otp",     { phone, code }),
  adminPasswordLogin: (phone, password) => req("POST", "/auth/password-login", { phone, password }),
  passwordLogin:      (phone, password) => req("POST", "/auth/password-login", { phone, password }),
  setMyPassword:      (password)        => req("PATCH", "/me/password",         { password }, true),
  adminSetUserPassword: (phone, password) => req("PATCH", `/admin/users/${phone}/set-password`, { password }, true),

  // kitchen self-registration
  registerKitchen: (data) => req("POST", "/kitchens/register", data, true),

  // public catalogue
  kitchens:      ()    => req("GET", "/kitchens"),
  menu:          (kid) => req("GET", `/kitchens/${kid}/menu`),
  categories:    (kid) => req("GET", `/kitchens/${kid}/categories`),
  resolveTable:   (tok) => req("GET", `/t/${tok}`),
  resolveKitchen: (kid) => req("GET", `/k/${kid}`),

  // orders
  createOrder: (payload) => req("POST", "/orders", payload, true),
  getOrder:    (oid)     => req("GET", `/orders/${oid}`),

  // kitchen — orders
  kitchenOrders:    (kid) => req("GET", `/kitchens/${kid}/orders`),
  kitchenAnalytics: (kid) => req("GET", `/kitchens/${kid}/analytics`, undefined, true),
  advance:       (oid, otp) => req("POST", `/orders/${oid}/advance`, { otp: otp || null }),
  assignRider:   (oid, name, veh) => req("PATCH", `/orders/${oid}/rider`, { name, veh }),
  rateOrder:     (oid, rating)   => req("POST",  `/orders/${oid}/rate`,   { rating }, true),
  cancelOrder:   (oid)           => req("POST",  `/orders/${oid}/cancel`,  undefined, true),
  rejectOrder:   (oid)           => req("POST",  `/orders/${oid}/reject`,  undefined, true),

  // saved addresses
  listAddresses:  ()         => req("GET",    "/me/addresses",        undefined,        true),
  addAddress:     (label, address) => req("POST", "/me/addresses",   { label, address }, true),
  deleteAddress:  (aid)      => req("DELETE", `/me/addresses/${aid}`, undefined,        true),

  // kitchen — menu CRUD
  addMenuItem:    (kid, data) => req("POST",   `/kitchens/${kid}/menu`,         data, true),
  editMenuItem:   (kid, iid, data) => req("PATCH", `/kitchens/${kid}/menu/${iid}`, data, true),
  deleteMenuItem: (kid, iid) => req("DELETE", `/kitchens/${kid}/menu/${iid}`,    undefined, true),

  // kitchen — categories
  addCategory:    (kid, data) => req("POST",   `/kitchens/${kid}/categories`,         data, true),
  editCategory:   (kid, cid, data) => req("PATCH", `/kitchens/${kid}/categories/${cid}`, data, true),
  deleteCategory: (kid, cid) => req("DELETE", `/kitchens/${kid}/categories/${cid}`,    undefined, true),

  // customer
  myOrders: () => req("GET", "/me/orders", undefined, true),

  // kitchen — profile
  editKitchenProfile:  (kid, data)           => req("PATCH", `/kitchens/${kid}/profile`,           data,            true),
  setKitchenOpen:      (kid, is_open)        => req("PATCH", `/kitchens/${kid}/status`,            { is_open },     true),
  setItemAvailable:    (kid, iid, available) => req("PATCH", `/kitchens/${kid}/menu/${iid}/available`, { available }, true),

  // variants
  addVariant:    (kid, iid, data)      => req("POST",   `/kitchens/${kid}/menu/${iid}/variants`,       data,      true),
  deleteVariant: (kid, iid, vid)       => req("DELETE", `/kitchens/${kid}/menu/${iid}/variants/${vid}`, undefined, true),

  // promos
  validatePromo: (code, kitchen_id, food_total) => req("POST", "/promos/validate", { code, kitchen_id, food_total }),
  listPromos:   (kid)        => req("GET",    `/kitchens/${kid}/promos`,        undefined, true),
  createPromo:  (kid, data)  => req("POST",   `/kitchens/${kid}/promos`,        data,      true),
  deletePromo:  (kid, pid)   => req("DELETE", `/kitchens/${kid}/promos/${pid}`, undefined, true),

  // hours
  getHours: (kid)          => req("GET", `/kitchens/${kid}/hours`),
  setHours: (kid, schedule) => req("PUT", `/kitchens/${kid}/hours`, { schedule }, true),

  // order history + item removal
  kitchenOrderHistory: (kid, q) => req("GET", `/kitchens/${kid}/orders/history?q=${encodeURIComponent(q || "")}`),
  toggleRemoveItem: (oid, itemId) => req("POST", `/orders/${oid}/items/${itemId}/remove`, undefined, true),

  // bulk menu upload
  bulkMenuUpload: (kid, rows) => req("POST", `/kitchens/${kid}/menu/bulk`, rows, true),

  // payment QR
  setPaymentQr: (kid, data_url) => req("PATCH", `/kitchens/${kid}/payment-qr`, { data_url }, true),
  getPaymentQr: (kid)           => req("GET",   `/kitchens/${kid}/payment-qr`),

  // Porter delivery
  bookPorter:    (oid) => req("POST", `/orders/${oid}/book-porter`,  undefined, true),
  porterStatus:  (oid) => req("GET",  `/orders/${oid}/porter-status`, undefined, true),

  // kitchen — tables
  publicTables: (kid)       => req("GET",    `/kitchens/${kid}/tables/public`),
  listTables:  (kid)        => req("GET",    `/kitchens/${kid}/tables`,        undefined, true),
  addTable:    (kid, label) => req("POST",   `/kitchens/${kid}/tables`,        { label }, true),
  deleteTable: (kid, tid)   => req("DELETE", `/kitchens/${kid}/tables/${tid}`, undefined, true),

  // admin
  adminStats:         ()                   => req("GET",    "/admin/stats",                    undefined,       true),
  adminKitchens:      ()                   => req("GET",    "/admin/kitchens",                 undefined,       true),
  adminTopup:         (kid, amount)        => req("POST",   `/admin/kitchens/${kid}/topup`,    { amount },      true),
  adminDeleteKitchen: (kid)                => req("DELETE", `/admin/kitchens/${kid}`,           undefined,       true),
  adminUsers:         ()                   => req("GET",    "/admin/users",                    undefined,       true),
  adminCreateKitchen: (data)               => req("POST",   "/admin/kitchens",                 data,            true),
  adminSetRole:       (phone, role)        => req("PATCH",  `/admin/users/${phone}/role`,      { role },        true),
  adminAssignKitchen: (phone, kitchen_id)  => req("PATCH",  `/admin/users/${phone}/kitchen`,   { kitchen_id },  true),
  adminBanUser:       (phone, banned)      => req("PATCH",  `/admin/users/${phone}/ban`,       { banned },      true),
  adminOrders:        ()                   => req("GET",    "/admin/orders",                   undefined,       true),
  adminUserOrders:    (phone)              => req("GET",    `/admin/users/${phone}/orders`,    undefined,       true),
};
