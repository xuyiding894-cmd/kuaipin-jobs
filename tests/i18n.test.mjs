import test from "node:test";
import assert from "node:assert/strict";
import { labelFor, localizeJob, t } from "../src/i18n.js";

test("t returns locale text and falls back to Chinese", () => {
  assert.equal(t("en", "postJob"), "Post job");
  assert.equal(t("zh", "postJob"), "发布兼职");
  assert.equal(t("missing", "postJob"), "发布兼职");
});

test("labelFor translates known category labels and falls back to value", () => {
  assert.equal(labelFor("zh", "categories", "Food Service"), "餐饮服务");
  assert.equal(labelFor("en", "categories", "Food Service"), "Food Service");
  assert.equal(labelFor("zh", "categories", "Unknown"), "Unknown");
});

test("light task labels have Chinese and English fallbacks", () => {
  assert.equal(t("en", "lightTasks"), "Light tasks");
  assert.equal(t("en", "campusTaskStation"), "Campus task station");
  assert.equal(t("en", "perTask"), "Per task");
  assert.equal(t("en", "referralCodeLabel"), "Invite code");
  assert.equal(t("en", "heroHeadline"), "Find a trusted task you can start today");
  assert.equal(t("en", "quickStartTitle"), "Start with a task type");
  assert.equal(t("en", "marketplaceSignalsTitle"), "Why people can trust this marketplace");
  assert.equal(labelFor("en", "workModes", "task"), "Light task");
  assert.equal(labelFor("en", "workModes", "campusTask"), "Campus task station");
  assert.equal(labelFor("en", "taskTypes", "home"), "Work from home");
  assert.equal(labelFor("en", "settlements", "afterDone"), "After completion");
});

test("localizeJob uses localized seed copy when available", () => {
  const job = {
    title: "Remote Chinese Support Associate",
    description: "Answer customer questions.",
    requirements: ["Chinese and English fluency"],
    localized: {
      zh: {
        title: "远程中文客服专员",
        description: "用中文和英文回答客户问题。",
        requirements: ["中英文流利"]
      }
    }
  };

  assert.equal(localizeJob(job, "zh").title, "远程中文客服专员");
  assert.equal(localizeJob(job, "en").title, "Remote Chinese Support Associate");
});
