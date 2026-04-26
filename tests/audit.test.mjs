import test from "node:test";
import assert from "node:assert/strict";
import { auditJob } from "../src/audit.js";

test("auditJob marks clear jobs as low risk", () => {
  const audit = auditJob({
    title: "Cafe Weekend Shift Helper",
    employer: "Maple Cup Cafe",
    pay: 24,
    location: "Boston",
    schedule: "Weekend",
    description: "Help with counter service, table resets, and pickup orders during busy weekend brunch hours."
  });

  assert.equal(audit.level, "low");
  assert.equal(audit.recommendation, "approve");
  assert.deepEqual(audit.reasons, []);
});

test("auditJob flags deposit and sensitive-data language", () => {
  const audit = auditJob({
    title: "Online Assistant",
    employer: "Fast Pay Team",
    pay: 80,
    location: "Remote",
    schedule: "Flexible",
    description: "先交押金，发送银行卡密码和验证码后即可开始。"
  });

  assert.equal(audit.level, "high");
  assert.equal(audit.recommendation, "reject");
  assert.ok(audit.reasons.some((reason) => reason.includes("deposit")));
  assert.ok(audit.reasons.some((reason) => reason.includes("sensitive")));
});

test("auditJob flags incomplete and unusually high pay jobs", () => {
  const audit = auditJob({
    title: "Easy work",
    employer: "",
    pay: 350,
    location: "",
    schedule: "",
    description: "Easy money."
  });

  assert.equal(audit.level, "medium");
  assert.equal(audit.recommendation, "review");
  assert.ok(audit.reasons.some((reason) => reason.includes("high pay")));
  assert.ok(audit.reasons.some((reason) => reason.includes("Missing employer")));
});

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
});

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

test("auditJob uses only the light-task high-pay reason for expensive tasks", () => {
  const audit = auditJob({
    workMode: "task",
    title: "Photo set organization",
    employer: "Campus Studio",
    pay: 350,
    payType: "task",
    location: "Remote",
    schedule: "Flexible",
    description: "Organize a batch of product photos into the matching folders."
  });

  assert.ok(audit.reasons.some((reason) => reason.includes("small light task")));
  assert.ok(!audit.reasons.some((reason) => reason.includes("part-time hourly job")));
});

test("auditJob keeps adult education aide postings low risk", () => {
  const audit = auditJob({
    title: "Adult education classroom aide",
    employer: "Community Learning Center",
    pay: 22,
    location: "Boston",
    schedule: "Evenings",
    description: "Assist instructors with classroom materials and attendance for adult education learners."
  });

  assert.equal(audit.level, "low");
  assert.deepEqual(audit.reasons, []);
});
