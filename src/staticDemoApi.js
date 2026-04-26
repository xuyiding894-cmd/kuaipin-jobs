import { auditJob } from "./audit.js";
import { BRAND_ADMIN_NAME, BRAND_NAME } from "./brand.js";
import { createReferralCode, normalizeReferralCode, rewardForEvent } from "./growth.js";
import { createApplication, createJobFromPosting, validatePosting } from "./jobLogic.js";
import { seedJobs } from "./jobs.js";

const demoStorageKey = "quickshift.staticDemoDb.v1";

const plans = [
  { id: "free", name: "Free", price: 0, jobLimit: 1, perks: ["1 active job", "Manual review", "Basic applicant view"] },
  { id: "growth", name: "Growth", price: 29, jobLimit: 5, perks: ["5 active jobs", "Priority review", "Featured-ready listings"] },
  { id: "pro", name: "Pro", price: 99, jobLimit: 20, perks: ["20 active jobs", "Priority support", "Advanced applicant view"] }
];

const demoLeads = [
  {
    id: "lead-campus-cafe-demo",
    name: "Campus Cafe Demo",
    category: "Cafe",
    area: "Demo University District",
    phone: "555-0101",
    email: "demo-cafe@example.com",
    priority: "high",
    sourceLabel: "Demo lead",
    sourceUrl: "",
    status: "new",
    notes: "",
    nextAction: "Offer one free job post",
    lastContactedAt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

function memoryStorage() {
  const cache = new Map();
  return {
    getItem: (key) => cache.get(key) || null,
    setItem: (key, value) => cache.set(key, String(value)),
    removeItem: (key) => cache.delete(key)
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function initialDb() {
  const users = [
    {
      id: "demo-admin",
      role: "admin",
      name: BRAND_ADMIN_NAME,
      email: "admin@quickshift.local",
      password: "admin123",
      company: BRAND_NAME,
      planId: "pro",
      referralCode: "KPADMIN",
      publisherType: "employer"
    },
    {
      id: "demo-employer",
      role: "employer",
      name: "Demo Employer",
      email: "employer@quickshift.local",
      password: "demo123",
      company: "Demo Shops",
      planId: "growth",
      referralCode: "KPSHOP",
      publisherType: "employer"
    }
  ];

  return {
    users,
    sessions: {},
    jobs: seedJobs.map((job) => ({
      ...clone(job),
      status: "approved",
      employerId: "demo-employer",
      approvedAt: today()
    })),
    applications: [],
    partnerApplications: [],
    referralEvents: [],
    rewardLedger: [],
    plans: clone(plans),
    leads: clone(demoLeads)
  };
}

function readDb(storage) {
  try {
    const raw = storage.getItem(demoStorageKey);
    if (raw) return JSON.parse(raw);
  } catch {
    // A broken local demo store should never block the public preview.
  }
  return initialDb();
}

function writeDb(storage, db) {
  storage.setItem(demoStorageKey, JSON.stringify(db));
}

function parseBody(options) {
  if (!options.body) return {};
  return typeof options.body === "string" ? JSON.parse(options.body) : options.body;
}

function authToken(options) {
  const headers = options.headers || {};
  const header = headers.Authorization || headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function userForToken(db, token) {
  const userId = db.sessions[token];
  return db.users.find((user) => user.id === userId) || null;
}

function requireUser(db, token) {
  const user = userForToken(db, token);
  if (!user) throw new Error("Login required.");
  return user;
}

function requireAdmin(user) {
  if (user.role !== "admin") throw new Error("Admin access required.");
}

function existingReferralCodes(db) {
  return new Set(db.users.map((user) => user.referralCode).filter(Boolean));
}

function recordReferral(db, type, referralCode, subjectId) {
  const code = normalizeReferralCode(referralCode);
  if (!code) return;
  const referrer = db.users.find((user) => user.referralCode === code);
  if (!referrer) return;
  const reward = rewardForEvent(type);
  const event = {
    id: uid("ref"),
    type,
    referralCode: code,
    referrerId: referrer.id,
    subjectId,
    createdAt: new Date().toISOString()
  };
  db.referralEvents.push(event);
  db.rewardLedger.push({
    id: uid("reward"),
    eventId: event.id,
    referrerId: referrer.id,
    points: reward.points,
    benefit: reward.benefit,
    status: "pending",
    createdAt: event.createdAt
  });
}

function publicJobs(db) {
  return db.jobs.filter((job) => job.status === "approved");
}

export function shouldUseStaticDemoApi(locationLike = {}) {
  const hostname = String(locationLike.hostname || "").toLowerCase();
  return Boolean(hostname) && !["localhost", "127.0.0.1", "::1"].includes(hostname);
}

export function createStaticDemoApi({ storage } = {}) {
  const selectedStorage = storage || (typeof localStorage !== "undefined" ? localStorage : memoryStorage());

  return async function staticDemoApi(path, options = {}) {
    const method = options.method || "GET";
    const token = authToken(options);
    const body = parseBody(options);
    const db = readDb(selectedStorage);
    const commit = (payload) => {
      writeDb(selectedStorage, db);
      return payload;
    };

    if (method === "GET" && path === "/api/plans") return { plans: clone(db.plans) };
    if (method === "GET" && path === "/api/jobs") return { jobs: clone(publicJobs(db)) };
    if (method === "GET" && path === "/api/session") return { user: publicUser(userForToken(db, token)) };

    if (method === "POST" && path === "/api/auth/register") {
      const email = String(body.email || "").trim().toLowerCase();
      if (!email || !body.password || !body.name) throw new Error("Name, email, and password are required.");
      if (db.users.some((user) => user.email === email)) throw new Error("Email already registered.");
      const publisherType = body.publisherType === "student" ? "student" : "employer";
      const user = {
        id: uid("user"),
        role: "employer",
        name: String(body.name).trim(),
        email,
        password: String(body.password),
        company: String(body.company || body.name).trim(),
        planId: "free",
        referralCode: createReferralCode(body.name || "KP", existingReferralCodes(db)),
        publisherType,
        campusName: publisherType === "student" ? String(body.campusName || "").trim() : undefined
      };
      db.users.push(user);
      recordReferral(db, "registration", body.referralCode, user.id);
      return commit({ user: publicUser(user) });
    }

    if (method === "POST" && path === "/api/auth/login") {
      const email = String(body.email || "").trim().toLowerCase();
      const user = db.users.find((item) => item.email === email && item.password === body.password);
      if (!user) throw new Error("Invalid email or password.");
      const nextToken = uid("demo-token");
      db.sessions[nextToken] = user.id;
      return commit({ token: nextToken, user: publicUser(user) });
    }

    if (method === "POST" && path === "/api/auth/logout") {
      delete db.sessions[token];
      return commit({ ok: true });
    }

    if (method === "POST" && path === "/api/jobs") {
      const user = requireUser(db, token);
      const errors = validatePosting(body);
      if (Object.keys(errors).length) throw new Error("Posting has validation errors.");
      const campusTask = body.workMode === "task" && body.taskSource === "campus";
      if (user.publisherType === "student" && !campusTask) throw new Error("Student publishers can post campus tasks only.");
      const job = {
        ...createJobFromPosting(body),
        id: uid("posted"),
        employerId: user.id,
        status: "pending",
        audit: auditJob(body),
        submittedAt: new Date().toISOString()
      };
      db.jobs.unshift(job);
      return commit({ job: clone(job) });
    }

    if (method === "POST" && path === "/api/applications") {
      const job = publicJobs(db).find((item) => item.id === body.jobId);
      if (!job) throw new Error("Job is not available.");
      const application = {
        id: uid("app"),
        ...createApplication(job.id, body),
        employerId: job.employerId,
        referralCode: normalizeReferralCode(body.referralCode)
      };
      db.applications.unshift(application);
      recordReferral(db, "application", body.referralCode, application.id);
      return commit({ application: clone(application) });
    }

    if (method === "POST" && path === "/api/growth/partners") {
      const name = String(body.name || "").trim();
      const contact = String(body.contact || "").trim();
      if (!name || !contact) throw new Error("Name and contact are required.");
      const partner = {
        id: uid("partner"),
        name,
        contact,
        campus: String(body.campus || "").trim(),
        channel: String(body.channel || "").trim(),
        note: String(body.note || "").trim(),
        status: "pending",
        referralCode: createReferralCode(name, existingReferralCodes(db)),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.partnerApplications.unshift(partner);
      return commit({ partner: clone(partner) });
    }

    if (method === "GET" && path === "/api/employer/jobs") {
      const user = requireUser(db, token);
      return { jobs: clone(db.jobs.filter((job) => job.employerId === user.id)) };
    }

    if (method === "GET" && path === "/api/employer/applications") {
      const user = requireUser(db, token);
      return { applications: clone(db.applications.filter((application) => application.employerId === user.id)) };
    }

    if (method === "POST" && path === "/api/employer/plan") {
      const user = requireUser(db, token);
      if (!db.plans.some((plan) => plan.id === body.planId)) throw new Error("Unknown plan.");
      user.planId = body.planId;
      return commit({ user: publicUser(user) });
    }

    if (method === "GET" && path === "/api/admin/jobs") {
      const user = requireUser(db, token);
      requireAdmin(user);
      return { jobs: clone(db.jobs) };
    }

    if (method === "GET" && path === "/api/admin/applications") {
      const user = requireUser(db, token);
      requireAdmin(user);
      return { applications: clone(db.applications) };
    }

    if (method === "GET" && path === "/api/admin/leads") {
      const user = requireUser(db, token);
      requireAdmin(user);
      return { leads: clone(db.leads) };
    }

    if (method === "GET" && path === "/api/admin/growth") {
      const user = requireUser(db, token);
      requireAdmin(user);
      return {
        partnerApplications: clone(db.partnerApplications),
        referralEvents: clone(db.referralEvents),
        rewardLedger: clone(db.rewardLedger)
      };
    }

    const statusMatch = path.match(/^\/api\/admin\/jobs\/([^/]+)\/status$/);
    if (method === "POST" && statusMatch) {
      const user = requireUser(db, token);
      requireAdmin(user);
      const job = db.jobs.find((item) => item.id === statusMatch[1]);
      if (!job) throw new Error("Job not found.");
      job.status = body.status === "rejected" ? "rejected" : "approved";
      job.verifiedEmployer = job.status === "approved";
      job.reviewedAt = new Date().toISOString();
      return commit({ job: clone(job) });
    }

    const partnerStatusMatch = path.match(/^\/api\/admin\/growth\/partners\/([^/]+)\/status$/);
    if (method === "POST" && partnerStatusMatch) {
      const user = requireUser(db, token);
      requireAdmin(user);
      const partner = db.partnerApplications.find((item) => item.id === partnerStatusMatch[1]);
      if (!partner) throw new Error("Partner not found.");
      partner.status = body.status || "pending";
      partner.updatedAt = new Date().toISOString();
      return commit({ partner: clone(partner) });
    }

    const leadMatch = path.match(/^\/api\/admin\/leads\/([^/]+)$/);
    if (method === "POST" && leadMatch) {
      const user = requireUser(db, token);
      requireAdmin(user);
      const lead = db.leads.find((item) => item.id === leadMatch[1]);
      if (!lead) throw new Error("Lead not found.");
      lead.status = body.status || lead.status;
      lead.notes = String(body.notes || "").trim();
      lead.nextAction = String(body.nextAction || lead.nextAction || "").trim();
      lead.lastContactedAt = String(body.lastContactedAt || lead.lastContactedAt || "").trim();
      lead.updatedAt = new Date().toISOString();
      return commit({ lead: clone(lead) });
    }

    throw new Error("Static demo API route not found.");
  };
}
