import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createStore } from "./data-store.mjs";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const store = createStore();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

export function resolvePath(url) {
  const rawPath = String(url || "/").split(/[?#]/, 1)[0] || "/";
  const requested = decodeURIComponent(rawPath);
  if (requested === "/") return join(root, "index.html");

  const requestedPath = requested.replace(/^[/\\]+/, "");
  const filePath = resolve(root, requestedPath);
  const relativePath = relative(root, filePath);

  if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error("Requested path is outside project root");
  }

  const parts = relativePath.split(/[\\/]+/).filter(Boolean);
  if (!["src", "assets"].includes(parts[0]) || parts.some((part) => part.startsWith("."))) {
    throw new Error("Requested path is not publicly served");
  }

  return filePath;
}

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function tokenFrom(request) {
  const header = request.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function handleApi(request, response, url) {
  const method = request.method || "GET";
  const token = tokenFrom(request);

  if (method === "GET" && url.pathname === "/api/plans") {
    return sendJson(response, 200, { plans: await store.listPlans() });
  }

  if (method === "POST" && url.pathname === "/api/auth/register") {
    return sendJson(response, 201, { user: await store.registerEmployer(await readJson(request)) });
  }

  if (method === "POST" && url.pathname === "/api/auth/login") {
    return sendJson(response, 200, await store.login(await readJson(request)));
  }

  if (method === "POST" && url.pathname === "/api/auth/logout") {
    return sendJson(response, 200, await store.logout(token));
  }

  if (method === "GET" && url.pathname === "/api/session") {
    return sendJson(response, 200, { user: await store.userForToken(token) });
  }

  if (method === "POST" && url.pathname === "/api/growth/partners") {
    return sendJson(response, 201, { partner: await store.createPartnerApplication(await readJson(request)) });
  }

  if (method === "GET" && url.pathname === "/api/jobs") {
    return sendJson(response, 200, { jobs: await store.publicJobs() });
  }

  if (method === "POST" && url.pathname === "/api/jobs") {
    return sendJson(response, 201, { job: await store.createJob(token, await readJson(request)) });
  }

  if (method === "POST" && url.pathname === "/api/applications") {
    return sendJson(response, 201, { application: await store.createApplication(await readJson(request)) });
  }

  if (method === "GET" && url.pathname === "/api/employer/jobs") {
    return sendJson(response, 200, { jobs: await store.employerJobs(token) });
  }

  if (method === "GET" && url.pathname === "/api/employer/applications") {
    return sendJson(response, 200, { applications: await store.employerApplications(token) });
  }

  if (method === "POST" && url.pathname === "/api/employer/plan") {
    const body = await readJson(request);
    return sendJson(response, 200, { user: await store.selectPlan(token, body.planId) });
  }

  if (method === "GET" && url.pathname === "/api/admin/jobs") {
    return sendJson(response, 200, { jobs: await store.adminJobs(token) });
  }

  if (method === "GET" && url.pathname === "/api/admin/applications") {
    return sendJson(response, 200, { applications: await store.adminApplications(token) });
  }

  if (method === "GET" && url.pathname === "/api/admin/leads") {
    return sendJson(response, 200, { leads: await store.adminLeads(token) });
  }

  if (method === "GET" && url.pathname === "/api/admin/growth") {
    return sendJson(response, 200, await store.adminGrowth(token));
  }

  const statusMatch = url.pathname.match(/^\/api\/admin\/jobs\/([^/]+)\/status$/);
  if (method === "POST" && statusMatch) {
    const body = await readJson(request);
    return sendJson(response, 200, { job: await store.setJobStatus(token, statusMatch[1], body.status) });
  }

  const partnerStatusMatch = url.pathname.match(/^\/api\/admin\/growth\/partners\/([^/]+)\/status$/);
  if (method === "POST" && partnerStatusMatch) {
    const body = await readJson(request);
    return sendJson(response, 200, {
      partner: await store.updatePartnerStatus(token, partnerStatusMatch[1], body.status)
    });
  }

  const leadMatch = url.pathname.match(/^\/api\/admin\/leads\/([^/]+)$/);
  if (method === "POST" && leadMatch) {
    return sendJson(response, 200, { lead: await store.updateLead(token, leadMatch[1], await readJson(request)) });
  }

  return sendJson(response, 404, { error: "API route not found." });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", `http://127.0.0.1:${port}`);
      if (url.pathname.startsWith("/api/")) {
        await handleApi(request, response, url);
        return;
      }

      const filePath = resolvePath(request.url || "/");
      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
      response.end(body);
    } catch (error) {
      if ((request.url || "").startsWith("/api/")) {
        sendJson(response, error.status || 500, { error: error.message || "Server error." });
        return;
      }
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  }).listen(port, "127.0.0.1", () => {
    console.log(`Serving part-time jobs MVP at http://127.0.0.1:${port}`);
  });
}
