import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { resolvePath } from "../scripts/dev-server.mjs";

test("resolvePath maps the root request to index.html", () => {
  assert.equal(resolvePath("/"), join(process.cwd(), "index.html"));
});

test("resolvePath maps asset requests inside the project root", () => {
  assert.equal(resolvePath("/src/app.js"), join(process.cwd(), "src", "app.js"));
});

test("resolvePath maps public assets inside the project root", () => {
  assert.equal(resolvePath("/assets/favicon.svg"), join(process.cwd(), "assets", "favicon.svg"));
});

test("resolvePath ignores query strings", () => {
  assert.equal(resolvePath("/src/app.js?v=1"), join(process.cwd(), "src", "app.js"));
});

test("resolvePath rejects encoded backslash traversal outside the project root", () => {
  assert.throws(() => resolvePath("/%5c..%5cpackage.json"), /outside project root/);
});

test("resolvePath rejects encoded dot-dot traversal outside the project root", () => {
  assert.throws(() => resolvePath("/%2e%2e/package.json"), /outside project root/);
});

test("resolvePath rejects private project data files", () => {
  assert.throws(() => resolvePath("/data/app-data.json"), /not publicly served/);
});

test("resolvePath rejects hidden repository files", () => {
  assert.throws(() => resolvePath("/.git/config"), /not publicly served/);
});
