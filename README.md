# KuaiPin Jobs

KuaiPin Jobs is a lightweight MVP for trusted part-time jobs, campus tasks, and flexible local work. It is designed for early validation with students, small employers, campus promoters, and light-task publishers.

## Features

- Bilingual Chinese / English interface
- Employer and student publisher registration
- Job, campus task, and light-task posting flows
- Admin review dashboard for postings, applications, partner applications, and outreach leads
- Basic risk review for deposits, unrealistic pay, suspicious wording, and missing details
- Referral and campus partner growth tools with non-cash rewards
- Local JSON persistence for development

## Run Locally

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:4173/
```

## Public Demo

The app can run on GitHub Pages as a browser-only demo. When it is opened from a public hostname, it uses local browser storage to simulate jobs, demo accounts, applications, reviews, referrals, and outreach leads.

This demo mode is for product validation and sharing only. Real operations still need a backend database, production authentication, moderation, and payment integration.

## Test

```bash
npm test
```

## Demo Accounts

```text
Admin: admin@quickshift.local / admin123
Employer: employer@quickshift.local / demo123
```

## Public Data Notice

This repository uses demo leads and demo accounts only. Do not commit real applicant data, employer contacts, outreach drafts, phone numbers, emails, or production JSON databases.

Runtime data is stored under `data/*.json` and is ignored by Git.

## Roadmap

- Public deployment
- Real database and authentication hardening
- Payment integration for employer plans and featured posts
- Better moderation workflow
- City and campus partner pages
- Mobile-first posting and application flows

## License

MIT
