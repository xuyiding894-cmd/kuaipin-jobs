# Marketplace Visual Upgrade Design

## Goal

Make the MVP feel more attractive and credible by borrowing proven marketplace patterns from successful part-time, freelance, and local-task platforms while keeping the first screen useful for finding and posting work.

## Borrowed Patterns

- Trust-first marketplace: show review, verification, risk scanning, and pay clarity signals near the top.
- Category discovery: expose common task categories as quick tiles so users immediately understand what work exists.
- Fast action: keep search, filters, apply/take-task, and post-task actions visible without a marketing-only landing page.
- Student and home-worker positioning: make campus tasks and remote light tasks feel like primary product modes.

## UI Changes

- Upgrade the current top bar into a compact hero panel with a stronger headline, trust chips, stats, and primary actions.
- Add a quick-start task tile section above search, covering campus, remote, content, local errands, storefront shifts, and event help.
- Add a marketplace signals band that explains why the platform is safer: smart review, verified employer badges, transparent pay, and referral accountability.
- Add a short step strip that shows the core flow: choose a task, apply/take it, finish and build reputation.
- Refresh CSS with richer but restrained colors, stronger card hierarchy, better spacing, and responsive layouts.

## Testing

- Add source-level tests that assert the new UI sections and English labels exist.
- Keep existing data, audit, growth, and server tests passing.
- Verify in the in-app browser that the upgraded sections render and do not hide the job list or action buttons.
