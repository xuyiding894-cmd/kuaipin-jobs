# Operating Version Design

Date: 2026-04-26

## Goal

Upgrade the static part-time jobs MVP into a local operating prototype that can persist data, support login, let employers post jobs, run smart pre-audit rules, and let an admin review jobs.

## Scope

This version is a real local operating prototype, not a production cloud deployment. It uses the existing Node server and a JSON file database. It does not process real payments.

Included:

- employer and admin login
- persistent JSON data store
- public approved jobs
- employer job posting and application management
- package selection for employers
- smart pre-audit risk scoring
- admin review queue with approve, reject, needs-info, and takedown actions
- persisted applications

Excluded:

- real payment capture
- document upload for business licenses
- email or SMS notifications
- cloud database
- production-grade password recovery

## Roles

Anonymous users can browse approved jobs and submit applications.

Employers can register or log in, choose a plan, post jobs, see audit results, and view applications for their jobs.

Admins can log in, view all jobs, inspect smart-audit reasons, approve or reject jobs, request more information, and take jobs down.

## Smart Pre-Audit

Every posted job receives:

- risk level: low, medium, or high
- risk score
- reasons
- recommendation

Rules check for:

- payment/deposit/fee language
- requests for sensitive data such as verification codes, bank passwords, or ID photos
- suspicious links or off-platform transfer language
- unusually high hourly pay
- missing location, pay, schedule, employer, or short description

Smart audit assists the admin. It should not be the final authority.

## Data

The local JSON database stores:

- users
- sessions
- jobs
- applications
- employer plan selections

Seed data initializes approved demo jobs and a demo admin account.

## UI

The existing public job-search UI remains the first screen. Add:

- login/register panel
- account status area
- employer dashboard
- plan selection
- admin review dashboard
- status and risk badges

The language toggle remains supported.

## Testing

Add server-side tests for audit rules and database/API helper behavior. Preserve existing tests. Verify browser flows manually:

- register employer
- choose plan
- post job
- see pending status and audit reasons
- admin approves job
- job appears publicly
- user applies
- employer sees application
