import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDraftCopyText,
  buildGmailComposeHref,
  buildMailtoHref,
  buildOutlookComposeHref,
  buildSmsHref,
  emailDraftFields,
  outreachMessage
} from "../src/outreach.js";

const lead = {
  name: "Campus Cafe Demo",
  phone: "555-0101",
  email: "demo-cafe@example.com"
};

test("outreachMessage includes the lead name and free job offer", () => {
  const message = outreachMessage(lead, "en");

  assert.match(message, /Campus Cafe Demo/);
  assert.match(message, /first job post free/);
  assert.match(message, /STOP/);
});

test("buildSmsHref creates a prefilled sms draft link", () => {
  const href = buildSmsHref(lead, "zh");

  assert.match(href, /^sms:555-0101\?\&body=/);
  assert.match(decodeURIComponent(href), /Campus Cafe Demo/);
});

test("buildMailtoHref creates a prefilled email draft link and skips missing emails", () => {
  const href = buildMailtoHref(lead, "en");

  assert.match(href, /^mailto:demo-cafe%40example\.com\?subject=/);
  assert.match(decodeURIComponent(href), /Campus Cafe Demo/);
  assert.equal(buildMailtoHref({ ...lead, email: "" }, "en"), "");
});

test("buildDraftCopyText gives a readable fallback when draft links do not open", () => {
  const sms = buildDraftCopyText(lead, "sms", "zh");
  const email = buildDraftCopyText(lead, "email", "en");

  assert.match(sms, /To: 555-0101/);
  assert.match(sms, /Campus Cafe Demo/);
  assert.match(email, /To: demo-cafe@example\.com/);
  assert.match(email, /Subject: Free first part-time job post/);
});

test("emailDraftFields exposes copyable fields for browsers without a mail client", () => {
  const draft = emailDraftFields(lead, "en");

  assert.equal(draft.to, "demo-cafe@example.com");
  assert.equal(draft.subject, "Free first part-time job post for your Flushing business");
  assert.match(draft.body, /Campus Cafe Demo/);
});

test("webmail compose links do not depend on the system mailto handler", () => {
  const gmail = buildGmailComposeHref(lead, "en");
  const outlook = buildOutlookComposeHref(lead, "en");

  assert.match(gmail, /^https:\/\/mail\.google\.com\/mail\/\?view=cm&fs=1&to=/);
  assert.match(outlook, /^https:\/\/outlook\.live\.com\/mail\/0\/deeplink\/compose\?to=/);
  assert.match(decodeURIComponent(gmail), /Campus Cafe Demo/);
  assert.match(decodeURIComponent(outlook), /Free first part-time job post/);
  assert.equal(buildGmailComposeHref({ ...lead, email: "" }, "en"), "");
});
