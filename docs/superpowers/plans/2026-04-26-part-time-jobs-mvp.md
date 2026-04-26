# Part-Time Jobs MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished front-end prototype for a trusted part-time hiring website with job search, filters, job details, applications, and employer posting.

**Architecture:** Use a static browser app with focused JavaScript modules. Pure logic lives in `src/jobLogic.js` and is covered by Node's built-in test runner; `src/app.js` owns DOM rendering and browser state; `src/styles.css` owns the responsive product UI.

**Tech Stack:** HTML, CSS, vanilla JavaScript ES modules, Node.js built-in `node:test`, a tiny local Node static server.

---

## File Structure

- Create `package.json`: defines test and dev scripts.
- Create `index.html`: app shell and accessible root nodes.
- Create `src/jobs.js`: seed job data and filter option constants.
- Create `src/jobLogic.js`: pure filtering, validation, application, and posting helpers.
- Create `src/app.js`: browser state, event handlers, rendering, and form flows.
- Create `src/styles.css`: responsive visual design and interaction states.
- Create `scripts/dev-server.mjs`: local static file server for previewing the site.
- Create `tests/jobLogic.test.mjs`: unit tests for search, filters, validation, and posting helpers.

## Task 1: Project Skeleton And Logic Tests

**Files:**
- Create: `package.json`
- Create: `scripts/dev-server.mjs`
- Create: `tests/jobLogic.test.mjs`
- Create: `src/jobLogic.js`

- [ ] **Step 1: Create package scripts**

Create `package.json`:

```json
{
  "name": "part-time-jobs-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "dev": "node scripts/dev-server.mjs"
  }
}
```

- [ ] **Step 2: Create the local dev server**

Create `scripts/dev-server.mjs`:

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

function resolvePath(url) {
  const requested = decodeURIComponent(new URL(url, `http://127.0.0.1:${port}`).pathname);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  return join(root, safePath === "/" ? "index.html" : safePath);
}

createServer(async (request, response) => {
  try {
    const filePath = resolvePath(request.url || "/");
    const body = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving part-time jobs MVP at http://127.0.0.1:${port}`);
});
```

- [ ] **Step 3: Write failing logic tests**

Create `tests/jobLogic.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createApplication,
  createJobFromPosting,
  filterJobs,
  validateApplication,
  validatePosting
} from "../src/jobLogic.js";

const jobs = [
  {
    id: "job-1",
    title: "Campus Library Assistant",
    employer: "North City Library",
    category: "Campus",
    pay: 22,
    payType: "hour",
    location: "New York",
    remote: false,
    schedule: "Evening",
    description: "Help students find books and manage checkouts.",
    requirements: ["Student friendly", "Basic computer skills"],
    verifiedEmployer: true,
    postedAt: "2026-04-22",
    tags: ["quiet", "weekly"]
  },
  {
    id: "job-2",
    title: "Remote Chinese Support",
    employer: "Bright Desk",
    category: "Remote",
    pay: 28,
    payType: "hour",
    location: "Remote",
    remote: true,
    schedule: "Flexible",
    description: "Answer customer questions in Chinese and English.",
    requirements: ["Chinese", "English", "Stable internet"],
    verifiedEmployer: true,
    postedAt: "2026-04-24",
    tags: ["remote", "bilingual"]
  }
];

