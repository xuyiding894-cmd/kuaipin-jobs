import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("post form offers per-task pay as a pay unit", () => {
  assert.match(appSource, /<option value="task"/);
});

test("application and registration forms accept referral codes", () => {
  assert.match(appSource, /data-apply-form>[\s\S]*name="referralCode"/);
  assert.match(appSource, /data-register-form>[\s\S]*name="referralCode"/);
});

test("home screen renders marketplace attraction sections", () => {
  assert.match(appSource, /renderHeroPanel/);
  assert.match(appSource, /renderQuickStartTiles/);
  assert.match(appSource, /renderMarketplaceSignals/);
  assert.match(appSource, /renderWorkFlowStrip/);
});
