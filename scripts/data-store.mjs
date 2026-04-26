import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { seedJobs } from "../src/jobs.js";
import { auditJob } from "../src/audit.js";
import { BRAND_ADMIN_NAME, BRAND_NAME } from "../src/brand.js";
import { createReferralCode, normalizeReferralCode, rewardForEvent } from "../src/growth.js";
import { createJobFromPosting, validatePosting } from "../src/jobLogic.js";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    jobLimit: 1,
    perks: ["1 active job", "Manual review", "Basic applicant view"]
  },
  {
    id: "growth",
    name: "Growth",
    price: 29,
    jobLimit: 5,
    perks: ["5 active jobs", "Priority review", "Featured-ready listings"]
  },
  {
    id: "pro",
    name: "Pro",
    price: 99,
    jobLimit: 20,
    perks: ["20 active jobs", "Priority support", "Advanced applicant view"]
  }
];

const leadStatuses = new Set(["new", "contacted", "interested", "not-hiring", "follow-up", "converted", "stopped"]);
const partnerStatuses = new Set(["pending", "approved", "rejected", "frozen"]);

const outreachLeads = [
  {
    id: "lead-campus-cafe-demo",
    name: "Campus Cafe Demo",
    category: "Cafe",
    area: "Demo University District",
    phone: "555-0101",
    email: "demo-cafe@example.com",
    priority: "high",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-tutoring-center-demo",
    name: "Tutoring Center Demo",
    category: "Education",
    area: "Demo City",
    phone: "555-0102",
    email: "demo-tutoring@example.com",
    priority: "high",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-event-team-demo",
    name: "Event Team Demo",
    category: "Events",
    area: "Demo Convention Area",
    phone: "555-0103",
    email: "demo-events@example.com",
    priority: "high",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-bubble-tea-demo",
    name: "Bubble Tea Demo",
    category: "Bubble tea",
    area: "Demo Shopping Street",
    phone: "555-0104",
    email: "",
    priority: "high",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-local-restaurant-demo",
    name: "Local Restaurant Demo",
    category: "Restaurant",
    area: "Demo Food Street",
    phone: "555-0105",
    email: "demo-restaurant@example.com",
    priority: "medium",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-bookstore-demo",
    name: "Bookstore Demo",
    category: "Retail",
    area: "Demo Campus Gate",
    phone: "555-0106",
    email: "",
    priority: "medium",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-design-studio-demo",
    name: "Design Studio Demo",
    category: "Creative services",
    area: "Remote / demo",
    phone: "555-0107",
    email: "",
    priority: "medium",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  },
  {
    id: "lead-community-gym-demo",
    name: "Community Gym Demo",
    category: "Fitness",
    area: "Demo Community",
    phone: "555-0108",
    email: "",
    priority: "medium",
    sourceLabel: "Demo lead",
    sourceUrl: ""
  }
];

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const publicUser = ({ passwordHash, salt, ...user }) => user;

