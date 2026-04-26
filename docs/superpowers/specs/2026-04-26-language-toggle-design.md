# Language Toggle Design

Date: 2026-04-26

## Goal

Add a Chinese/English language toggle to the part-time jobs MVP without adding a framework, backend, or routing.

## Design

Use a small client-side internationalization layer:

- `state.locale` stores the active language.
- The active language is loaded from `localStorage` and defaults to Chinese.
- A compact header control switches between `中文` and `EN`.
- All static UI text, form labels, validation messages, notices, category labels, and schedule labels come from a translation table.
- Seed job titles, descriptions, and requirements get optional localized copy. User-posted jobs display the text entered by the employer.

## Behavior

Switching language should:

- update the page immediately without losing current filters, selected job, form mode, or posted jobs
- persist the language for the next visit
- update `document.documentElement.lang`
- keep existing validation, filter focus preservation, XSS escaping, and posting behavior intact

## Testing

Add focused tests for language helper fallback and label lookup. Run the existing suite. Verify manually in the browser that the language toggle updates visible UI text and persists after reload.

## Out Of Scope

- automatic browser-language detection
- server-side localization
- translating user-entered posted jobs
- currency or region formatting beyond existing display
