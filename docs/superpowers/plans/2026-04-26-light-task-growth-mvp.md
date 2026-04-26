# Light Task Growth MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a working light-task zone, 校园任务站, and campus partner / invite rewards to the current 快聘兼职 MVP without adding real payments or external message sending.

**Architecture:** Keep the existing vanilla JS frontend and Node JSON-store backend. Add focused domain helpers for work modes, campus task sources, and growth rewards, then wire them into the current posting, application, admin, and dashboard flows. Use one-level referrals only; rewards are non-payment platform benefits.

**Tech Stack:** Vanilla JavaScript ES modules, Node `node:test`, local JSON data store, existing Node HTTP server, existing CSS.

---

## Scope Check

This plan intentionally combines two approved specs because they support the same MVP loop: light tasks and 校园任务站 provide shareable work, while campus partner / invite rewards bring applicants, student initiators, and employer leads to those tasks. The work is split into independent commits so the light-task feature can still function if the growth UI is delayed.

Specs:

- `docs/superpowers/specs/2026-04-26-light-task-zone-design.md`
- `docs/superpowers/specs/2026-04-26-campus-partner-growth-design.md`

## File Map

- Create `src/workModes.js`: constants and helpers for ordinary jobs, light tasks, and 校园任务站 filters.
- Create `src/growth.js`: referral codes, invite copy, reward rules, and growth-risk helpers.
- Modify `src/jobs.js`: add light-task categories/options and seed light-task listings.
- Modify `src/jobLogic.js`: filter by work mode / campus task source, validate task fields, create task jobs and applications.
- Modify `src/audit.js`: add task/growth risk patterns.
- Modify `scripts/data-store.mjs`: persist publisher type, referral codes, partner applications, referral events, and rewards.
- Modify `scripts/dev-server.mjs`: expose growth and admin growth API endpoints.
- Modify `src/i18n.js`: add Chinese/English text and labels for task/growth UI.
- Modify `src/app.js`: render task filters/cards/forms, 校园任务站 entry, invite panel, partner form, and admin growth review.
- Modify `src/styles.css`: add compact controls and dashboard sections.
- Add/modify tests in `tests/*.test.mjs`.

## Task 1: Work Mode Domain And Posting Logic

**Files:**
- Create: `src/workModes.js`
- Modify: `src/jobs.js`
- Modify: `src/jobLogic.js`
- Modify: `tests/jobLogic.test.mjs`

- [ ] **Step 1: Add failing work-mode tests**

Append these tests to `tests/jobLogic.test.mjs`:

```js
test("filterJobs can limit results to light tasks", () => {
  const result = filterJobs(
    [
      { ...jobs[0], workMode: "job" },
      { ...jobs[1], workMode: "task", taskSource: "employer", taskType: "remote", settlement: "afterDone" }
    ],
    { workMode: "task" }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].workMode, "task");
});

test("filterJobs can limit results to campus task station", () => {
  const result = filterJobs(
    [
      { ...jobs[0], workMode: "task", taskSource: "employer" },
      { ...jobs[1], workMode: "task", taskSource: "campus", campusName: "North City University" }
    ],
    { workMode: "campusTask" }
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].taskSource, "campus");
});

test("validatePosting requires light-task fields for task postings", () => {
  assert.deepEqual(
    validatePosting({
      workMode: "task",
      title: "Short video subtitle cleanup",
      employer: "Media Shop",
      pay: "30",
      location: "Remote",
      schedule: "Flexible",
      description: "Clean up subtitles for a short video and return the edited caption text."
    }),
    {
      taskType: "Task type is required.",
      estimatedTime: "Estimated time is required.",
      settlement: "Settlement is required."
    }
  );
});

test("validatePosting requires campus name for campus task station postings", () => {
  assert.deepEqual(
    validatePosting({
      workMode: "task",
      taskSource: "campus",
      title: "Club event helper",
      employer: "Student Project",
      taskType: "campus",
      pay: "40",
      estimatedTime: "2 hours",
      settlement: "afterDone",
      location: "Campus",
      schedule: "Weekend",
      description: "Help a student club check in guests and organize material packs."
    }),
    {
      campusName: "Campus name is required."
    }
  );
});

test("createJobFromPosting preserves light-task metadata", () => {
  const job = createJobFromPosting({
    workMode: "task",
    taskSource: "campus",
    title: "Campus poster photo check",
    employer: "Campus Club",
    category: "Campus",
    taskType: "campus",
    campusName: "North City University",
    targetAudience: "Students with 30 minutes after class",
    pay: "35",
    payType: "task",
    estimatedTime: "45 minutes",
    settlement: "afterDone",
    difficulty: "easy",
    remoteFriendly: "on",
    location: "Remote",
    schedule: "Flexible",
    description: "Check five poster photos and mark whether the store name is visible.",
    contact: "club@example.com"
  });

  assert.equal(job.workMode, "task");
  assert.equal(job.taskSource, "campus");
  assert.equal(job.taskType, "campus");
  assert.equal(job.campusName, "North City University");
  assert.equal(job.targetAudience, "Students with 30 minutes after class");
  assert.equal(job.payType, "task");
  assert.equal(job.estimatedTime, "45 minutes");
  assert.equal(job.settlement, "afterDone");
  assert.equal(job.difficulty, "easy");
  assert.equal(job.remoteFriendly, true);
  assert.ok(job.tags.includes("task"));
  assert.ok(job.tags.includes("campus-task"));
});
```

- [ ] **Step 2: Run the focused failing tests**

Run:

```powershell
npm test -- tests/jobLogic.test.mjs
```

Expected: FAIL because `workMode`, campus task filtering, task-field validation, and task metadata are not implemented.

- [ ] **Step 3: Add work-mode constants**

Create `src/workModes.js`:

