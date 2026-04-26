import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("homepage exposes searchable Chinese part-time job metadata", async () => {
  const html = await readFile("index.html", "utf8");

  assert.match(html, /<title>快聘兼职 \| 大学生兼职与轻任务平台<\/title>/);
  assert.match(html, /name="description"/);
  assert.match(html, /大学生兼职/);
  assert.match(html, /校园任务/);
  assert.match(html, /居家轻任务/);
  assert.match(html, /property="og:title"/);
});

test("homepage includes static crawler-friendly Chinese landing content", async () => {
  const html = await readFile("index.html", "utf8");

  assert.match(html, /class="seo-fallback"/);
  assert.match(html, /大学生兼职/);
  assert.match(html, /校园兼职/);
  assert.match(html, /周末兼职/);
  assert.match(html, /在家可做/);
  assert.match(html, /application\/ld\+json/);
  assert.match(html, /"@type": "WebSite"/);
});

test("public crawler files point search engines to the GitHub Pages URL", async () => {
  const robots = await readFile("robots.txt", "utf8");
  const sitemap = await readFile("sitemap.xml", "utf8");

  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/xuyiding894-cmd\.github\.io\/kuaipin-jobs\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/xuyiding894-cmd\.github\.io\/kuaipin-jobs\/<\/loc>/);
});
