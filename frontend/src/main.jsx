import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import AdminApp from "./AdminApp.jsx";
import PrivacyPolicy from "./PrivacyPolicy.jsx";

const path = window.location.pathname;
const isAdmin      = path.startsWith("/admin");
const isPrivacy    = path.startsWith("/privacy");
const tableMatch   = path.match(/^\/t\/([^/]+)/);
const kitchenMatch = path.match(/^\/k\/([^/]+)/);
const orderMatch   = path.match(/^\/order\/([^/]+)/);
const tableToken   = tableMatch   ? tableMatch[1]   : null;
const kitchenSlug  = kitchenMatch ? kitchenMatch[1] : null;
const sharedOrder  = orderMatch   ? orderMatch[1]   : null;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  );
}

createRoot(document.getElementById("root")).render(
  isAdmin   ? <AdminApp />
  : isPrivacy ? <PrivacyPolicy />
  : <App tableToken={tableToken} kitchenSlug={kitchenSlug} sharedOrderId={sharedOrder} />
);