```js
export const workModes = ["job", "task"];
export const workModeFilters = ["job", "task", "campusTask"];
export const taskSources = ["employer", "campus"];
export const taskTypes = ["home", "campus", "local", "ai", "content", "ops"];
export const difficulties = ["easy", "standard", "skilled"];
export const settlements = ["daily", "nextDay", "weekly", "afterDone"];

export function normalizeWorkMode(value) {
  return value === "task" ? "task" : "job";
});

export function normalizeTaskSource(value) {
  return value === "campus" ? "campus" : "employer";
}

export function isLightTask(job) {
  return normalizeWorkMode(job?.workMode) === "task";
}

export function matchesWorkModeFilter(job, filter) {
  if (!filter) return true;
  if (filter === "campusTask") return isLightTask(job) && normalizeTaskSource(job?.taskSource) === "campus";
  return normalizeWorkMode(job?.workMode) === filter;
}
```

- [ ] **Step 4: Update `src/jobLogic.js` imports and filter**

At the top:

```js
import { difficulties, matchesWorkModeFilter, normalizeTaskSource, normalizeWorkMode, settlements, taskTypes } from "./workModes.js";
```

Inside `filterJobs`, add:

```js
  const workMode = normalize(filters.workMode);
```

Inside the filter callback, add:

```js
    const matchesWorkMode = matchesWorkModeFilter(job, workMode);
```

Return with the new condition:

```js
    return matchesKeyword && matchesLocation && matchesCategory && matchesSchedule && matchesPay && matchesWorkMode;
```

- [ ] **Step 5: Update posting validation**

In `validatePosting`, after the existing description check, add:

```js
  if (normalizeWorkMode(form.workMode) === "task") {
    if (!taskTypes.includes(normalize(form.taskType))) errors.taskType = "Task type is required.";
    if (!normalize(form.estimatedTime)) errors.estimatedTime = "Estimated time is required.";
    if (!settlements.includes(normalize(form.settlement))) errors.settlement = "Settlement is required.";
    if (normalizeTaskSource(form.taskSource) === "campus" && !normalize(form.campusName)) errors.campusName = "Campus name is required.";
  }
```

- [ ] **Step 6: Update job creation**

In `createJobFromPosting`, define:

```js
  const workMode = normalizeWorkMode(form.workMode);
  const taskSource = normalizeTaskSource(form.taskSource);
  const remoteFriendly = form.remoteFriendly === true || form.remoteFriendly === "on";
```

Add these fields to the returned object:

```js
    workMode,
    taskSource: workMode === "task" ? taskSource : "employer",
    taskType: workMode === "task" ? normalize(form.taskType) : "",
    campusName: workMode === "task" && taskSource === "campus" ? normalize(form.campusName) : "",
    targetAudience: workMode === "task" && taskSource === "campus" ? normalize(form.targetAudience) : "",
    estimatedTime: workMode === "task" ? normalize(form.estimatedTime) : "",
    remoteFriendly: workMode === "task" ? remoteFriendly : remote,
    difficulty: workMode === "task" && difficulties.includes(normalize(form.difficulty))
      ? normalize(form.difficulty)
      : "standard",
    settlement: workMode === "task" ? normalize(form.settlement) : "",
```

Change `payType` to:

```js
    payType: normalize(form.payType) || (workMode === "task" ? "task" : "hour"),
```

Change `tags` to include mode:

```js
    tags: [normalize(form.category), workMode, taskSource === "campus" ? "campus-task" : "", remote ? "remote" : "local"].filter(Boolean),
```

- [ ] **Step 7: Add seed light tasks**

In `src/jobs.js`, import nothing; append two seed jobs to `seedJobs` with these fields:

```js
{
  id: "task-video-captions",
  workMode: "task",
  title: "Short Video Caption Cleanup",
  employer: "Bright Desk",
  category: "Remote",
  taskType: "content",
  pay: 35,
  payType: "task",
  estimatedTime: "60-90 minutes",
  settlement: "afterDone",
  difficulty: "easy",
  remoteFriendly: true,
  location: "Remote",
  remote: true,
  schedule: "Flexible",
  description: "Clean up captions for two short product videos and return the corrected text.",
  requirements: ["Careful reading", "Basic Chinese and English", "Can finish within 24 hours"],
  verifiedEmployer: true,
  postedAt: "2026-04-26",
  tags: ["task", "remote", "captions"],
  localized: {
    zh: {
      title: "短视频字幕整理轻任务",
      description: "整理两条产品短视频字幕，修正错字并提交文字稿。",
      requirements: ["阅读细心", "基础中英文", "24 小时内可完成"]
    }
  }
}
```

Add a second local/campus task with `id: "task-campus-photo-check"`, `taskSource: "campus"`, `taskType: "campus"`, `campusName: "North City University"`, `targetAudience: "Students near the main library"`, `payType: "task"`, `estimatedTime: "45 minutes"`, `settlement: "nextDay"`, `remoteFriendly: false`, and `tags` containing `"campus-task"`.

- [ ] **Step 8: Run task tests**

Run:

```powershell
npm test -- tests/jobLogic.test.mjs
```

Expected: PASS for all job logic tests.

- [ ] **Step 9: Commit**

```powershell
git add src/workModes.js src/jobs.js src/jobLogic.js tests/jobLogic.test.mjs
git commit -m "feat: add light task job model"
```

## Task 2: Light Task Audit Rules

**Files:**
- Modify: `src/audit.js`
- Modify: `tests/audit.test.mjs`

- [ ] **Step 1: Add failing audit tests**

Append to `tests/audit.test.mjs`:

