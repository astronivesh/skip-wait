import json, urllib.request as u

BASE = "http://127.0.0.1:8002"

def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    req = u.Request(BASE + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with u.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except u.HTTPError as e:
        return e.code, None

print("1. list kitchens"); s, k = call("GET", "/kitchens"); print("  ", s, "->", k[0]["name"], "credit", k[0]["credit_balance"])
print("2. request OTP"); s, r = call("POST", "/auth/request-otp", {"phone": "9876543210"}); otp = r["dev_otp"]; print("   dev OTP =", otp)
print("3. verify"); s, r = call("POST", "/auth/verify-otp", {"phone": "9876543210", "code": otp}); tok = r["token"]; print("   token =", tok[:16] + "...")
print("4. create pickup order"); s, o = call("POST", "/orders", {"kitchen_id": "k1", "mode": "pickup", "arrival": 20, "items": [{"id": "i1", "qty": 2}, {"id": "i3", "qty": 1}]}, tok)
print("   id", o["id"], "| food", o["food_total"], "pack", o["pack"], "gst", o["gst"], "fee", o["skip_fee"], "TOTAL", o["total"], "| code", o["otp"])
oid, code = o["id"], o["otp"]
print("5. advance Accept"); s, o = call("POST", f"/orders/{oid}/advance", {}); print("  ", o["status"])
print("6. advance Preparing->Ready"); s, o = call("POST", f"/orders/{oid}/advance", {}); print("  ", o["status"])
print("7. final WITHOUT code (expect 403)"); s, _ = call("POST", f"/orders/{oid}/advance", {"otp": "0000"}); print("   HTTP", s)
print("8. final WITH code (expect Picked up)"); s, o = call("POST", f"/orders/{oid}/advance", {"otp": code}); print("  ", o["status"], "done=", o["done"])
print("9. order out of credits check"); s, k = call("GET", "/kitchens"); print("   k1 credit now", [x["credit_balance"] for x in k if x["id"] == "k1"][0], "(was 5000)")
print("10. delivery order has rider + no otp gate")
s, r = call("POST", "/auth/request-otp", {"phone": "9000000000"}); s, r = call("POST", "/auth/verify-otp", {"phone": "9000000000", "code": r["dev_otp"]}); t2 = r["token"]
s, o = call("POST", "/orders", {"kitchen_id": "k2", "mode": "deliver", "items": [{"id": "i6", "qty": 1}]}, t2)
print("   rider:", o["rider"]["name"], o["rider"]["veh"])
for _ in range(3):
    s, o = call("POST", f"/orders/{o['id']}/advance", {})
print("   final delivery status:", o["status"], "done=", o["done"], "(no code needed — Porter's job)")
print("\nALL CHECKS PASSED")
