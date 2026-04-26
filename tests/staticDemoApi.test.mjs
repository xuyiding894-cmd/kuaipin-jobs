import test from "node:test";
import assert from "node:assert/strict";
import { createStaticDemoApi, shouldUseStaticDemoApi } from "../src/staticDemoApi.js";

test("shouldUseStaticDemoApi enables browser demo mode on GitHub Pages", () => {
  assert.equal(shouldUseStaticDemoApi({ hostname: "xuyiding894-cmd.github.io" }), true);
  assert.equal(shouldUseStaticDemoApi({ hostname: "127.0.0.1" }), false);
  assert.equal(shouldUseStaticDemoApi({ hostname: "localhost" }), false);
});

test("static demo API serves jobs without a backend", async () => {
  const api = createStaticDemoApi();

  const { jobs } = await api("/api/jobs");

  assert.ok(jobs.length > 0);
  assert.ok(jobs.every((job) => job.status !== "pending"));
});

test("static demo API lets a demo employer post a pending task locally", async () => {
  const api = createStaticDemoApi();
  const session = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "employer@quickshift.local", password: "demo123" })
  });

  const { job } = await api("/api/jobs", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({
      workMode: "task",
      taskSource: "campus",
      title: "Campus poster photo check",
      employer: "Student Project Demo",
      category: "Campus",
      taskType: "campus",
      campusName: "Demo University",
      pay: "35",
      location: "Demo University",
      schedule: "Flexible",
      estimatedTime: "30 minutes",
      settlement: "afterDone",
      description: "Take clear photos of posted campus flyers and submit the photo set for review."
    })
  });

  assert.equal(job.status, "pending");
  assert.equal(job.payType, "task");
});