```js
test("auditJob flags light-task deposit and brushing language", () => {
  const audit = auditJob({
    workMode: "task",
    title: "Easy order brushing task",
    employer: "Fast Growth",
    pay: 500,
    payType: "task",
    location: "Remote",
    schedule: "Flexible",
    description: "刷单任务，先交保证金，完成后高额返利。"
  });

  assert.equal(audit.level, "high");
  assert.equal(audit.recommendation, "reject");
  assert.ok(audit.reasons.some((reason) => reason.includes("brushing")));
  assert.ok(audit.reasons.some((reason) => reason.includes("deposit")));
});

test("auditJob flags campus tasks that pretend to be company hiring", () => {
  const audit = auditJob({
    workMode: "task",
    taskSource: "campus",
    title: "Student company hiring agent",
    employer: "Student Project",
    pay: 80,
    payType: "task",
    location: "Campus",
    schedule: "Flexible",
    description: "学生发起企业招聘代理，要求同学私下转账押金后安排岗位。"
  });

  assert.equal(audit.level, "high");
  assert.ok(audit.reasons.some((reason) => reason.includes("campus task")));
}

test("auditJob keeps normal light tasks low risk", () => {
  const audit = auditJob({
    workMode: "task",
    title: "Photo label cleanup",
    employer: "Campus Studio",
    pay: 35,
    payType: "task",
    location: "Remote",
    schedule: "Flexible",
    description: "Review twenty photo labels and mark whether the product name is readable."
  });

  assert.equal(audit.level, "low");
});
```

- [ ] **Step 2: Run failing audit test**

```powershell
npm test -- tests/audit.test.mjs
```

Expected: FAIL because brushing and task-specific high pay rules are missing.

- [ ] **Step 3: Add task risk patterns**

In `src/audit.js`, add near the existing regex constants:

```js
const taskBrushingPattern = /刷单|刷量|好评返现|垫付|返利|代收款|代转账|order brushing|fake review|rebate/i;
const greyWorkPattern = /博彩|贷款引流|色情|擦边|灰产|网赌|casino|loan lead|adult/i;
const campusImpersonationPattern = /企业招聘代理|代招|私下转账|冒充企业|company hiring agent|off-platform hiring/i;
```

In `auditJob`, after suspicious link handling, add:

```js
  if (taskBrushingPattern.test(text)) {
    score += 50;
    reasons.push("Contains brushing, rebate, advance-payment, or proxy-transfer language.");
  }

  if (greyWorkPattern.test(text)) {
    score += 50;
    reasons.push("Mentions adult, gambling, loan-lead, or grey-market work.");
  }

  if (job.taskSource === "campus" && campusImpersonationPattern.test(text)) {
    score += 45;
    reasons.push("Campus task may be pretending to be company hiring or moving payment off platform.");
  }
```

After the hourly high-pay rule, add:

```js
  if (job.workMode === "task" && numberPay(job) > 300) {
    score += 25;
    reasons.push("Unusually high pay for a small light task.");
  }
```

- [ ] **Step 4: Run audit tests**

```powershell
npm test -- tests/audit.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/audit.js tests/audit.test.mjs
git commit -m "feat: audit light task risks"
```

## Task 3: Growth Helpers

**Files:**
- Create: `src/growth.js`
- Create: `tests/growth.test.mjs`

- [ ] **Step 1: Add helper tests**

Create `tests/growth.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInviteText,
  createReferralCode,
  growthRiskReasons,
  normalizeReferralCode,
  rewardForEvent
} from "../src/growth.js";

test("normalizeReferralCode uppercases and removes unsafe characters", () => {
  assert.equal(normalizeReferralCode(" kp-12 ab "), "KP12AB");
});

test("createReferralCode returns a unique readable code", () => {
  const code = createReferralCode("Mia Cafe", new Set(["MIA123"]));
  assert.match(code, /^[A-Z0-9]{6,10}$/);
  assert.notEqual(code, "MIA123");
});

test("rewardForEvent returns non-payment rewards", () => {
  assert.deepEqual(rewardForEvent("application"), {
    points: 3,
    benefit: "light-task-priority"
  });
});

test("buildInviteText includes the referral code and avoids cash wording", () => {
  const text = buildInviteText({ referralCode: "KP88AA", locale: "zh" });
  assert.match(text, /KP88AA/);
  assert.doesNotMatch(text, /现金|提现|打款/);
});

test("growthRiskReasons flags risky invite copy", () => {
  const reasons = growthRiskReasons("加入团队发展下线，躺赚高收益");
  assert.ok(reasons.some((reason) => reason.includes("multi-level")));
  assert.ok(reasons.some((reason) => reason.includes("high-income")));
});
```

- [ ] **Step 2: Run failing helper tests**

```powershell
npm test -- tests/growth.test.mjs
```

Expected: FAIL because `src/growth.js` does not exist.

- [ ] **Step 3: Implement helpers**

Create `src/growth.js`:

```js
const codeSafePattern = /[^A-Z0-9]/g;
const multiLevelPattern = /下线|拉人头|团队返利|多级|裂变返佣|multi-level|downline/i;
const highIncomePattern = /躺赚|高收益|稳赚|日入|月入过万|guaranteed income|easy money/i;
const joiningFeePattern = /入会费|保证金|培训费|材料费|先交钱|joining fee|deposit/i;

export const referralEventTypes = ["registration", "application", "employerLead", "approvedPost"];

export const rewardRules = {
  registration: { points: 1, benefit: "profile-boost" },
  application: { points: 3, benefit: "light-task-priority" },
  employerLead: { points: 10, benefit: "partner-badge" },
  approvedPost: { points: 20, benefit: "featured-credit" }
};

export function normalizeReferralCode(value) {
  return String(value || "").toUpperCase().replace(codeSafePattern, "").slice(0, 12);
}

export function createReferralCode(seed = "KP", existing = new Set()) {
  const prefix = normalizeReferralCode(seed).slice(0, 3) || "KP";
  for (let index = 0; index < 100; index += 1) {
    const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 7);
    const code = normalizeReferralCode(`${prefix}${suffix}`).slice(0, 10);
    if (code.length >= 6 && !existing.has(code)) return code;
  }
  return `KP${Date.now().toString(36).toUpperCase()}`.slice(0, 10);
}

export function rewardForEvent(type) {
  return rewardRules[type] ? { ...rewardRules[type] } : { points: 0, benefit: "manual-review" };
}

export function buildInviteText({ referralCode, locale = "zh" }) {
  const code = normalizeReferralCode(referralCode);
  if (locale === "en") {
    return `I am using KuaiPin Jobs to find verified part-time jobs and light tasks. Use invite code ${code} when you join.`;
  }
  return `我在快聘兼职看靠谱兼职和轻任务，注册或申请时填写邀请码 ${code}，可以优先看到适合学生和居家可做的任务。`;
}

export function growthRiskReasons(text) {
  const value = String(text || "");
  const reasons = [];
  if (multiLevelPattern.test(value)) reasons.push("Contains multi-level or downline language.");
  if (highIncomePattern.test(value)) reasons.push("Contains guaranteed or high-income claims.");
  if (joiningFeePattern.test(value)) reasons.push("Contains joining-fee or upfront-payment language.");
  return reasons;
}
```

