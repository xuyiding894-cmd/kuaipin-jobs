# Part-Time Jobs MVP Design

Date: 2026-04-26

## Goal

Build a usable prototype for a trusted part-time hiring website. The first version should look and feel like a real product, while staying small enough to finish quickly and extend later.

The product is a general demo site that can later be adapted for mainland China, North America, Chinese-speaking communities, a single city, or a specific vertical such as campus jobs, local hourly work, restaurant shifts, retail shifts, events, or remote Chinese-language work.

## Positioning

The site should not try to compete as a broad job board on day one. Its first clear promise is:

- real part-time jobs
- transparent pay
- verified employers
- fast applications
- practical filters for time, location, pay, and category

The visual tone should be clean, trustworthy, and efficient. The first screen should be the working job search experience, not a marketing landing page.

## Audience

The MVP serves two user groups:

- Job seekers looking for part-time work, hourly shifts, temporary local jobs, or remote work.
- Employers who need to publish part-time jobs quickly and appear credible to applicants.

No account system is required for the first prototype. Forms can be front-end only in the initial version.

## Core Pages And Views

### Home And Job Search

The home screen contains the primary search and browsing experience:

- keyword search
- location filter
- category filter
- pay range or pay type filter
- shift/time filter
- trust-oriented highlights such as verified employer badges
- featured or recent job cards

Job cards show:

- job title
- employer name
- employer verification status
- pay
- location or remote status
- shift/time requirement
- job category
- short description
- quick apply action

### Job Detail

The prototype may show details in an inline panel or modal instead of a separate route. Details include:

- full job title
- employer
- pay and payment rhythm
- work schedule
- location
- responsibilities
- requirements
- trust signals such as verified employer, clear pay, and recent posting
- apply button

### Apply Flow

The application flow is a short form:

- name
- phone or email
- availability
- short message

After submission, the interface shows a confirmation state. In the prototype, submission is stored only in browser state or shown as a simulated success.

### Employer Posting Flow

Employers can open a post-job form with:

- job title
- company or employer name
- category
- pay
- location
- schedule
- description
- contact method

After submission, the new job appears in the local job list for the current browser session.

## Architecture

Use a small front-end app:

- static data for seed jobs
- client-side state for filters, selected job, applications, and newly posted jobs
- reusable components for search controls, job cards, detail panel, apply form, and posting form

Because this is a prototype, no backend, database, login, payment, messaging, or real verification service is included. The UI should make those future extensions plausible without pretending they are functional.

## Data Model

Each job contains:

- id
- title
- employer
- category
- pay
- payType
- location
- remote
- schedule
- description
- requirements
- verifiedEmployer
- postedAt
- tags

Applications contain:

- jobId
- applicantName
- contact
- availability
- message
- submittedAt

Posted jobs use the same job shape as seed jobs.

## Error Handling And Empty States

The MVP should handle:

- no jobs matching current filters
- incomplete application form
- incomplete posting form
- successful application
- successful job posting

Validation can be simple and client-side. Messages should be clear and practical.

## Visual Design

The design should feel like a useful hiring tool rather than a decorative landing page.

Recommended layout:

- compact top navigation with brand name and employer posting action
- search and filter bar near the top
- main job list with scan-friendly cards
- detail or application area that appears when needed
- restrained colors with strong contrast and clear status badges
- icons for common actions where available

Avoid oversized hero marketing, vague claims, nested cards, decorative blobs, and dense visual clutter.

## Testing And Verification

For the prototype, verify:

- page loads successfully
- search filters update visible jobs
- category, location, and schedule filters work
- selecting a job shows the right details
- application form validates required fields and shows success
- employer posting form validates required fields and adds the new job
- layout works on desktop and mobile widths
- text does not overflow buttons, cards, or panels

## Out Of Scope For MVP

The following are intentionally excluded from the first prototype:

- real user accounts
- real employer verification
- payment or escrow
- chat or SMS integration
- admin moderation dashboard
- backend API
- persistent database
- resume upload
- job recommendation algorithm

These can be added after the site proves the core job browsing, posting, and application experience.
