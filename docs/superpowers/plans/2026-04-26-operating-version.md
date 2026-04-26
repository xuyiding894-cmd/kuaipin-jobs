# Operating Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the MVP into a local operating prototype with login, persistent data, employer plans, smart audit, and admin review.

**Architecture:** Extend the existing Node server into a static server plus JSON API. Store data in a local JSON database file. Keep the front end vanilla JavaScript and reuse the existing render loop, filtering, escaping, and language toggle patterns.

**Tech Stack:** Node.js HTTP server, JSON file persistence, vanilla JavaScript ES modules, Node built-in `node:test`.

---

## Tasks

- [ ] Add `src/audit.js` with smart pre-audit rule scoring and tests.
- [ ] Add `scripts/data-store.mjs` for JSON persistence, seed initialization, users, sessions, jobs, applications, and status updates.
- [ ] Extend `scripts/dev-server.mjs` with JSON API routes for auth, jobs, applications, plans, and admin review.
- [ ] Update `src/app.js` to load jobs from the API and submit applications/jobs to the API.
- [ ] Add account UI for login, register, logout, employer dashboard, and admin dashboard.
- [ ] Add plan selection UI with free, growth, and pro plans, without real payment.
- [ ] Show smart audit risk and job status to employers/admins.
- [ ] Update styles for account panels, dashboards, plans, and status/risk badges.
- [ ] Run `npm test`, `node --check src/app.js`, server smoke tests, and browser verification.
- [ ] Commit with `feat: add operating version backend`.