- [ ] **Step 4: Run helper tests**

```powershell
npm test -- tests/growth.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/growth.js tests/growth.test.mjs
git commit -m "feat: add referral growth helpers"
```

## Task 4: Store Referrals, Partners, And Rewards

**Files:**
- Modify: `scripts/data-store.mjs`
- Modify: `tests/dataStore.test.mjs`

- [ ] **Step 1: Add failing store tests**

Append to `tests/dataStore.test.mjs`:

```js
test("store gives users referral codes and records referred registrations", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });
    assert.match(admin.user.referralCode, /^[A-Z0-9]{6,12}$/);

    await store.registerEmployer({
      name: "Nina",
      email: "nina@example.com",
      password: "secret123",
      company: "Nina Studio",
      publisherType: "student",
      campusName: "North City University",
      referralCode: admin.user.referralCode
    });
    const studentPublisher = await store.login({ email: "nina@example.com", password: "secret123" });
    assert.equal(studentPublisher.user.publisherType, "student");
    assert.equal(studentPublisher.user.campusName, "North City University");

    const growth = await store.adminGrowth(admin.token);
    assert.ok(growth.referralEvents.some((event) => event.type === "registration" && event.referrerId === "admin-demo"));
    assert.ok(growth.rewardLedger.some((reward) => reward.benefit === "profile-boost"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store records referred applications as pending non-payment rewards", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });
    const jobs = await store.publicJobs();

    await store.createApplication({
      jobId: jobs[0].id,
      name: "Kai",
      contact: "kai@example.com",
      availability: "Tonight",
      message: "I can help.",
      referralCode: admin.user.referralCode
    });

    const growth = await store.adminGrowth(admin.token);
    const event = growth.referralEvents.find((item) => item.type === "application");
    assert.equal(event.status, "pending");
    assert.equal(event.referrerId, "admin-demo");
    assert.ok(growth.rewardLedger.some((reward) => reward.eventId === event.id && reward.benefit === "light-task-priority"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store accepts campus partner applications and lets admin review them", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });
    const partner = await store.createPartnerApplication({
      name: "Lin",
      contact: "lin@example.com",
      campus: "North City University",
      channel: "Class groups",
      note: "I can share light tasks with classmates."
    });

    assert.equal(partner.status, "pending");
    assert.match(partner.referralCode, /^[A-Z0-9]{6,12}$/);

    const approved = await store.updatePartnerStatus(admin.token, partner.id, "approved");
    assert.equal(approved.status, "approved");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("student publishers can create campus tasks but not ordinary jobs", async () => {
  const { dir, store } = await tempStore();
  try {
    await store.registerEmployer({
      name: "Student Maker",
      email: "student@example.com",
      password: "secret123",
      company: "Student Project",
      publisherType: "student",
      campusName: "North City University"
    });
    const student = await store.login({ email: "student@example.com", password: "secret123" });

    await assert.rejects(
      () => store.createJob(student.token, {
        workMode: "job",
        title: "Long-term shop assistant",
        employer: "Student Project",
        category: "Retail",
        pay: 20,
        location: "Campus",
        schedule: "Weekend",
        description: "A normal part-time role."
      }),
      /Student publishers can only post light tasks/
    );

    const task = await store.createJob(student.token, {
      workMode: "task",
      taskSource: "campus",
      title: "Club event check-in helper",
      employer: "Student Project",
      category: "Campus",
      taskType: "campus",
      campusName: "North City University",
      targetAudience: "Students free this Friday",
      pay: 40,
      payType: "task",
      estimatedTime: "2 hours",
      settlement: "afterDone",
      location: "Campus",
      schedule: "Weekend",
      description: "Help a student club check in guests and organize material packs."
    });

    assert.equal(task.status, "pending");
    assert.equal(task.taskSource, "campus");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run failing data-store tests**

```powershell
npm test -- tests/dataStore.test.mjs
```

Expected: FAIL because growth store methods, publisher fields, and referral fields are missing.

- [ ] **Step 3: Import growth helpers**

At the top of `scripts/data-store.mjs`:

```js
import { createReferralCode, normalizeReferralCode, rewardForEvent } from "../src/growth.js";
```

- [ ] **Step 4: Add store helper functions**

Near existing helpers:

```js
function allReferralCodes(db) {
  return new Set([
    ...(db.users || []).map((user) => user.referralCode).filter(Boolean),
    ...(db.partnerApplications || []).map((partner) => partner.referralCode).filter(Boolean)
  ]);
}

function ensureReferralCode(db, owner) {
  if (!owner.referralCode) owner.referralCode = createReferralCode(owner.company || owner.name || owner.email, allReferralCodes(db));
  return owner.referralCode;
}

