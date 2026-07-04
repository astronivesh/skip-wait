import React from "react";

const DISPLAY = "'Bricolage Grotesque',system-ui,sans-serif";
const SANS    = "'Schibsted Grotesk',system-ui,sans-serif";
const PRIMARY = "#B03526";
const INK     = "#2B1E16";
const SUB     = "rgba(43,30,22,.6)";

export default function PrivacyPolicy() {
  const s = {
    page: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px",
      fontFamily: SANS, color: INK, lineHeight: 1.7, background: "#FBF4EA", minHeight: "100vh" },
    logo: { fontFamily: DISPLAY, fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", marginBottom: 32,
      display: "block", textDecoration: "none", color: INK },
    h1:   { fontFamily: DISPLAY, fontSize: 30, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" },
    date: { fontSize: 13, color: SUB, marginBottom: 36 },
    h2:   { fontFamily: DISPLAY, fontSize: 18, fontWeight: 800, marginTop: 32, marginBottom: 8, letterSpacing: "-0.01em" },
    p:    { fontSize: 15, marginBottom: 12, color: INK },
    ul:   { paddingLeft: 20, color: INK, fontSize: 15 },
    li:   { marginBottom: 6 },
    back: { display: "inline-block", marginTop: 40, fontSize: 14, color: SUB,
      textDecoration: "none", borderBottom: `1px solid rgba(43,30,22,.2)` },
  };

  return (
    <div style={s.page}>
      <a href="/" style={s.logo}>
        skip<span style={{ color: PRIMARY }}>·</span>wait
      </a>

      <h1 style={s.h1}>Privacy Policy</h1>
      <p style={s.date}>Effective date: 1 July 2026</p>

      <h2 style={s.h2}>1. Who we are</h2>
      <p style={s.p}>
        Skip Wait is a food-ordering platform that connects customers directly with local
        restaurants, eliminating third-party platform fees. We are operated by Skip Wait
        Technologies ("we", "us", "our").
      </p>

      <h2 style={s.h2}>2. Information we collect</h2>
      <ul style={s.ul}>
        <li style={s.li}><b>Mobile number</b> — used for OTP authentication and order updates.</li>
        <li style={s.li}><b>Delivery address</b> — collected only when you choose delivery.</li>
        <li style={s.li}><b>Order details</b> — items, amounts, timestamps, and order status.</li>
        <li style={s.li}><b>Device data</b> — browser type and approximate location (if you grant permission) to show nearby restaurants.</li>
      </ul>

      <h2 style={s.h2}>3. How we use your information</h2>
      <ul style={s.ul}>
        <li style={s.li}>To fulfil and track your food orders.</li>
        <li style={s.li}>To send you OTPs and order status notifications via SMS.</li>
        <li style={s.li}>To help restaurants manage their operations.</li>
        <li style={s.li}>To improve our platform and prevent abuse.</li>
      </ul>

      <h2 style={s.h2}>4. Sharing of information</h2>
      <p style={s.p}>
        We share your mobile number and delivery address with the restaurant fulfilling
        your order, and with the delivery partner (Porter) when delivery is booked.
        We do not sell your personal data to advertisers or data brokers.
      </p>

      <h2 style={s.h2}>5. Data retention</h2>
      <p style={s.p}>
        Order records are retained for up to 3 years for accounting and dispute resolution.
        You can request deletion of your account and data by contacting us.
      </p>

      <h2 style={s.h2}>6. Cookies &amp; local storage</h2>
      <p style={s.p}>
        We use browser local storage to remember your login session and cart. No
        third-party advertising cookies are used.
      </p>

      <h2 style={s.h2}>7. Security</h2>
      <p style={s.p}>
        Authentication tokens are stored only in your browser. Passwords are hashed
        server-side. We use HTTPS for all data in transit.
      </p>

      <h2 style={s.h2}>8. Your rights</h2>
      <p style={s.p}>
        You may request access to, correction of, or deletion of your personal data at
        any time by contacting us at the address below. We will respond within 30 days.
      </p>

      <h2 style={s.h2}>9. Changes to this policy</h2>
      <p style={s.p}>
        We may update this policy periodically. Material changes will be communicated
        via SMS or a notice on the app.
      </p>

      <h2 style={s.h2}>10. Contact</h2>
      <p style={s.p}>
        Skip Wait Technologies<br />
        Email: support@skipwait.in<br />
        Phone: +91 82850 49942
      </p>

      <a href="/" style={s.back}>← Back to app</a>
    </div>
  );
}