test("filterJobs matches keyword, location, category, schedule, and minimum pay", () => {
  const result = filterJobs(jobs, {
    keyword: "support",
    location: "remote",
    category: "Remote",
    schedule: "Flexible",
    minPay: "25"
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "job-2");
});

test("filterJobs returns all jobs when filters are empty", () => {
  assert.equal(filterJobs(jobs, {}).length, 2);
});

test("validateApplication reports required fields", () => {
  assert.deepEqual(validateApplication({ name: "", contact: "", availability: "" }), {
    name: "Name is required.",
    contact: "Phone or email is required.",
    availability: "Availability is required."
  });
});

test("createApplication returns a normalized application", () => {
  const application = createApplication("job-2", {
    name: " Mei ",
    contact: " mei@example.com ",
    availability: "Weekends",
    message: " I can start this week. "
  });

  assert.equal(application.jobId, "job-2");
  assert.equal(application.applicantName, "Mei");
  assert.equal(application.contact, "mei@example.com");
  assert.equal(application.message, "I can start this week.");
  assert.match(application.submittedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("validatePosting reports required employer posting fields", () => {
  assert.deepEqual(validatePosting({ title: "", employer: "", pay: "", location: "", schedule: "" }), {
    title: "Job title is required.",
    employer: "Employer name is required.",
    pay: "Pay is required.",
    location: "Location is required.",
    schedule: "Schedule is required.",
    description: "Description is required."
  });
});

test("createJobFromPosting returns a visible unverified job", () => {
  const job = createJobFromPosting({
    title: "Weekend Event Helper",
    employer: "City Events",
    category: "Events",
    pay: "25",
    payType: "hour",
    location: "Boston",
    schedule: "Weekend",
    description: "Help check in guests.",
    contact: "jobs@example.com"
  });

  assert.equal(job.title, "Weekend Event Helper");
  assert.equal(job.pay, 25);
  assert.equal(job.verifiedEmployer, false);
  assert.equal(job.remote, false);
  assert.ok(job.id.startsWith("posted-"));
  assert.match(job.postedAt, /^\d{4}-\d{2}-\d{2}$/);
});
```

- [ ] **Step 4: Run tests and confirm the expected failure**

Run:

```bash
npm test
```

Expected: FAIL with `Cannot find module ... src/jobLogic.js`.

- [ ] **Step 5: Implement pure logic helpers**

Create `src/jobLogic.js`:

```js
const normalize = (value) => String(value || "").trim();
const lower = (value) => normalize(value).toLowerCase();

export function filterJobs(jobs, filters = {}) {
  const keyword = lower(filters.keyword);
  const location = lower(filters.location);
  const category = normalize(filters.category);
  const schedule = normalize(filters.schedule);
  const minPay = Number(filters.minPay || 0);

  return jobs.filter((job) => {
    const haystack = [job.title, job.employer, job.description, job.location, ...(job.tags || [])]
      .join(" ")
      .toLowerCase();

    const matchesKeyword = !keyword || haystack.includes(keyword);
    const matchesLocation = !location || lower(job.location).includes(location) || (location === "remote" && job.remote);
    const matchesCategory = !category || job.category === category;
    const matchesSchedule = !schedule || job.schedule === schedule;
    const matchesPay = !minPay || Number(job.pay) >= minPay;

    return matchesKeyword && matchesLocation && matchesCategory && matchesSchedule && matchesPay;
  });
}

export function validateApplication(form) {
  const errors = {};
  if (!normalize(form.name)) errors.name = "Name is required.";
  if (!normalize(form.contact)) errors.contact = "Phone or email is required.";
  if (!normalize(form.availability)) errors.availability = "Availability is required.";
  return errors;
}

export function createApplication(jobId, form) {
  return {
    jobId,
    applicantName: normalize(form.name),
    contact: normalize(form.contact),
    availability: normalize(form.availability),
    message: normalize(form.message),
    submittedAt: new Date().toISOString()
  };
}

export function validatePosting(form) {
  const errors = {};
  if (!normalize(form.title)) errors.title = "Job title is required.";
  if (!normalize(form.employer)) errors.employer = "Employer name is required.";
  if (!normalize(form.pay)) errors.pay = "Pay is required.";
  if (!normalize(form.location)) errors.location = "Location is required.";
  if (!normalize(form.schedule)) errors.schedule = "Schedule is required.";
  if (!normalize(form.description)) errors.description = "Description is required.";
  return errors;
}

export function createJobFromPosting(form) {
  const location = normalize(form.location);
  const remote = lower(location) === "remote";

  return {
    id: `posted-${Date.now()}`,
    title: normalize(form.title),
    employer: normalize(form.employer),
    category: normalize(form.category) || "Local",
    pay: Number(form.pay),
    payType: normalize(form.payType) || "hour",
    location,
    remote,
    schedule: normalize(form.schedule),
    description: normalize(form.description),
    requirements: ["Clear communication", "Reliable availability"],
    verifiedEmployer: false,
    postedAt: new Date().toISOString().slice(0, 10),
    tags: [normalize(form.category), remote ? "remote" : "local"].filter(Boolean),
    contact: normalize(form.contact)
  };
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npm test
```

Expected: PASS, 6 tests.

Commit:

```bash
git add package.json scripts/dev-server.mjs tests/jobLogic.test.mjs src/jobLogic.js
git commit -m "test: add job logic coverage"
```

## Task 2: Seed Jobs And App Shell

**Files:**
- Create: `index.html`
- Create: `src/jobs.js`
- Create: `src/app.js`
- Create: `src/styles.css`

- [ ] **Step 1: Add seed job data**

Create `src/jobs.js`:

```js
export const categories = ["Campus", "Food Service", "Retail", "Events", "Remote", "Care"];
export const schedules = ["Morning", "Afternoon", "Evening", "Weekend", "Flexible"];

export const seedJobs = [
  {
    id: "campus-library",
    title: "Campus Library Assistant",
    employer: "North City Library",
    category: "Campus",
    pay: 22,
    payType: "hour",
    location: "New York",
    remote: false,
    schedule: "Evening",
    description: "Support circulation desk checkouts, shelve returns, and help students find study materials.",
    requirements: ["Student friendly", "Basic computer skills", "Can work two evenings weekly"],
    verifiedEmployer: true,
    postedAt: "2026-04-22",
    tags: ["campus", "quiet", "weekly"]
  },
  {
    id: "cafe-shift",
    title: "Cafe Weekend Shift Helper",
    employer: "Maple Cup Cafe",
    category: "Food Service",
    pay: 24,
    payType: "hour",
    location: "Boston",
    remote: false,
    schedule: "Weekend",
    description: "Help with counter service, table resets, and pickup orders during busy weekend brunch hours.",
    requirements: ["Friendly service", "Can stand for 4-hour shifts", "Food handler card preferred"],
    verifiedEmployer: true,
    postedAt: "2026-04-24",
    tags: ["weekend", "tips", "local"]
  },
  {
    id: "remote-support",
    title: "Remote Chinese Support Associate",
    employer: "Bright Desk",
    category: "Remote",
    pay: 28,
    payType: "hour",
    location: "Remote",
    remote: true,
    schedule: "Flexible",
    description: "Answer customer questions in Chinese and English for a growing ecommerce support desk.",
    requirements: ["Chinese and English fluency", "Stable internet", "Customer support experience helpful"],
    verifiedEmployer: true,
    postedAt: "2026-04-25",
    tags: ["remote", "bilingual", "support"]
  },
  {
    id: "event-checkin",
    title: "Conference Check-In Staff",
    employer: "City Events Group",
    category: "Events",
    pay: 26,
    payType: "hour",
    location: "Chicago",
    remote: false,
    schedule: "Morning",
    description: "Scan tickets, hand out badges, and direct guests during a one-day business conference.",
    requirements: ["Punctual", "Comfortable speaking with guests", "Black shirt required"],
    verifiedEmployer: false,
    postedAt: "2026-04-23",
    tags: ["event", "one-day", "morning"]
  }
];
```

- [ ] **Step 2: Add the HTML shell**

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>QuickShift | 可信兼职招聘</title>
    <link rel="stylesheet" href="./src/styles.css">
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./src/app.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Add a minimal render**

Create `src/app.js`:

```js
import { seedJobs } from "./jobs.js";

const app = document.querySelector("#app");

app.innerHTML = `
  <main class="app-shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">可信兼职招聘</p>
        <h1>QuickShift</h1>
      </div>
      <button class="primary-button" type="button">发布兼职</button>
    </header>
    <section class="toolbar" aria-label="岗位搜索">
      <input type="search" placeholder="搜索岗位、公司或关键词" aria-label="搜索岗位">
      <input type="search" placeholder="城市或 Remote" aria-label="地点">
      <button class="primary-button" type="button">搜索</button>
    </section>
    <section class="layout">
      <div class="job-list" aria-label="岗位列表">
        ${seedJobs.map((job) => `<article class="job-card"><h2>${job.title}</h2><p>${job.employer}</p></article>`).join("")}
      </div>
      <aside class="detail-panel"><p>选择一个岗位查看详情。</p></aside>
    </section>
  </main>
`;
```

- [ ] **Step 4: Add starter CSS**

Create `src/styles.css`:

```css
:root {
  color-scheme: light;
  --ink: #172026;
  --muted: #63707a;
  --line: #d9e1e7;
  --surface: #ffffff;
  --soft: #f5f8fa;
  --brand: #126d63;
  --brand-dark: #0d514a;
  --accent: #b45309;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: var(--ink);
  background: var(--soft);
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.topbar,
.toolbar,
.job-card,
.detail-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: var(--brand);
  font-size: 13px;
  font-weight: 700;
}

h1,
h2,
p {
  margin-top: 0;
}

.primary-button {
  border: 0;
  border-radius: 8px;
  color: #ffffff;
  background: var(--brand);
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.primary-button:hover {
  background: var(--brand-dark);
}

.toolbar {
  display: grid;
  grid-template-columns: 1.5fr 1fr auto;
  gap: 10px;
  margin: 16px 0;
  padding: 14px;
}

.toolbar input {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
}

.job-list {
  display: grid;
  gap: 12px;
}

.job-card,
.detail-panel {
  padding: 16px;
}

@media (max-width: 820px) {
  .app-shell {
    padding: 14px;
  }

  .topbar,
  .toolbar,
  .layout {
    grid-template-columns: 1fr;
  }

  .topbar {
    align-items: stretch;
    flex-direction: column;
  }
}
```

- [ ] **Step 5: Run tests, start preview, and commit**

Run:

```bash
npm test
npm run dev
```

Expected: tests pass; server prints `Serving part-time jobs MVP at http://127.0.0.1:4173`; browser shows four seed jobs.

Commit:

```bash
git add index.html src/jobs.js src/app.js src/styles.css
git commit -m "feat: add jobs app shell"
```

## Task 3: Search, Filters, Job Cards, And Details

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the minimal app with stateful search and details**

Update `src/app.js`:

```js
import { categories, schedules, seedJobs } from "./jobs.js";
import { filterJobs } from "./jobLogic.js";

const app = document.querySelector("#app");

const state = {
  jobs: [...seedJobs],
  filters: {
    keyword: "",
    location: "",
    category: "",
    schedule: "",
    minPay: ""
  },
  selectedJobId: seedJobs[0]?.id || null,
  mode: "detail",
  notice: ""
};

function money(job) {
  return `$${job.pay}/${job.payType === "hour" ? "hr" : job.payType}`;
}

function optionList(items, selected) {
  return items.map((item) => `<option value="${item}" ${item === selected ? "selected" : ""}>${item}</option>`).join("");
}

function visibleJobs() {
  return filterJobs(state.jobs, state.filters);
}

function selectedJob() {
  const jobs = visibleJobs();
  return state.jobs.find((job) => job.id === state.selectedJobId) || jobs[0] || null;
}

function renderJobCard(job) {
  const active = selectedJob()?.id === job.id;
  return `
    <article class="job-card ${active ? "is-active" : ""}">
      <button class="job-card-button" type="button" data-select-job="${job.id}">
        <span class="job-card-topline">
          <span class="job-title">${job.title}</span>
          <span class="pay">${money(job)}</span>
        </span>
        <span class="company-line">
          <span>${job.employer}</span>
          <span class="badge ${job.verifiedEmployer ? "verified" : "pending"}">
            ${job.verifiedEmployer ? "已认证" : "待认证"}
          </span>
        </span>
        <span class="meta-line">${job.location} · ${job.schedule} · ${job.category}</span>
        <span class="description">${job.description}</span>
      </button>
    </article>
  `;
}

function renderDetail(job) {
  if (!job) {
    return `
      <aside class="detail-panel empty-state">
        <h2>没有匹配岗位</h2>
        <p>换个关键词、城市或薪资条件试试。</p>
      </aside>
    `;
  }

  return `
    <aside class="detail-panel">
      <div class="detail-header">
        <p class="eyebrow">${job.category}</p>
        <h2>${job.title}</h2>
        <p class="muted">${job.employer} · ${job.location}</p>
      </div>
      <div class="trust-row">
        <span class="badge verified">${job.verifiedEmployer ? "雇主已认证" : "雇主待认证"}</span>
        <span class="badge">薪资清晰</span>
        <span class="badge">发布于 ${job.postedAt}</span>
      </div>
      <dl class="facts">
        <div><dt>薪资</dt><dd>${money(job)}</dd></div>
        <div><dt>时间</dt><dd>${job.schedule}</dd></div>
        <div><dt>地点</dt><dd>${job.remote ? "远程" : job.location}</dd></div>
      </dl>
      <p>${job.description}</p>
      <h3>要求</h3>
      <ul>${job.requirements.map((item) => `<li>${item}</li>`).join("")}</ul>
      <button class="primary-button full" type="button" data-open-apply="${job.id}">立即申请</button>
    </aside>
  `;
}

function render() {
  const jobs = visibleJobs();
  const job = selectedJob();
  const resultText = `${jobs.length} 个匹配岗位`;

  app.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">可信兼职招聘</p>
          <h1>QuickShift</h1>
          <p class="topbar-copy">搜索真实兼职、透明薪资和认证雇主。</p>
        </div>
        <button class="secondary-button" type="button" data-open-post>发布兼职</button>
      </header>

      <section class="toolbar" aria-label="岗位搜索">
        <input data-filter="keyword" type="search" value="${state.filters.keyword}" placeholder="搜索岗位、公司或关键词" aria-label="搜索岗位">
        <input data-filter="location" type="search" value="${state.filters.location}" placeholder="城市或 Remote" aria-label="地点">
        <select data-filter="category" aria-label="分类">
          <option value="">全部分类</option>
          ${optionList(categories, state.filters.category)}
        </select>
        <select data-filter="schedule" aria-label="时间">
          <option value="">全部时间</option>
          ${optionList(schedules, state.filters.schedule)}
        </select>
        <input data-filter="minPay" type="number" min="0" value="${state.filters.minPay}" placeholder="最低时薪" aria-label="最低时薪">
      </section>

      ${state.notice ? `<p class="notice">${state.notice}</p>` : ""}

      <section class="summary-strip" aria-label="平台承诺">
        <span>真实岗位优先</span>
        <span>工资透明</span>
        <span>雇主认证标识</span>
        <span>${resultText}</span>
      </section>

      <section class="layout">
        <div class="job-list" aria-label="岗位列表">
          ${jobs.length ? jobs.map(renderJobCard).join("") : `<div class="empty-state"><h2>没有匹配岗位</h2><p>调整筛选条件后再试。</p></div>`}
        </div>
        ${renderDetail(job)}
      </section>
    </main>
  `;
}

app.addEventListener("input", (event) => {
  const field = event.target.closest("[data-filter]");
  if (!field) return;
  state.filters[field.dataset.filter] = field.value;
  state.selectedJobId = visibleJobs()[0]?.id || null;
  state.notice = "";
  render();
});

app.addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-select-job]");
  if (selectButton) {
    state.selectedJobId = selectButton.dataset.selectJob;
    state.mode = "detail";
    state.notice = "";
    render();
  }
});

render();
```

- [ ] **Step 2: Extend CSS for filters, cards, details, and empty states**

Append to `src/styles.css`:

```css
.topbar-copy,
.muted,
.description,
.meta-line {
  color: var(--muted);
}

.secondary-button {
  border: 1px solid var(--brand);
  border-radius: 8px;
  color: var(--brand);
  background: #ffffff;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}

.secondary-button:hover {
  background: #e7f3f1;
}

.toolbar {
  grid-template-columns: minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(110px, 0.7fr);
}

.toolbar select,
.toolbar input {
  min-width: 0;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  padding: 10px 12px;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.summary-strip span {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  padding: 10px 12px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 700;
}

.job-card {
  padding: 0;
  overflow: hidden;
}

.job-card.is-active {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(18, 109, 99, 0.12);
}

.job-card-button {
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: grid;
  gap: 8px;
  padding: 16px;
  text-align: left;
}

.job-card-topline,
.company-line,
.trust-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.job-title {
  font-weight: 800;
}

.pay {
  color: var(--accent);
  font-weight: 800;
  white-space: nowrap;
}

.badge {
  border-radius: 999px;
  background: #edf2f7;
  color: #334155;
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.badge.verified {
  background: #dff3ee;
  color: #0d514a;
}

.badge.pending {
  background: #fff3d6;
  color: #854d0e;
}

.detail-panel {
  align-self: start;
  position: sticky;
  top: 16px;
}

.detail-header h2 {
  margin-bottom: 6px;
}

.facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 18px 0;
}

.facts div {
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
}

.facts dt {
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
}

.facts dd {
  margin: 4px 0 0;
  font-weight: 800;
}

.full {
  width: 100%;
}

.empty-state,
.notice {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #ffffff;
  padding: 16px;
}

.notice {
  border-color: #9fd8cc;
  color: var(--brand-dark);
  font-weight: 700;
}

@media (max-width: 980px) {
  .toolbar,
  .summary-strip,
  .layout {
    grid-template-columns: 1fr;
  }

  .detail-panel {
    position: static;
  }
}
```

- [ ] **Step 3: Run tests and commit**

Run:

```bash
npm test
```

Expected: PASS, 6 tests.

Commit:

```bash
git add src/app.js src/styles.css
git commit -m "feat: add search filters and job details"
```

## Task 4: Apply Flow And Employer Posting Flow

**Files:**
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `tests/jobLogic.test.mjs`

- [ ] **Step 1: Add a test for invalid numeric posting pay**

Append to `tests/jobLogic.test.mjs`:

```js
test("validatePosting rejects non-positive pay", () => {
  assert.deepEqual(
    validatePosting({
      title: "Shift",
      employer: "Shop",
      pay: "0",
      location: "Seattle",
      schedule: "Morning",
      description: "Stock shelves."
    }),
    { pay: "Pay must be greater than 0." }
  );
});
```

- [ ] **Step 2: Run the new test and confirm failure**

Run:

```bash
npm test
```

Expected: FAIL because `validatePosting` accepts `0`.

- [ ] **Step 3: Update pay validation**

Modify `validatePosting` in `src/jobLogic.js`:

```js
export function validatePosting(form) {
  const errors = {};
  if (!normalize(form.title)) errors.title = "Job title is required.";
  if (!normalize(form.employer)) errors.employer = "Employer name is required.";
  if (!normalize(form.pay)) {
    errors.pay = "Pay is required.";
  } else if (Number(form.pay) <= 0 || Number.isNaN(Number(form.pay))) {
    errors.pay = "Pay must be greater than 0.";
  }
  if (!normalize(form.location)) errors.location = "Location is required.";
  if (!normalize(form.schedule)) errors.schedule = "Schedule is required.";
  if (!normalize(form.description)) errors.description = "Description is required.";
  return errors;
}
```

- [ ] **Step 4: Add form rendering and submission handlers**

Extend `src/app.js` by importing the helpers:

```js
import {
  createApplication,
  createJobFromPosting,
  filterJobs,
  validateApplication,
  validatePosting
} from "./jobLogic.js";
```

Add this state field:

```js
errors: {}
```

Add helper functions before `render()`:

```js
function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fieldError(name) {
  return state.errors[name] ? `<p class="field-error">${state.errors[name]}</p>` : "";
}

function renderApplyForm(job) {
  return `
    <aside class="detail-panel">
      <button class="link-button" type="button" data-back-detail>Back to details</button>
      <h2>申请 ${job.title}</h2>
      <form class="stack-form" data-apply-form>
        <label>姓名<input name="name" autocomplete="name">${fieldError("name")}</label>
        <label>电话或邮箱<input name="contact" autocomplete="email">${fieldError("contact")}</label>
        <label>可工作时间<input name="availability" placeholder="例如：周末、晚上、每周三天">${fieldError("availability")}</label>
        <label>留言<textarea name="message" rows="4" placeholder="简单介绍你的经验或开始时间"></textarea></label>
        <button class="primary-button full" type="submit">提交申请</button>
      </form>
    </aside>
  `;
}

function renderPostingForm() {
  return `
    <aside class="detail-panel">
      <button class="link-button" type="button" data-back-detail>Back to details</button>
      <h2>发布兼职</h2>
      <form class="stack-form" data-post-form>
        <label>岗位名称<input name="title">${fieldError("title")}</label>
        <label>雇主名称<input name="employer">${fieldError("employer")}</label>
        <label>分类<select name="category">${optionList(categories, "Local")}</select></label>
        <label>薪资<input name="pay" type="number" min="1">${fieldError("pay")}</label>
        <label>薪资单位<select name="payType"><option value="hour">每小时</option><option value="shift">每班</option><option value="day">每天</option></select></label>
        <label>地点<input name="location" placeholder="城市或 Remote">${fieldError("location")}</label>
        <label>时间<select name="schedule">${optionList(schedules, "Flexible")}</select>${fieldError("schedule")}</label>
        <label>描述<textarea name="description" rows="4"></textarea>${fieldError("description")}</label>
        <label>联系方式<input name="contact" placeholder="邮箱、电话或微信"></label>
        <button class="primary-button full" type="submit">发布岗位</button>
      </form>
    </aside>
  `;
}
```

Replace the detail rendering inside `render()`:

```js
const sidePanel = state.mode === "apply" && job
  ? renderApplyForm(job)
  : state.mode === "post"
    ? renderPostingForm()
    : renderDetail(job);
```

Then use `${sidePanel}` in the layout instead of `${renderDetail(job)}`.

Extend the click and submit handlers:

```js
app.addEventListener("click", (event) => {
  const selectButton = event.target.closest("[data-select-job]");
  if (selectButton) {
    state.selectedJobId = selectButton.dataset.selectJob;
    state.mode = "detail";
    state.errors = {};
    state.notice = "";
    render();
    return;
  }

  const applyButton = event.target.closest("[data-open-apply]");
  if (applyButton) {
    state.selectedJobId = applyButton.dataset.openApply;
    state.mode = "apply";
    state.errors = {};
    state.notice = "";
    render();
    return;
  }

  if (event.target.closest("[data-open-post]")) {
    state.mode = "post";
    state.errors = {};
    state.notice = "";
    render();
    return;
  }

  if (event.target.closest("[data-back-detail]")) {
    state.mode = "detail";
    state.errors = {};
    render();
  }
});

app.addEventListener("submit", (event) => {
  const applyForm = event.target.closest("[data-apply-form]");
  const postForm = event.target.closest("[data-post-form]");

  if (applyForm) {
    event.preventDefault();
    const data = formData(applyForm);
    const errors = validateApplication(data);
    if (Object.keys(errors).length) {
      state.errors = errors;
      render();
      return;
    }
    createApplication(state.selectedJobId, data);
    state.errors = {};
    state.mode = "detail";
    state.notice = "申请已提交。雇主会通过你留下的联系方式联系你。";
    render();
  }

  if (postForm) {
    event.preventDefault();
    const data = formData(postForm);
    const errors = validatePosting(data);
    if (Object.keys(errors).length) {
      state.errors = errors;
      render();
      return;
    }
    const job = createJobFromPosting(data);
    state.jobs = [job, ...state.jobs];
    state.selectedJobId = job.id;
    state.mode = "detail";
    state.errors = {};
    state.notice = "岗位已发布在当前浏览器会话中，认证状态显示为待认证。";
    render();
  }
});
```

- [ ] **Step 5: Add form styles**

Append to `src/styles.css`:

```css
.stack-form {
  display: grid;
  gap: 12px;
}

.stack-form label {
  display: grid;
  gap: 6px;
  color: var(--ink);
  font-size: 14px;
  font-weight: 800;
}

.stack-form input,
.stack-form select,
.stack-form textarea {
  width: 100%;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--ink);
  background: #ffffff;
  resize: vertical;
}

.field-error {
  margin: 0;
  color: #b42318;
  font-size: 13px;
  font-weight: 700;
}

.link-button {
  border: 0;
  background: transparent;
  color: var(--brand);
  cursor: pointer;
  font-weight: 800;
  padding: 0 0 12px;
}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
npm test
```

Expected: PASS, 7 tests.

Commit:

```bash
git add src/jobLogic.js src/app.js src/styles.css tests/jobLogic.test.mjs
git commit -m "feat: add application and posting flows"
```

## Task 5: Responsive Polish And Final Verification

**Files:**
- Modify: `src/styles.css`
- Modify: `src/app.js`

- [ ] **Step 1: Add final visual polish**

Update the top of `body` and `.app-shell` in `src/styles.css`:

```css
body {
  margin: 0;
  color: var(--ink);
  background:
    linear-gradient(180deg, rgba(18, 109, 99, 0.08), rgba(245, 248, 250, 0) 340px),
    var(--soft);
}

.app-shell {
  width: min(1180px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px;
}
```

Add focus and mobile refinements:

```css
:focus-visible {
  outline: 3px solid rgba(18, 109, 99, 0.35);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .job-card-topline,
  .company-line,
  .trust-row,
  .facts {
    align-items: flex-start;
    flex-direction: column;
    grid-template-columns: 1fr;
  }

  .primary-button,
  .secondary-button {
    width: 100%;
  }
}
```

- [ ] **Step 2: Add a compact visual product signal**

Add this inside the header in `src/app.js`, after the title block and before the post button:

```html
<div class="mini-board" aria-label="平台状态">
  <span><strong>24h</strong>快速申请</span>
  <span><strong>4</strong>类认证信号</span>
</div>
```

Add CSS:

```css
.mini-board {
  display: grid;
  grid-template-columns: repeat(2, minmax(90px, 1fr));
  gap: 8px;
}

.mini-board span {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #f9fbfb;
  padding: 10px;
  color: var(--muted);
  font-size: 13px;
}

.mini-board strong {
  display: block;
  color: var(--brand-dark);
  font-size: 20px;
}
```

- [ ] **Step 3: Run automated tests**

Run:

```bash
npm test
```

Expected: PASS, 7 tests.

- [ ] **Step 4: Run local server and verify browser behavior**

Run:

```bash
npm run dev
```

Expected: server prints `Serving part-time jobs MVP at http://127.0.0.1:4173`.

Manual browser checks:

- Open `http://127.0.0.1:4173`.
- Type `support` in the keyword field; only the remote support job remains.
- Type `Remote` in the location field; remote job remains.
- Select a visible job; detail panel title changes.
- Click `立即申请`; submit an empty form; required field errors appear.
- Fill name, contact, availability; submit; success notice appears.
- Click `发布兼职`; submit an empty form; required field errors appear.
- Fill posting form; submit; new job appears at the top with `待认证`.
- Resize to mobile width; filters, cards, and detail panel stack without text overflow.

- [ ] **Step 5: Commit final polish**

Commit:

```bash
git add src/app.js src/styles.css
git commit -m "style: polish responsive jobs experience"
```

## Self-Review

- Spec coverage: The plan covers job search, filters, job cards, job details, application form, employer posting form, local browser state, validation, empty states, desktop/mobile responsiveness, and no backend.
- Placeholder scan: No placeholder phrases or vague validation steps remain.
- Type consistency: Job fields match the spec: `id`, `title`, `employer`, `category`, `pay`, `payType`, `location`, `remote`, `schedule`, `description`, `requirements`, `verifiedEmployer`, `postedAt`, and `tags`. Application fields match the spec: `jobId`, `applicantName`, `contact`, `availability`, `message`, and `submittedAt`.
