# Marketplace Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a more attractive, trust-focused marketplace first screen for the兼职 MVP.

**Architecture:** Keep the static app architecture. Add presentational helpers in `src/app.js`, translation keys in `src/i18n.js`, and responsive styling in `src/styles.css`. Tests remain Node source assertions because the app has no DOM test runner.

**Tech Stack:** Vanilla JavaScript modules, CSS, Node test runner.

---

### Task 1: UI Contract Tests

**Files:**
- Modify: `tests/app.test.mjs`
- Modify: `tests/i18n.test.mjs`

- [ ] **Step 1: Write failing tests**

```js
test("home screen renders marketplace attraction sections", () => {
  assert.match(appSource, /renderHeroPanel/);
  assert.match(appSource, /renderQuickStartTiles/);
  assert.match(appSource, /renderMarketplaceSignals/);
  assert.match(appSource, /renderWorkFlowStrip/);
});
```

```js
assert.equal(t("en", "heroHeadline"), "Find a trusted task you can start today");
assert.equal(t("en", "quickStartTitle"), "Start with a task type");
assert.equal(t("en", "marketplaceSignalsTitle"), "Why people can trust this marketplace");
```

- [ ] **Step 2: Run failing tests**

Run: `node --test tests/app.test.mjs tests/i18n.test.mjs`

Expected: tests fail because the helpers and labels do not exist.

- [ ] **Step 3: Commit tests only if desired**

Use a single final commit for this small UI change.

### Task 2: App Markup And Copy

**Files:**
- Modify: `src/app.js`
- Modify: `src/i18n.js`

- [ ] **Step 1: Implement helper renderers**

Add `renderHeroPanel`, `renderQuickStartTiles`, `renderMarketplaceSignals`, and `renderWorkFlowStrip`.

- [ ] **Step 2: Replace the old topbar block**

Call the new helpers before the search toolbar while preserving login, language switch, and post buttons.

- [ ] **Step 3: Run tests**

Run: `node --test tests/app.test.mjs tests/i18n.test.mjs`

Expected: pass.

### Task 3: Visual Styling

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Style hero, tiles, signal band, and flow strip**

Use restrained color contrast, stable grid dimensions, and responsive wrapping.

- [ ] **Step 2: Run full tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Browser verify**

Reload `http://127.0.0.1:4173/` and confirm hero, task tiles, signal band, filters, list, and detail panel are visible.

- [ ] **Step 4: Commit**

```bash
git add docs src tests
git commit -m "feat: upgrade marketplace landing experience"
```
