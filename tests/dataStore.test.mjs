import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createStore } from "../scripts/data-store.mjs";

async function tempStore() {
  const dir = await mkdtemp(join(tmpdir(), "quickshift-store-"));
  return {
    dir,
    store: createStore(join(dir, "app-data.json"))
  };
}

test("store registers employer, logs in, and selects plan", async () => {
  const { dir, store } = await tempStore();
  try {
    await store.registerEmployer({
      name: "Mia",
      email: "mia@example.com",
      password: "secret123",
      company: "Mia Cafe"
    });
    const session = await store.login({ email: "mia@example.com", password: "secret123" });
    assert.equal(session.user.role, "employer");
    assert.equal(session.user.planId, "free");

    const updated = await store.selectPlan(session.token, "growth");
    assert.equal(updated.planId, "growth");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("seed admin uses the public brand name", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });

    assert.equal(admin.user.name, "快聘兼职 Admin");
    assert.equal(admin.user.company, "快聘兼职");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store creates pending audited job and admin can approve it", async () => {
  const { dir, store } = await tempStore();
  try {
    await store.registerEmployer({
      name: "Leo",
      email: "leo@example.com",
      password: "secret123",
      company: "Leo Events"
    });
    const employer = await store.login({ email: "leo@example.com", password: "secret123" });
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });

    const job = await store.createJob(employer.token, {
      title: "Event Helper",
      employer: "Leo Events",
      category: "Events",
      pay: 25,
      payType: "hour",
      location: "Chicago",
      schedule: "Weekend",
      description: "Help guests check in and organize badges for a weekend event.",
      contact: "leo@example.com"
    });

    assert.equal(job.status, "pending");
    assert.equal(job.audit.level, "low");
    assert.equal((await store.publicJobs()).some((item) => item.id === job.id), false);

    const approved = await store.setJobStatus(admin.token, job.id, "approved");
    assert.equal(approved.status, "approved");
    assert.equal((await store.publicJobs()).some((item) => item.id === job.id), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store createJob preserves campus task metadata", async () => {
  const { dir, store } = await tempStore();
  try {
    await store.registerEmployer({
      name: "Nora",
      email: "nora@example.com",
      password: "secret123",
      company: "Campus Club"
    });
    const employer = await store.login({ email: "nora@example.com", password: "secret123" });

    const job = await store.createJob(employer.token, {
      workMode: "task",
      taskSource: "campus",
      title: "Campus poster photo check",
      employer: "Campus Club",
      category: "Campus",
      taskType: "campus",
      campusName: "North City University",
      targetAudience: "Students near the main library",
      pay: "35",
      payType: "task",
      estimatedTime: "45 minutes",
      settlement: "nextDay",
      difficulty: "easy",
      remoteFriendly: "on",
      location: "Campus",
      schedule: "Flexible",
      description: "Check poster photos near the main library and mark whether each store name is visible.",
      contact: "club@example.com"
    });

    assert.equal(job.workMode, "task");
    assert.equal(job.taskSource, "campus");
    assert.equal(job.taskType, "campus");
    assert.equal(job.campusName, "North City University");
    assert.equal(job.targetAudience, "Students near the main library");
    assert.equal(job.payType, "task");
    assert.equal(job.estimatedTime, "45 minutes");
    assert.equal(job.settlement, "nextDay");
    assert.equal(job.difficulty, "easy");
    assert.equal(job.remoteFriendly, true);
    assert.ok(job.tags.includes("task"));
    assert.ok(job.tags.includes("campus-task"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store rejects invalid postings sent directly to the API layer", async () => {
  const { dir, store } = await tempStore();
  try {
    const employer = await store.login({ email: "employer@quickshift.local", password: "demo123" });

    await assert.rejects(
      () => store.createJob(employer.token, {
        workMode: "task",
        taskSource: "campus",
        title: "",
        employer: "Campus Club",
        pay: "0",
        location: "",
        schedule: "",
        description: ""
      }),
      (error) => {
        assert.equal(error.status, 400);
        assert.match(error.message, /Job title is required/);
        assert.match(error.message, /Pay must be greater than 0/);
        assert.match(error.message, /Task type is required/);
        return true;
      }
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("admin can manage employer outreach leads and employers cannot access them", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });
    const employer = await store.login({ email: "employer@quickshift.local", password: "demo123" });

    const leads = await store.adminLeads(admin.token);
    assert.ok(leads.length >= 5);
    assert.equal(leads[0].status, "new");

    const updated = await store.updateLead(admin.token, leads[0].id, {
      status: "contacted",
      notes: "Sent the free first-job SMS.",
      lastContactedAt: "2026-04-26T12:00:00.000Z"
    });

    assert.equal(updated.status, "contacted");
    assert.equal(updated.notes, "Sent the free first-job SMS.");
    assert.equal(updated.lastContactedAt, "2026-04-26T12:00:00.000Z");

    await assert.rejects(() => store.adminLeads(employer.token), /Admin access required/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

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
    const event = growth.referralEvents.find((item) => item.type === "registration" && item.referrerId === "admin-demo");
    assert.equal(event.referrerKind, "user");
    assert.equal(event.adminNotes, "");
    assert.ok(growth.rewardLedger.some((reward) => reward.eventId === event.id && reward.benefit === "profile-boost" && reward.reason === "registration"));
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
    assert.equal(event.referrerKind, "user");
    assert.equal(event.adminNotes, "");
    assert.ok(growth.rewardLedger.some((reward) => reward.eventId === event.id && reward.benefit === "light-task-priority" && reward.reason === "application"));
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

    const growth = await store.adminGrowth(admin.token);
    assert.ok(Array.isArray(growth.partnerApplications));
    assert.ok(Array.isArray(growth.referralEvents));
    assert.ok(Array.isArray(growth.rewardLedger));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("pending campus partner codes do not create referral rewards until approved", async () => {
  const { dir, store } = await tempStore();
  try {
    const admin = await store.login({ email: "admin@quickshift.local", password: "admin123" });
    const partner = await store.createPartnerApplication({
      name: "Pending Partner",
      contact: "pending@example.com",
      campus: "North City University"
    });

    await store.registerEmployer({
      name: "Referred Before Approval",
      email: "before-approval@example.com",
      password: "secret123",
      company: "Student Project",
      referralCode: partner.referralCode
    });
    let growth = await store.adminGrowth(admin.token);
    assert.equal(growth.referralEvents.some((event) => event.referrerId === partner.id), false);

    await store.updatePartnerStatus(admin.token, partner.id, "approved");
    await store.registerEmployer({
      name: "Referred After Approval",
      email: "after-approval@example.com",
      password: "secret123",
      company: "Student Project",
      referralCode: partner.referralCode
    });
    growth = await store.adminGrowth(admin.token);
    assert.equal(growth.referralEvents.some((event) => event.referrerId === partner.id), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store rejects blank campus partner applications", async () => {
  const { dir, store } = await tempStore();
  try {
    await assert.rejects(
      () => store.createPartnerApplication({ name: "", contact: "" }),
      (error) => {
        assert.equal(error.message, "Name and contact are required.");
        assert.equal(error.status, 400);
        return true;
      }
    );
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

test("store migration keeps seed referral codes stable", async () => {
  const { dir, store } = await tempStore();
  try {
    const file = join(dir, "app-data.json");
    await writeFile(
      file,
      `${JSON.stringify(
        {
          users: [
            {
              id: "admin-demo",
              role: "admin",
              name: "Old Admin",
              email: "admin@quickshift.local",
              company: "Old Brand",
              planId: "pro",
              createdAt: "2026-04-01T00:00:00.000Z",
              salt: "admin-salt",
              passwordHash: "admin-hash"
            },
            {
              id: "seed-employer",
              role: "employer",
              name: "Demo Employer",
              email: "employer@quickshift.local",
              company: "Demo Shops",
              planId: "growth",
              createdAt: "2026-04-01T00:00:00.000Z",
              salt: "employer-salt",
              passwordHash: "employer-hash"
            }
          ],
          sessions: [],
          jobs: [],
          applications: [],
          plans: [],
          leads: []
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const db = await store.readDb();
    const admin = db.users.find((user) => user.id === "admin-demo");
    const seedEmployer = db.users.find((user) => user.id === "seed-employer");

    assert.equal(admin.referralCode, "KPADMIN");
    assert.equal(seedEmployer.referralCode, "KPSHOP");
    assert.equal(admin.publisherType, "employer");
    assert.equal(seedEmployer.publisherType, "employer");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("store migration adds missing approved seed light tasks", async () => {
  const { dir, store } = await tempStore();
  try {
    const file = join(dir, "app-data.json");
    await writeFile(
      file,
      `${JSON.stringify(
        {
          users: [],
          sessions: [],
          jobs: [
            {
              id: "campus-library",
              title: "Campus Library Assistant",
              status: "approved",
              employerId: "seed-employer"
            },
            {
              id: "cafe-shift",
              title: "Cafe Weekend Shift Helper",
              status: "approved",
              employerId: "seed-employer"
            },
            {
              id: "remote-support",
              title: "Remote Chinese Support Associate",
              status: "approved",
              employerId: "seed-employer"
            },
            {
              id: "event-checkin",
              title: "Conference Check-In Staff",
              status: "approved",
              employerId: "seed-employer"
            }
          ],
          applications: [],
          plans: [],
          leads: []
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const db = await store.readDb();
    const videoCaptions = db.jobs.find((job) => job.id === "task-video-captions");
    const campusPhotoCheck = db.jobs.find((job) => job.id === "task-campus-photo-check");

    assert.equal(videoCaptions?.status, "approved");
    assert.equal(videoCaptions?.workMode, "task");
    assert.equal(campusPhotoCheck?.status, "approved");
    assert.equal(campusPhotoCheck?.workMode, "task");
    assert.equal(campusPhotoCheck?.taskSource, "campus");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