function findReferrer(db, code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  const user = db.users.find((item) => item.referralCode === normalized);
  if (user) return { kind: "user", id: user.id, code: normalized };
  const partner = db.partnerApplications.find((item) => item.referralCode === normalized);
  if (partner) return { kind: "partner", id: partner.id, code: normalized };
  return null;
}

function addReferralEvent(db, { type, referralCode, subjectId, source }) {
  const referrer = findReferrer(db, referralCode);
  if (!referrer) return null;
  const reward = rewardForEvent(type);
  const event = {
    id: `event-${Date.now()}-${db.referralEvents.length + 1}`,
    type,
    referrerKind: referrer.kind,
    referrerId: referrer.id,
    referralCode: referrer.code,
    subjectId,
    source,
    status: "pending",
    createdAt: new Date().toISOString(),
    adminNotes: ""
  };
  db.referralEvents.unshift(event);
  db.rewardLedger.unshift({
    id: `reward-${Date.now()}-${db.rewardLedger.length + 1}`,
    eventId: event.id,
    reason: type,
    points: reward.points,
    benefit: reward.benefit,
    status: "pending",
    createdAt: event.createdAt
  });
  return event;
}
```

- [ ] **Step 5: Extend initial DB and shape migration**

In `ensureDbShape(db)`, add:

```js
  if (!Array.isArray(db.partnerApplications)) db.partnerApplications = [];
  if (!Array.isArray(db.referralEvents)) db.referralEvents = [];
  if (!Array.isArray(db.rewardLedger)) db.rewardLedger = [];
  for (const user of db.users || []) ensureReferralCode(db, user);
  for (const user of db.users || []) {
    if (!user.publisherType) user.publisherType = "employer";
  }
```

In each seed user in `initialDb`, add stable codes:

```js
referralCode: "KPADMIN",
publisherType: "employer",
points: 0,
```

and for the seed employer:

```js
referralCode: "KPSHOP",
publisherType: "employer",
points: 0,
```

- [ ] **Step 6: Include growth data in public users**

In `publicUser(user)`, add:

```js
    referralCode: user.referralCode,
    points: user.points || 0,
    publisherType: user.publisherType || "employer",
    campusName: user.campusName || "",
