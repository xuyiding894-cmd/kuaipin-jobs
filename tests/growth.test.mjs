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

test("normalizeReferralCode limits normalized codes to 12 characters", () => {
  assert.equal(normalizeReferralCode(" abc-123-xyz-extra "), "ABC123XYZEXT");
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

test("rewardForEvent returns all required mappings and unknown fallback", () => {
  assert.deepEqual(rewardForEvent("registration"), {
    points: 1,
    benefit: "profile-boost"
  });
  assert.deepEqual(rewardForEvent("application"), {
    points: 3,
    benefit: "light-task-priority"
  });
  assert.deepEqual(rewardForEvent("employerLead"), {
    points: 10,
    benefit: "partner-badge"
  });
  assert.deepEqual(rewardForEvent("approvedPost"), {
    points: 20,
    benefit: "featured-credit"
  });
  assert.deepEqual(rewardForEvent("other"), {
    points: 0,
    benefit: "manual-review"
  });
});

test("buildInviteText includes the referral code and avoids cash wording", () => {
  const text = buildInviteText({ referralCode: "KP88AA", locale: "zh" });
  assert.match(text, /KP88AA/);
  assert.doesNotMatch(text, /现金|提现|打款/);
});

test("buildInviteText English copy includes code and avoids cash wording", () => {
  const text = buildInviteText({ referralCode: "KP88AA", locale: "en" });
  assert.match(text, /KP88AA/);
  assert.doesNotMatch(text, /cash|withdraw|payout/i);
});

test("growthRiskReasons flags risky invite copy", () => {
  const reasons = growthRiskReasons("加入团队发展下线，躺赚高收益");
  assert.ok(reasons.some((reason) => reason.includes("multi-level")));
  assert.ok(reasons.some((reason) => reason.includes("high-income")));
});

test("growthRiskReasons flags English high-income and upfront-payment copy", () => {
  const reasons = growthRiskReasons("Join for high income with upfront payment");
  assert.ok(reasons.some((reason) => reason.includes("high-income")));
  assert.ok(
    reasons.some(
      (reason) => reason.includes("upfront-payment") || reason.includes("joining-fee")
    )
  );
});