function uid(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function hashPassword(password, salt) {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}

function createPassword(password) {
  const salt = randomBytes(8).toString("hex");
  return {
    salt,
    passwordHash: hashPassword(password, salt)
  };
}

function verifyPassword(user, password) {
  return user.passwordHash === hashPassword(password, user.salt);
}

function seedApprovedJobs() {
  return seedJobs.map((job) => ({
    ...job,
    status: "approved",
    employerId: "seed-employer",
    audit: { level: "low", score: 0, reasons: [], recommendation: "approve" },
    applications: [],
    createdAt: `${job.postedAt}T09:00:00.000Z`,
    updatedAt: `${job.postedAt}T09:00:00.000Z`
  }));
}

function seedOutreachLeads() {
  return outreachLeads.map((lead, index) => ({
    ...lead,
    status: "new",
    notes: "",
    nextAction: index < 2 ? "Ask for tenant referrals" : "Offer one free job post",
    lastContactedAt: "",
    createdAt: now(),
    updatedAt: now()
  }));
}

function allReferralCodes(db) {
  return new Set(
    [
      ...(db.users || []).map((user) => user.referralCode),
      ...(db.partnerApplications || []).map((partner) => partner.referralCode)
    ]
      .map((code) => normalizeReferralCode(code))
      .filter(Boolean)
  );
}

function ensureReferralCode(db, owner) {
  const code = normalizeReferralCode(owner.referralCode);
  if (code.length >= 6) {
    owner.referralCode = code;
    return owner.referralCode;
  }

  owner.referralCode = createReferralCode(owner.name || owner.company || "KP", allReferralCodes(db));
  return owner.referralCode;
}

function findReferrer(db, code) {
  const referralCode = normalizeReferralCode(code);
  if (!referralCode) return null;
  return (
    (db.users || []).find((user) => normalizeReferralCode(user.referralCode) === referralCode) ||
    (db.partnerApplications || []).find((partner) => partner.status === "approved" && normalizeReferralCode(partner.referralCode) === referralCode) ||
    null
  );
}

function throwValidationError(errors) {
  const error = new Error(Object.values(errors).join(" "));
  error.status = 400;
  error.errors = errors;
  throw error;
}

function addReferralEvent(db, { type, referralCode, subjectId, source }) {
  const normalizedCode = normalizeReferralCode(referralCode);
  const referrer = findReferrer(db, normalizedCode);
  if (!referrer) return null;
  const referrerKind = (db.users || []).some((user) => user.id === referrer.id) ? "user" : "partner";

  const event = {
    id: uid("ref"),
    type,
    referralCode: normalizedCode,
    referrerId: referrer.id,
    referrerKind,
    subjectId,
    source: String(source || "").trim(),
    status: "pending",
    adminNotes: "",
    createdAt: now()
  };
  const reward = {
    id: uid("reward"),
    eventId: event.id,
    referrerId: referrer.id,
    reason: type,
    ...rewardForEvent(type),
    status: "pending",
    createdAt: now()
  };
  db.referralEvents.unshift(event);
  db.rewardLedger.unshift(reward);
  return event;
}

function ensureDbShape(db) {
  if (!Array.isArray(db.leads)) db.leads = seedOutreachLeads();
  if (!Array.isArray(db.plans)) db.plans = plans;
  if (!Array.isArray(db.jobs)) db.jobs = [];
  if (!Array.isArray(db.applications)) db.applications = [];
  if (!Array.isArray(db.partnerApplications)) db.partnerApplications = [];
  if (!Array.isArray(db.referralEvents)) db.referralEvents = [];
  if (!Array.isArray(db.rewardLedger)) db.rewardLedger = [];
  const existingJobIds = new Set(db.jobs.map((job) => job.id));
  for (const job of seedApprovedJobs()) {
    if (!existingJobIds.has(job.id)) {
      db.jobs.push(job);
      existingJobIds.add(job.id);
    }
  }
  for (const user of db.users || []) {
    user.publisherType = user.publisherType === "student" ? "student" : "employer";
    user.points = Number(user.points || 0);
    if (user.publisherType !== "student") delete user.campusName;
    ensureReferralCode(db, user);
  }
  const admin = db.users?.find((user) => user.id === "admin-demo");
  if (admin) {
    admin.name = BRAND_ADMIN_NAME;
    admin.company = BRAND_NAME;
    admin.referralCode = "KPADMIN";
    admin.publisherType = "employer";
    admin.points = Number(admin.points || 0);
  }
  const seedEmployer = db.users?.find((user) => user.id === "seed-employer");
  if (seedEmployer) {
    seedEmployer.referralCode = "KPSHOP";
    seedEmployer.publisherType = "employer";
    seedEmployer.points = Number(seedEmployer.points || 0);
  }
  return db;
}

function initialDb() {
  const adminPassword = createPassword("admin123");
  const employerPassword = createPassword("demo123");

  return ensureDbShape({
    users: [
      {
        id: "admin-demo",
        role: "admin",
        name: BRAND_ADMIN_NAME,
        email: "admin@quickshift.local",
        company: BRAND_NAME,
        planId: "pro",
        referralCode: "KPADMIN",
        publisherType: "employer",
        points: 0,
        createdAt: now(),
        ...adminPassword
      },
      {
        id: "seed-employer",
        role: "employer",
        name: "Demo Employer",
        email: "employer@quickshift.local",
        company: "Demo Shops",
        planId: "growth",
        referralCode: "KPSHOP",
        publisherType: "employer",
        points: 0,
        createdAt: now(),
        ...employerPassword
      }
    ],
    sessions: [],
    jobs: seedApprovedJobs(),
    applications: [],
    plans,
    leads: seedOutreachLeads()
  });
}

export function createStore(filePath = join(process.cwd(), "data", "app-data.json")) {
  async function readDb() {
    try {
      return ensureDbShape(JSON.parse(await readFile(filePath, "utf8")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const db = initialDb();
      await writeDb(db);
      return db;
    }
  }

  async function writeDb(db) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }

  async function change(mutator) {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  }

  async function registerEmployer({ name, email, password, company, publisherType, campusName, referralCode }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password || !name) {
      const error = new Error("Name, email, and password are required.");
      error.status = 400;
      throw error;
    }

    return change((db) => {
      if (db.users.some((user) => user.email === normalizedEmail)) {
        const error = new Error("Email already registered.");
        error.status = 409;
        throw error;
      }
      const normalizedPublisherType = publisherType === "student" ? "student" : "employer";

      const user = {
        id: uid("user"),
        role: "employer",
        name: String(name).trim(),
        email: normalizedEmail,
        company: String(company || name).trim(),
        planId: "free",
        publisherType: normalizedPublisherType,
        campusName: normalizedPublisherType === "student" ? String(campusName || "").trim() : undefined,
        points: 0,
        createdAt: now(),
        ...createPassword(password)
      };
      ensureReferralCode(db, user);

      db.users.push(user);
      addReferralEvent(db, {
        type: "registration",
        referralCode,
        subjectId: user.id,
        source: "employer-registration"
      });
      return publicUser(user);
    });
  }

  async function login({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    return change((db) => {
      const user = db.users.find((item) => item.email === normalizedEmail);
      if (!user || !verifyPassword(user, password)) {
        const error = new Error("Invalid email or password.");
        error.status = 401;
        throw error;
      }

      const session = {
        token: uid("session"),
        userId: user.id,
        createdAt: now()
      };
      db.sessions.push(session);
      return { token: session.token, user: publicUser(user) };
    });
  }

  async function logout(token) {
    return change((db) => {
      db.sessions = db.sessions.filter((session) => session.token !== token);
      return { ok: true };
    });
  }

  async function userForToken(token) {
    if (!token) return null;
    const db = await readDb();
    const session = db.sessions.find((item) => item.token === token);
    if (!session) return null;
    const user = db.users.find((item) => item.id === session.userId);
    return user ? publicUser(user) : null;
  }

  async function requireUser(token) {
    const user = await userForToken(token);
    if (!user) {
      const error = new Error("Login required.");
      error.status = 401;
      throw error;
    }
    return user;
  }

  async function requireAdmin(token) {
    const user = await requireUser(token);
    if (user.role !== "admin") {
      const error = new Error("Admin access required.");
      error.status = 403;
      throw error;
    }
    return user;
  }

  async function publicJobs() {
    const db = await readDb();
    return db.jobs.filter((job) => job.status === "approved");
  }

  async function employerJobs(token) {
    const user = await requireUser(token);
    const db = await readDb();
    return db.jobs.filter((job) => job.employerId === user.id);
  }

  async function employerApplications(token) {
    const user = await requireUser(token);
    const db = await readDb();
    const jobIds = new Set(db.jobs.filter((job) => job.employerId === user.id).map((job) => job.id));
    return db.applications.filter((application) => jobIds.has(application.jobId));
  }

  async function createJob(token, form) {
    const user = await requireUser(token);
    if (user.role !== "employer" && user.role !== "admin") {
      const error = new Error("Employer access required.");
      error.status = 403;
      throw error;
    }
    const jobForm = {
      ...form,
      employer: form.employer || user.company || user.name,
      category: form.category || "Campus"
    };
    if (user.publisherType === "student") {
      if (jobForm.workMode !== "task") {
        const error = new Error("Student publishers can only post light tasks.");
        error.status = 403;
        throw error;
      }
      if (!jobForm.taskSource) jobForm.taskSource = "campus";
      if (jobForm.taskSource !== "campus") {
        const error = new Error("Student publishers can only post light tasks.");
        error.status = 403;
        throw error;
      }
    }
    const errors = validatePosting(jobForm);
    if (Object.keys(errors).length) throwValidationError(errors);

    return change((db) => {
      const audit = auditJob(jobForm);
      const postedJob = createJobFromPosting(jobForm);
      const job = {
        ...postedJob,
        id: uid("job"),
        employerId: user.id,
        verifiedEmployer: false,
        postedAt: today(),
        tags: [...postedJob.tags, "pending-review"].filter(Boolean),
        status: "pending",
        audit,
        createdAt: now(),
        updatedAt: now()
      };
      db.jobs.unshift(job);
      return job;
    });
  }

  async function createApplication(form) {
    return change((db) => {
      const job = db.jobs.find((item) => item.id === form.jobId && item.status === "approved");
      if (!job) {
        const error = new Error("Job is not available.");
        error.status = 404;
        throw error;
      }

      const application = {
        id: uid("app"),
        jobId: job.id,
        jobTitle: job.title,
        employerId: job.employerId,
        applicantName: String(form.name || "").trim(),
        contact: String(form.contact || "").trim(),
        availability: String(form.availability || "").trim(),
        message: String(form.message || "").trim(),
        submittedAt: now()
      };
      db.applications.unshift(application);
      addReferralEvent(db, {
        type: "application",
        referralCode: form.referralCode,
        subjectId: application.id,
        source: "job-application"
      });
      return application;
    });
  }

  async function createPartnerApplication(form) {
    return change((db) => {
      const name = String(form.name || "").trim();
      const contact = String(form.contact || "").trim();
      if (!name || !contact) {
        const error = new Error("Name and contact are required.");
        error.status = 400;
        throw error;
      }

      const partner = {
        id: uid("partner"),
        name,
        contact,
        campus: String(form.campus || "").trim(),
        channel: String(form.channel || "").trim(),
        note: String(form.note || "").trim(),
        status: "pending",
        createdAt: now(),
        updatedAt: now()
      };
      ensureReferralCode(db, partner);
      db.partnerApplications.unshift(partner);
      return partner;
    });
  }

  async function adminGrowth(token) {
    await requireAdmin(token);
    const db = await readDb();
    return {
      partnerApplications: db.partnerApplications,
      referralEvents: db.referralEvents,
      rewardLedger: db.rewardLedger
    };
  }

  async function updatePartnerStatus(token, partnerId, status) {
    await requireAdmin(token);
    if (!partnerStatuses.has(status)) {
      const error = new Error("Unsupported partner status.");
      error.status = 400;
      throw error;
    }

    return change((db) => {
      const partner = db.partnerApplications.find((item) => item.id === partnerId);
      if (!partner) {
        const error = new Error("Partner application not found.");
        error.status = 404;
        throw error;
      }
      partner.status = status;
      partner.updatedAt = now();
      return partner;
    });
  }

  async function adminJobs(token) {
    await requireAdmin(token);
    const db = await readDb();
    return db.jobs;
  }

  async function adminApplications(token) {
    await requireAdmin(token);
    const db = await readDb();
    return db.applications;
  }

  async function adminLeads(token) {
    await requireAdmin(token);
    const db = await readDb();
    return db.leads;
  }

  async function updateLead(token, leadId, updates) {
    await requireAdmin(token);
    const status = String(updates.status || "new");
    if (!leadStatuses.has(status)) {
      const error = new Error("Unsupported lead status.");
      error.status = 400;
      throw error;
    }

    return change((db) => {
      const lead = db.leads.find((item) => item.id === leadId);
      if (!lead) {
        const error = new Error("Lead not found.");
        error.status = 404;
        throw error;
      }

      lead.status = status;
      lead.notes = String(updates.notes || "").trim();
      lead.nextAction = String(updates.nextAction || lead.nextAction || "").trim();
      lead.lastContactedAt = String(updates.lastContactedAt || lead.lastContactedAt || "").trim();
      lead.updatedAt = now();
      return lead;
    });
  }

  async function setJobStatus(token, jobId, status) {
    await requireAdmin(token);
    const allowed = new Set(["pending", "approved", "rejected", "needs-info", "taken-down"]);
    if (!allowed.has(status)) {
      const error = new Error("Unsupported job status.");
      error.status = 400;
      throw error;
    }

    return change((db) => {
      const job = db.jobs.find((item) => item.id === jobId);
      if (!job) {
        const error = new Error("Job not found.");
        error.status = 404;
        throw error;
      }
      job.status = status;
      job.verifiedEmployer = status === "approved";
      job.updatedAt = now();
      return job;
    });
  }

  async function selectPlan(token, planId) {
    const user = await requireUser(token);
    if (user.role !== "employer" && user.role !== "admin") {
      const error = new Error("Employer access required.");
      error.status = 403;
      throw error;
    }

    return change((db) => {
      if (!db.plans.some((plan) => plan.id === planId)) {
        const error = new Error("Plan not found.");
        error.status = 404;
        throw error;
      }
      const stored = db.users.find((item) => item.id === user.id);
      stored.planId = planId;
      return publicUser(stored);
    });
  }

  async function listPlans() {
    const db = await readDb();
    return db.plans;
  }

  return {
    readDb,
    registerEmployer,
    login,
    logout,
    userForToken,
    publicJobs,
    employerJobs,
    employerApplications,
    createJob,
    createApplication,
    createPartnerApplication,
    adminGrowth,
    updatePartnerStatus,
    adminJobs,
    adminApplications,
    adminLeads,
    updateLead,
    setJobStatus,
    selectPlan,
    listPlans
  };
}