```

- [ ] **Step 7: Record referred registrations**

Change `registerEmployer({ name, email, password, company })` to accept publisher type and referral:

```js
  async function registerEmployer({ name, email, password, company, publisherType, campusName, referralCode }) {
```

When creating the new user object, add:

```js
        publisherType: publisherType === "student" ? "student" : "employer",
        campusName: publisherType === "student" ? normalize(campusName) : "",
        points: 0,
```

After pushing the new user, call:

```js
      ensureReferralCode(db, user);
      addReferralEvent(db, {
        type: "registration",
        referralCode,
        subjectId: user.id,
        source: "employer-registration"
      });
```

- [ ] **Step 8: Record referred applications**

In `createApplication(form)`, after pushing the application:

```js
      addReferralEvent(db, {
        type: "application",
        referralCode: form.referralCode,
        subjectId: application.id,
        source: "application"
      });
```

- [ ] **Step 8a: Restrict student publishers to light tasks**

In `createJob(token, form)`, after loading `user` and checking role, add:

```js
    if ((user.publisherType || "employer") === "student" && form.workMode !== "task") {
      const error = new Error("Student publishers can only post light tasks.");
      error.status = 403;
      throw error;
    }
```

When a student publisher submits a task without `taskSource`, set `form.taskSource = "campus"` before calling `createJobFromPosting(form)`.

- [ ] **Step 9: Add partner and admin growth methods**

Inside `createStore`, add:

```js
  async function createPartnerApplication(form) {
    return change((db) => {
      const partner = {
        id: `partner-${Date.now()}`,
        name: normalize(form.name),
        contact: normalize(form.contact),
        campus: normalize(form.campus),
        channel: normalize(form.channel),
        note: normalize(form.note),
        referralCode: createReferralCode(form.campus || form.name || "KP", allReferralCodes(db)),
        status: "pending",
        riskStatus: "normal",
        createdAt: new Date().toISOString(),
        adminNotes: ""
      };
      if (!partner.name || !partner.contact) {
        const error = new Error("Name and contact are required.");
        error.status = 400;
        throw error;
      }
      db.partnerApplications.unshift(partner);
      return partner;
    });
  }

  async function adminGrowth(token) {
    await requireAdmin(token);
    const db = await readDb();
    return {
      partnerApplications: db.partnerApplications,
      referralEvents: db.referralEvents,
      rewardLedger: db.rewardLedger
    };
  }

  async function updatePartnerStatus(token, partnerId, status) {
    await requireAdmin(token);
    return change((db) => {
      const partner = db.partnerApplications.find((item) => item.id === partnerId);
      if (!partner) {
        const error = new Error("Partner application not found.");
        error.status = 404;
        throw error;
      }
      if (!["pending", "approved", "rejected", "frozen"].includes(status)) {
        const error = new Error("Invalid partner status.");
        error.status = 400;
        throw error;
      }
      partner.status = status;
      return partner;
    });
  }
```

Return these methods from `createStore`.

- [ ] **Step 10: Run data-store tests**

```powershell
npm test -- tests/dataStore.test.mjs
```

Expected: PASS.

- [ ] **Step 11: Commit**

```powershell
git add scripts/data-store.mjs tests/dataStore.test.mjs
git commit -m "feat: store invite growth data"
```

## Task 5: API Routes For Growth

**Files:**
- Modify: `scripts/dev-server.mjs`
- Modify: `tests/dataStore.test.mjs`

- [ ] **Step 1: Add route behavior expectation to store tests**

No HTTP integration harness exists, so keep route verification as manual plus syntax checks. Add one assertion to the existing partner test that `adminGrowth` exposes all three lists:

```js
const growth = await store.adminGrowth(admin.token);
assert.ok(Array.isArray(growth.partnerApplications));
assert.ok(Array.isArray(growth.referralEvents));
assert.ok(Array.isArray(growth.rewardLedger));
```

- [ ] **Step 2: Add API routes**

In `scripts/dev-server.mjs`, inside `handleApi`, add after session route:

```js
  if (method === "POST" && url.pathname === "/api/growth/partners") {
    return sendJson(response, 201, { partner: await store.createPartnerApplication(await readJson(request)) });
  }
```

Add near admin routes:

```js
  if (method === "GET" && url.pathname === "/api/admin/growth") {
    return sendJson(response, 200, await store.adminGrowth(token));
  }

  const partnerStatusMatch = url.pathname.match(/^\/api\/admin\/growth\/partners\/([^/]+)\/status$/);
  if (method === "POST" && partnerStatusMatch) {
    const body = await readJson(request);
    return sendJson(response, 200, {
      partner: await store.updatePartnerStatus(token, partnerStatusMatch[1], body.status)
    });
  }
```

- [ ] **Step 3: Run tests and syntax check**

```powershell
npm test
node --check scripts/dev-server.mjs
```

Expected: all tests PASS and syntax check has no output.

- [ ] **Step 4: Commit**

```powershell
git add scripts/dev-server.mjs tests/dataStore.test.mjs
git commit -m "feat: expose growth api routes"
```

## Task 6: Light Task UI And Copy

**Files:**
- Modify: `src/i18n.js`
- Modify: `src/app.js`
- Modify: `src/styles.css`
- Modify: `tests/i18n.test.mjs`

- [ ] **Step 1: Add i18n tests**

Append to `tests/i18n.test.mjs`:

```js
test("light task labels have Chinese and English fallbacks", () => {
  assert.equal(t("en", "lightTasks"), "Light tasks");
  assert.equal(t("en", "campusTaskStation"), "Campus task station");
  assert.equal(labelFor("en", "workModes", "task"), "Light task");
  assert.equal(labelFor("en", "workModes", "campusTask"), "Campus task station");
  assert.equal(labelFor("en", "taskTypes", "home"), "Work from home");
  assert.equal(labelFor("en", "settlements", "afterDone"), "After completion");
});
```

- [ ] **Step 2: Run failing i18n tests**

```powershell
npm test -- tests/i18n.test.mjs
```

Expected: FAIL because new keys and label groups are missing.

- [ ] **Step 3: Add i18n messages**

In both `zh` and `en` message maps, add keys:

```js
lightTasks: "轻任务",
campusTaskStation: "校园任务站",
ordinaryJobs: "普通兼职",
allWorkModes: "全部模式",
workModeLabel: "工作模式",
taskSourceLabel: "发起来源",
campusName: "学校/校区",
targetAudience: "适合同学",
studentInitiated: "学生发起",
taskTypeLabel: "任务类型",
estimatedTime: "预计耗时",
difficulty: "难度",
settlement: "结算方式",
remoteFriendly: "可居家完成",
takeTask: "接任务/申请",
postType: "发布类型",
publishTask: "发布轻任务",
publishCampusTask: "发布校园任务",
taskSubmittedForReview: "轻任务已提交审核。",
partnerProgram: "校园合伙人",
myInvites: "我的邀请",
publisherTypeLabel: "发布者类型",
publisherEmployer: "商家/组织",
publisherStudent: "学生发起人",
```

Use English equivalents in `en`.

Add label groups:

```js
workModes: {
  zh: { job: "普通兼职", task: "轻任务", campusTask: "校园任务站" },
  en: { job: "Part-time job", task: "Light task", campusTask: "Campus task station" }
},
taskSources: {
  zh: { employer: "商家/组织发起", campus: "学生发起" },
  en: { employer: "Employer / organization", campus: "Student initiated" }
},
taskTypes: {
  zh: { home: "在家可做", campus: "校园任务", local: "同城临时", ai: "AI 协助", content: "内容任务", ops: "简单运营" },
  en: { home: "Work from home", campus: "Campus", local: "Local errand", ai: "AI assist", content: "Content", ops: "Simple ops" }
},
difficulties: {
  zh: { easy: "简单", standard: "标准", skilled: "需要技能" },
  en: { easy: "Easy", standard: "Standard", skilled: "Skilled" }
},
settlements: {
  zh: { daily: "日结", nextDay: "次日结", weekly: "周结", afterDone: "完成后结算" },
  en: { daily: "Daily", nextDay: "Next day", weekly: "Weekly", afterDone: "After completion" }
}
```

- [ ] **Step 4: Wire app state and filters**

In `src/app.js`, import:

```js
import { difficulties, settlements, taskSources, taskTypes, workModeFilters } from "./workModes.js";
```

Add `workMode: ""` to `state.filters`.

In the toolbar, add a compact segmented select:

```js
<select data-filter="workMode" aria-label="${text("workModeLabel")}">
  <option value="">${text("allWorkModes")}</option>
  ${optionList(workModeFilters, state.filters.workMode, "workModes")}
</select>
```

Reset filters after posting with:

```js
state.filters = { keyword: "", location: "", category: "", schedule: "", minPay: "", workMode: "" };
```

- [ ] **Step 4a: Add publisher type to registration form**

In `renderAuthPanel`, add fields inside `[data-register-form]`:

```js
<label>${text("publisherTypeLabel")}<select name="publisherType">
  <option value="employer">${text("publisherEmployer")}</option>
  <option value="student">${text("publisherStudent")}</option>
</select></label>
<label>${text("campusName")}<input name="campusName" value="${escapeHtml(state.drafts.register.campusName || "")}"></label>
```

Keep the existing API endpoint. The backend will store `publisherType: "student"` and let that account publish light/campus tasks through the normal reviewed posting flow.

- [ ] **Step 5: Render light-task metadata**

Create helper in `src/app.js`:

```js
function renderTaskMeta(job) {
  if (job.workMode !== "task") return "";
  return `
    <div class="task-meta">
      ${job.taskSource === "campus" ? `<span>${text("studentInitiated")}</span>` : ""}
      <span>${escapeHtml(labelFor(state.locale, "taskTypes", job.taskType))}</span>
      ${job.campusName ? `<span>${escapeHtml(job.campusName)}</span>` : ""}
      <span>${escapeHtml(job.estimatedTime || "-")}</span>
      <span>${escapeHtml(labelFor(state.locale, "settlements", job.settlement))}</span>
      <span>${job.remoteFriendly ? text("remoteFriendly") : escapeHtml(job.location)}</span>
    </div>
  `;
}
```

Call it inside `renderJobCard(job)` below the normal meta line and inside `renderDetail(job)` before requirements.

Change application button text:

```js
const applyText = job.workMode === "task" ? text("takeTask") : text("applyNow");
```

- [ ] **Step 6: Extend posting form**

In `renderPostingForm`, add selects and conditional fields. Always render fields; use concise labels:

```js
<label>${text("postType")}<select name="workMode">
  ${optionList(workModeFilters, draft.workMode || "job", "workModes")}
</select></label>
<label>${text("taskSourceLabel")}<select name="taskSource">
  ${optionList(taskSources, draft.taskSource || "employer", "taskSources")}
</select></label>
<label>${text("taskTypeLabel")}<select name="taskType">
  <option value="">${text("taskTypeLabel")}</option>
  ${optionList(taskTypes, draft.taskType || "", "taskTypes")}
</select>${fieldError("taskType")}</label>
<label>${text("campusName")}<input name="campusName" value="${escapeHtml(draft.campusName || "")}" ${fieldState("campusName")}>${fieldError("campusName")}</label>
<label>${text("targetAudience")}<input name="targetAudience" value="${escapeHtml(draft.targetAudience || "")}"></label>
<label>${text("estimatedTime")}<input name="estimatedTime" value="${escapeHtml(draft.estimatedTime || "")}" ${fieldState("estimatedTime")}>${fieldError("estimatedTime")}</label>
<label>${text("difficulty")}<select name="difficulty">${optionList(difficulties, draft.difficulty || "standard", "difficulties")}</select></label>
<label>${text("settlement")}<select name="settlement">
  <option value="">${text("settlement")}</option>
  ${optionList(settlements, draft.settlement || "", "settlements")}
</select>${fieldError("settlement")}</label>
<label class="checkbox-line"><input name="remoteFriendly" type="checkbox" ${draft.remoteFriendly ? "checked" : ""}> ${text("remoteFriendly")}</label>
```

- [ ] **Step 7: Run tests and commit**

```powershell
npm test
git add src/i18n.js src/app.js src/styles.css tests/i18n.test.mjs
git commit -m "feat: add light task interface"
```

Expected: tests PASS. If visual spacing is rough, fix in Task 8.

## Task 7: Growth UI

**Files:**
- Modify: `src/app.js`
- Modify: `src/i18n.js`
- Modify: `src/styles.css`

- [ ] **Step 1: Extend state and data refresh**

In `src/app.js` state, add:

```js
  adminGrowth: { partnerApplications: [], referralEvents: [], rewardLedger: [] },
  partnerResult: null,
```

In `refreshData`, when `state.user.role === "admin"`, fetch:

```js
const [{ jobs }, { applications }, { leads }, growth] = await Promise.all([
  api("/api/admin/jobs"),
  api("/api/admin/applications"),
  api("/api/admin/leads"),
  api("/api/admin/growth")
]);
state.adminGrowth = growth;
```

- [ ] **Step 2: Add invite text UI**

Import:

```js
import { buildInviteText } from "./growth.js";
```

Add render function:

```js
function renderInvitePanel() {
  if (!state.user?.referralCode) return "";
  const inviteText = buildInviteText({ referralCode: state.user.referralCode, locale: state.locale });
  return `
    <section class="ops-card">
      <p class="eyebrow">${text("myInvites")}</p>
      <h2>${escapeHtml(state.user.referralCode)}</h2>
      <p class="muted">${escapeHtml(inviteText)}</p>
      <button class="secondary-button" type="button" data-copy-invite>${text("copyInviteText")}</button>
    </section>
  `;
}
```

Render it in `renderEmployerDashboard()` for logged-in users.

- [ ] **Step 3: Add partner form**

Add render function:

```js
function renderPartnerProgram() {
  return `
    <section class="ops-card">
      <p class="eyebrow">${text("partnerProgram")}</p>
      <h2>${text("partnerHeadline")}</h2>
      <p class="muted">${text("partnerCopy")}</p>
      <form class="stack-form" data-partner-form>
        <label>${text("name")}<input name="name"></label>
        <label>${text("contactMethod")}<input name="contact"></label>
        <label>${text("campus")}<input name="campus"></label>
        <label>${text("promotionChannel")}<input name="channel"></label>
        <label>${text("message")}<textarea name="note" rows="3"></textarea></label>
        <button class="primary-button" type="submit">${text("applyPartner")}</button>
      </form>
      ${state.partnerResult ? `<p class="notice">${text("partnerCodeReady", { code: state.partnerResult.referralCode })}</p>` : ""}
    </section>
  `;
}
```

Render it below the main board so anonymous visitors can apply.

- [ ] **Step 4: Add admin growth review**

Add render function:

```js
function renderAdminGrowth() {
  if (state.user?.role !== "admin") return "";
  const growth = state.adminGrowth;
  return `
    <section class="dashboard admin-panel">
      <div class="section-heading">
        <p class="eyebrow">${text("growthReview")}</p>
        <h2>${text("partnerProgram")}</h2>
      </div>
      <div class="ops-grid">
        ${growth.partnerApplications.map((partner) => `
          <article class="ops-card">
            <strong>${escapeHtml(partner.name)}</strong>
            <p class="muted">${escapeHtml(partner.campus || "-")} · ${escapeHtml(partner.referralCode)}</p>
            <p>${escapeHtml(partner.note || "")}</p>
            <div class="action-row">
              <button class="secondary-button" type="button" data-partner-status="approved" data-partner-id="${escapeHtml(partner.id)}">${text("approve")}</button>
              <button class="secondary-button" type="button" data-partner-status="frozen" data-partner-id="${escapeHtml(partner.id)}">${text("freeze")}</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}
```

Render after `renderEmployerOutreach()`.

- [ ] **Step 5: Wire click and submit handlers**

In click handler:

```js
const copyInviteButton = event.target.closest("[data-copy-invite]");
const partnerStatusButton = event.target.closest("[data-partner-status]");
```

Add branches:

```js
if (copyInviteButton) {
  await copyTextToClipboard(buildInviteText({ referralCode: state.user.referralCode, locale: state.locale }));
  state.notice = "inviteCopied";
  render();
  return;
}

if (partnerStatusButton) {
  await api(`/api/admin/growth/partners/${partnerStatusButton.dataset.partnerId}/status`, {
    method: "POST",
    body: JSON.stringify({ status: partnerStatusButton.dataset.partnerStatus })
  });
  state.notice = "partnerUpdated";
  await refreshData();
  render();
  return;
}
```

In submit handler, include `partnerForm` in detection and add:

```js
if (partnerForm) {
  const { partner } = await api("/api/growth/partners", {
    method: "POST",
    body: JSON.stringify(formData(partnerForm))
  });
  state.partnerResult = partner;
  state.notice = "partnerApplied";
  render();
  return;
}
```

- [ ] **Step 6: Add i18n keys**

Add Chinese/English keys:

```js
copyInviteText,
inviteCopied,
partnerHeadline,
partnerCopy,
campus,
promotionChannel,
applyPartner,
partnerCodeReady,
partnerApplied,
growthReview,
freeze,
partnerUpdated
```

- [ ] **Step 7: Run checks and commit**

```powershell
npm test
node --check src/app.js
git add src/app.js src/i18n.js src/styles.css
git commit -m "feat: add invite growth interface"
```

Expected: tests PASS and syntax check has no output.

## Task 8: Final Styling And Browser Verification

**Files:**
- Modify: `src/styles.css`
- Optional Modify: `src/app.js`

- [ ] **Step 1: Add stable compact styles**

Add to `src/styles.css`:

```css
.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.task-meta span,
.checkbox-line {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--surface);
  font-size: 0.85rem;
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notice {
  border-radius: 6px;
  padding: 10px 12px;
  background: #ecfdf5;
  color: #065f46;
}
```

- [ ] **Step 2: Restart local server if needed**

Run:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*node*' } | Select-Object Id,ProcessName
npm run dev
```

Expected: server prints `Serving part-time jobs MVP at http://127.0.0.1:4173`.

- [ ] **Step 3: Browser manual verification**

Using the in-app browser at `http://127.0.0.1:4173/`, verify:

- 首页能看到“轻任务”筛选。
- 首页能看到“校园任务站”筛选。
- 轻任务卡片显示预计耗时、结算方式、任务类型。
- 校园任务站卡片显示“学生发起”和学校/校区。
- 点击轻任务详情，主按钮显示“接任务/申请”。
- 注册发布者账号时可以选择“学生发起人”并填写学校/校区。
- 登录雇主账号 `employer@quickshift.local / demo123` 后能看到“我的邀请”。
- 管理员账号 `admin@quickshift.local / admin123` 能看到增长审核入口。
- 提交校园合伙人申请后页面显示邀请码。

- [ ] **Step 4: Run final automated verification**

```powershell
npm test
node --check src/app.js
node --check src/growth.js
node --check src/jobLogic.js
node --check scripts/data-store.mjs
node --check scripts/dev-server.mjs
```

Expected: all tests PASS and syntax checks have no output.

- [ ] **Step 5: Commit polish**

```powershell
git add src/styles.css src/app.js
git commit -m "style: polish light task growth ui"
```

Skip this commit if no files changed in this task.

## Task 9: Completion Review

**Files:**
- No planned code changes.

- [ ] **Step 1: Check status**

```powershell
git status --short
```

Expected: only pre-existing unrelated generated outreach/branding files remain if they were already dirty before this plan. No task implementation files should be unstaged.

- [ ] **Step 2: Summarize completed behavior**

Prepare the final user summary with:

- Light-task zone added.
- 校园任务站 added for student-initiated campus tasks.
- Task posting and audit rules added.
- Invite code / campus partner growth added.
- Rewards are non-payment benefits only.
- Tests and browser checks run.

- [ ] **Step 3: Note remaining production gaps**

Mention clearly:

- No real payment.
- No real SMS/email sending.
- No production database.
- No external identity verification.

## Self-Review

Spec coverage:

- Light-task entry, 校园任务站 filters, student-initiated metadata, posting fields, application copy, admin review, and risk rules are covered by Tasks 1, 2, 6, and 8.
- Student publisher account fields and the rule that students can only publish light/campus tasks are covered by Tasks 4 and 6.
- Campus partner, invite codes, partner applications, referral events, non-payment rewards, and admin growth review are covered by Tasks 3, 4, 5, 7, and 8.
- The no-cash-reward requirement is covered by Task 3 helper tests and Task 4 reward data shape.

Placeholder scan:

- No placeholder markers or open-ended implementation steps remain.

Type consistency:

- `workMode`, `taskSource`, `campusName`, `targetAudience`, `taskType`, `estimatedTime`, `remoteFriendly`, `difficulty`, and `settlement` are introduced in Task 1 and used by UI in Task 6.
- `referralCode`, `referralEvents`, `rewardLedger`, and `partnerApplications` are introduced in Task 4 and consumed by API/UI in Tasks 5 and 7.
