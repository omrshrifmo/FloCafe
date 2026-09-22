# FloCafe architecture

## Purpose

FloCafe is a local-first, offline-capable restaurant POS. The runtime is intentionally split into a small set of authority boundaries so that optional business features can be added without entangling the core product with vendor-specific logic.

The primary architecture is:

- Electron main process owns OS integration, window lifecycle, IPC, and local service startup.
- Express exposes the local API on port 3001 and remains the backend authority for auth, settings, and business data.
- SQLite is the system of record for settings, orders, and operational state.
- Next.js renders the POS UI, but the desktop export path is static and cannot host logic that must run locally in every environment.

## Plugin system

FloCafe treats plugins as runtime modules that can be discovered, enabled or disabled, and configured without mutating the core code path. A plugin is not a separate application; it is a structured extension artifact inside the app's plugin registry.

### Contract

Each plugin is a directory under the app plugin root, typically:

- Windows/macOS/Linux userData: `.../plugins/<plugin-id>/`
- Local development fallback: `<repo>/plugins/<plugin-id>/`

A valid plugin contains:

- `plugin.json` with a manifest and configuration schema
- an entry file declared by `main`
- optional `migrations/*.sql` scripts
- optional `api/*.js` handlers
- optional `ui/*.jsx` page stubs for settings or dashboard routes

The manifest must declare:

- a stable `id`
- user-facing `name` and `version`
- `minFloCafeVersion`
- `description`, `author`, and `license`
- `main` entry file
- `hooks` for activation, deactivation, and event subscriptions
- `routes.api` and `routes.ui`
- `permissions`
- `settingsSchema`

### Runtime shape

The plugin registry is centered on the `PluginsService` in `main/services/PluginsService.ts`.

It is responsible for:

1. discovering plugin directories
2. validating `plugin.json`
3. creating/reading plugin metadata rows in SQLite
4. defaulting new plugins to disabled so upgrades remain safe
5. loading enabled plugins at startup
6. exposing plugin routes through the Express API
7. sanitizing and persisting plugin settings
8. applying migration SQL in a controlled order

The core service keeps plugin behavior behind explicit registry checks. Core features do not inspect plugin internals directly; they operate through the manifest, the DB rows, and the API/IPC surfaces.

### Security/operational boundaries

This plugin model preserves the core invariants:

- local-first data stays local
- no database dropping or destructive migration shortcuts
- role-based access remains enforced by the main API middleware
- plugin route access inherits the repository's existing `requireRole` checks
- plugin settings are schema-validated before persistence
- plugin events are optional and hook into the existing centralized event bus

### Example plugin

The repo includes a sample plugin at `plugins/eg-core-sample/` showing the expected structure. It is intentionally small and safe: it registers a UI route and a simple API route, keeps its state under the plugin registry, and demonstrates how region-specific features can be added later without modifying the main POS logic.

## Why this matters

This architecture allows future features such as Arabic/RTL, Egypt tax, QR ordering, KOT flows, and inventory extensions to be introduced as isolated runtime modules. The core remains stable while plugin modules become packaging boundaries rather than intrusive forks of the app.

## Current implementation status

This document describes the target plugin architecture. The current runtime is the initial integration layer: plugin discovery, validation, registry persistence, startup registration, and sample plugin scaffolding are in place, while feature-specific plugins remain additive and opt-in.
