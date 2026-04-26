# Language Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Chinese/English language toggle to the static jobs MVP.

**Architecture:** Keep localization client-side. Add a focused translation module and update `src/app.js` rendering to read text through that module while preserving existing state and escaping behavior.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`.

---

## File Structure

- Create `src/i18n.js`: locale constants, translation tables, label helpers, and localized seed-job helpers.
- Modify `src/app.js`: add locale state, header language toggle, translated UI strings, translated category/schedule labels, localized seed job copy, and localStorage persistence.
- Modify `src/styles.css`: style the language switcher.
- Add `tests/i18n.test.mjs`: verify translation helpers and fallback behavior.

## Tasks

- [ ] Add failing tests for translation helper fallback and category label lookup.
- [ ] Add `src/i18n.js` with Chinese and English dictionaries, category labels, schedule labels, and helper functions.
- [ ] Update `src/app.js` to use `state.locale`, persist it in `localStorage`, update document `lang`, and render static text through translations.
- [ ] Add a `中文 | EN` segmented control in the header and wire click handling.
- [ ] Update CSS for the language switcher.
- [ ] Run `npm test` and `node --check src/app.js`.
- [ ] Verify in browser that toggling language updates UI text and persists after reload.
- [ ] Commit with `feat: add language toggle`.
