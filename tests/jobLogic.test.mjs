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

test("createJobFromPosting normalizes task postings to per-task pay", () => {
  const job = createJobFromPosting({
    workMode: "task",
    taskSource: "campus",
    title: "Campus material sorting",
    employer: "Student Project",
    category: "Campus",
    taskType: "campus",
    campusName: "North City University",
    pay: "45",
    payType: "hour",
    estimatedTime: "2 hours",
    settlement: "afterDone",
    location: "Campus",
    schedule: "Weekend",
    description: "Sort event material packs for a student activity.",
    contact: "student-project@example.com"
  });

  assert.equal(job.payType, "task");
});
