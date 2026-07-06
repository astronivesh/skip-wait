---
name: Skip Wait DB backend
description: How the FastAPI backend picks its database and why the SQLite-specific migration helper is guarded.
---

The engine setup in `backend/app.py` prefers `DATABASE_URL` (Replit-managed Postgres) when present, and only falls back to a local `skipwait.db` SQLite file when `DATABASE_URL` is unset (e.g. pure local/offline dev without the DB provisioned).

**Why:** the app is deployed on autoscale, where container filesystems are ephemeral/disposable — SQLite data was silently at risk of being lost across redeploys/restarts/scaling events. Postgres via `DATABASE_URL` persists independently of the app containers.

**How to apply:** `_add_column_if_missing()` (legacy idempotent SQLite column patcher) is a no-op on non-sqlite dialects, since `Base.metadata.create_all()` already creates every current model column on a fresh Postgres DB. Don't add new Postgres-specific ALTER logic there — just add the column to the SQLAlchemy model and it will appear via `create_all` on Postgres; only add an `_add_column_if_missing` call if you also need to support existing local SQLite dev DBs.

App has idempotent seed logic (`seed()` in `app.py`) that recreates fixture kitchens/menu/test users if the `kitchens` table is empty, so provisioning a fresh Postgres DB does not require manually migrating old SQLite data — seed data reappears automatically, and real order data was already not durable before this change.
