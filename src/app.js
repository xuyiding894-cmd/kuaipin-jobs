import { categories, schedules } from "./jobs.js";
import { filterJobs, validateApplication, validatePosting } from "./jobLogic.js";
import { errorText, labelFor, localizeJob, normalizeLocale, t } from "./i18n.js";
import { BRAND_NAME } from "./brand.js";
import { buildInviteText } from "./growth.js";
import { difficulties, settlements, taskSources, taskTypes, workModeFilters } from "./workModes.js";
import {
  buildDraftCopyText,
  buildGmailComposeHref,
  buildMailtoHref,
  buildOutlookComposeHref,
  buildSmsHref,
  emailDraftFields,
  outreachMessage
} from "./outreach.js";
import { createStaticDemoApi, shouldUseStaticDemoApi } from "./staticDemoApi.js";

const app = document.querySelector("#app");
const localeStorageKey = "quickshift.locale";
const tokenStorageKey = "quickshift.token";
const staticDemoApi = shouldUseStaticDemoApi(window.location) ? createStaticDemoApi() : null;

const state = {
  jobs: [],
  plans: [],
  employerJobs: [],
  employerApplications: [],
  adminJobs: [],
  adminApplications: [],
  adminLeads: [],
  adminGrowth: { partnerApplications: [], referralEvents: [], rewardLedger: [] },
  partnerResult: null,
  user: null,
  token: loadToken(),
  locale: loadLocale(),
  filters: {
    keyword: "",
    location: "",
    category: "",
    schedule: "",
    workMode: "",
    minPay: ""
  },
  selectedJobId: null,
  mode: "detail",
  errors: {},
  drafts: {
    apply: {},
    post: {},
    login: {},
    register: {}
  },
  emailComposerLeadId: "",
  notice: "",
  loading: true
};

function loadLocale() {
  try {
    return normalizeLocale(localStorage.getItem(localeStorageKey));
  } catch {
    return "zh";
  }
}

function loadToken() {
  try {
    return localStorage.getItem(tokenStorageKey) || "";
  } catch {
    return "";
  }
}

function saveLocale(locale) {
  try {
    localStorage.setItem(localeStorageKey, locale);
  } catch {
    // The UI can still switch language if storage is unavailable.
  }
}

function saveToken(token) {
  state.token = token || "";
  try {
    if (token) localStorage.setItem(tokenStorageKey, token);
    else localStorage.removeItem(tokenStorageKey);
  } catch {
    // Session remains in memory if storage is unavailable.
  }
}

function text(key, values) {
  return t(state.locale, key, values);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function api(path, options = {}) {
  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
  };
  const requestOptions = {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  };

  if (staticDemoApi) return staticDemoApi(path, requestOptions);

  const response = await fetch(path, requestOptions);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

async function refreshData() {
  const [{ jobs }, { plans }] = await Promise.all([api("/api/jobs"), api("/api/plans")]);
  state.jobs = jobs;
  state.plans = plans;
  state.selectedJobId = state.selectedJobId || jobs[0]?.id || null;

  if (state.token) {
    const { user } = await api("/api/session");
    state.user = user;
    if (!user) saveToken("");
  } else {
    state.user = null;
  }

  await refreshRoleData();
}

async function refreshRoleData() {
  if (!state.user) {
    state.employerJobs = [];
    state.employerApplications = [];
    state.adminJobs = [];
    state.adminApplications = [];
    state.adminLeads = [];
    state.adminGrowth = { partnerApplications: [], referralEvents: [], rewardLedger: [] };
    state.partnerResult = null;
    return;
  }

  if (state.user.role === "employer" || state.user.role === "admin") {
    const [{ jobs }, { applications }] = await Promise.all([
      api("/api/employer/jobs"),
      api("/api/employer/applications")
    ]);
    state.employerJobs = jobs;
    state.employerApplications = applications;
  }

  if (state.user.role === "admin") {
    const [{ jobs }, { applications }, { leads }, growth] = await Promise.all([
      api("/api/admin/jobs"),
      api("/api/admin/applications"),
      api("/api/admin/leads"),
      api("/api/admin/growth")
    ]);
    state.adminJobs = jobs;
    state.adminApplications = applications;
    state.adminLeads = leads;
    state.adminGrowth = growth;
  } else {
    state.adminJobs = [];
    state.adminApplications = [];
    state.adminLeads = [];
    state.adminGrowth = { partnerApplications: [], referralEvents: [], rewardLedger: [] };
  }
}

function money(job) {
  return `$${Number(job.pay)}/${job.payType === "hour" ? "hr" : escapeHtml(job.payType)}`;
}

function optionList(items, selected, group) {
  return items
    .map((item) => {
      const safeItem = escapeHtml(item);
      const label = group ? labelFor(state.locale, group, item) : item;
      return `<option value="${safeItem}" ${item === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function fieldError(name) {
  return state.errors[name]
    ? `<p class="field-error" id="${state.mode}-${name}-error">${escapeHtml(errorText(state.locale, state.errors[name]))}</p>`
    : "";
}

function fieldState(name) {
  return state.errors[name] ? `aria-invalid="true" aria-describedby="${state.mode}-${name}-error"` : "";
}

function visibleJobs() {
  return filterJobs(state.jobs.map((job) => localizeJob(job, state.locale)), state.filters);
}

function selectedJob() {
  const jobs = visibleJobs();
  return jobs.find((job) => job.id === state.selectedJobId) || jobs[0] || null;
}

function renderTaskMeta(job) {
  if (job.workMode !== "task") return "";
  return `
    <div class="task-meta">
      ${job.taskSource === "campus" ? `<span>${text("studentInitiated")}</span>` : ""}
      <span>${escapeHtml(labelFor(state.locale, "taskTypes", job.taskType))}</span>
      ${job.campusName ? `<span>${escapeHtml(job.campusName)}</span>` : ""}
      <span>${escapeHtml(job.estimatedTime || "-")}</span>
      <span>${escapeHtml(labelFor(state.locale, "settlements", job.settlement))}</span>
      <span>${job.remoteFriendly ? text("remoteFriendly") : escapeHtml(job.location)}</span>
    </div>
  `;
}

function statusText(status) {
  const map = {
    pending: "statusPending",
    approved: "statusApproved",
    rejected: "statusRejected",
    "needs-info": "statusNeedsInfo",
    "taken-down": "statusTakenDown"
  };
  return text(map[status] || "statusPending");
}

function leadStatusText(status) {
  const map = {
    new: "leadNew",
    contacted: "leadContacted",
    interested: "leadInterested",
    "not-hiring": "leadNotHiring",
    "follow-up": "leadFollowUp",
    converted: "leadConverted",
    stopped: "leadStopped"
  };
  return text(map[status] || "leadNew");
}

function riskText(level) {
  const map = {
    low: "riskLow",
    medium: "riskMedium",
    high: "riskHigh"
  };
  return text(map[level] || "riskLow");
}

function filterFocusState(field) {
  return {
    name: field.dataset.filter,
    start: field.selectionStart,
    end: field.selectionEnd
  };
}

function restoreFilterFocus(focusState) {
  if (!focusState?.name) return;
  const field = app.querySelector(`[data-filter="${focusState.name}"]`);
  if (!field) return;

  field.focus({ preventScroll: true });
  if (typeof field.setSelectionRange !== "function" || focusState.start === null || focusState.end === null) return;

  try {
    field.setSelectionRange(focusState.start, focusState.end);
  } catch {
    // Some input types, such as number, do not support text selection.
  }
}

function renderJobCard(job) {
  const active = selectedJob()?.id === job.id;
  const badgeClass = job.verifiedEmployer ? "verified" : "pending";
  const badgeText = job.verifiedEmployer ? text("verified") : text("pending");
  const category = labelFor(state.locale, "categories", job.category);
  const schedule = labelFor(state.locale, "schedules", job.schedule);

  return `
    <article class="job-card ${active ? "is-active" : ""}">
      <button class="job-card-button" type="button" data-select-job="${escapeHtml(job.id)}" ${active ? 'aria-current="true"' : ""}>
        <span class="job-card-topline">
          <span class="job-title">${escapeHtml(job.title)}</span>
          <span class="pay">${money(job)}</span>
        </span>
        <span class="company-line">
          <span>${escapeHtml(job.employer)}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </span>
        <span class="meta-line">${escapeHtml(job.location)} · ${escapeHtml(schedule)} · ${escapeHtml(category)}</span>
        ${renderTaskMeta(job)}
        <span class="description">${escapeHtml(job.description)}</span>
      </button>
    </article>
  `;
}

function renderDetail(job) {
  if (!job) {
    return `
      <aside class="detail-panel empty-state">
        <h2>${text("noMatchesTitle")}</h2>
        <p>${text("noMatchesDetailCopy")}</p>
      </aside>
    `;
  }

  const employerBadgeClass = job.verifiedEmployer ? "verified" : "pending";
  const employerBadgeText = job.verifiedEmployer ? text("employerVerified") : text("employerPending");

  return `
    <aside class="detail-panel">
      <div class="detail-header">
        <p class="eyebrow">${escapeHtml(labelFor(state.locale, "categories", job.category))}</p>
        <h2>${escapeHtml(job.title)}</h2>
        <p class="muted">${escapeHtml(job.employer)} · ${escapeHtml(job.location)}</p>
      </div>
      <div class="trust-row">
        <span class="badge ${employerBadgeClass}">${employerBadgeText}</span>
        <span class="badge">${text("clearPay")}</span>
        <span class="badge">${text("postedAt", { date: job.postedAt })}</span>
      </div>
      <dl class="facts">
        <div><dt>${text("pay")}</dt><dd>${money(job)}</dd></div>
        <div><dt>${text("schedule")}</dt><dd>${escapeHtml(labelFor(state.locale, "schedules", job.schedule))}</dd></div>
        <div><dt>${text("location")}</dt><dd>${job.remote ? text("remote") : escapeHtml(job.location)}</dd></div>
      </dl>
      <p>${escapeHtml(job.description)}</p>
      ${renderTaskMeta(job)}
      <h3>${text("requirements")}</h3>
      <ul>${job.requirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <button class="primary-button full" type="button" data-open-apply="${escapeHtml(job.id)}">${job.workMode === "task" ? text("takeTask") : text("applyNow")}</button>
    </aside>
  `;
}

function renderApplyForm(job) {
  const draft = state.drafts.apply;

  return `
    <aside class="detail-panel">
      <button class="link-button" type="button" data-back-detail>${text("backToDetails")}</button>
      <h2>${text("applyFor", { title: escapeHtml(job.title) })}</h2>
      <form class="stack-form" data-apply-form>
        <label>${text("name")}<input name="name" autocomplete="name" value="${escapeHtml(draft.name)}" ${fieldState("name")}>${fieldError("name")}</label>
        <label>${text("contact")}<input name="contact" autocomplete="email" value="${escapeHtml(draft.contact)}" ${fieldState("contact")}>${fieldError("contact")}</label>
        <label>${text("availability")}<input name="availability" placeholder="${text("availabilityPlaceholder")}" value="${escapeHtml(draft.availability)}" ${fieldState("availability")}>${fieldError("availability")}</label>
        <label>${text("referralCodeLabel")}<input name="referralCode" value="${escapeHtml(draft.referralCode || "")}"></label>
        <label>${text("message")}<textarea name="message" rows="4" placeholder="${text("messagePlaceholder")}">${escapeHtml(draft.message)}</textarea></label>
        <button class="primary-button full" type="submit">${text("submitApplication")}</button>
      </form>
    </aside>
  `;
}

function renderPostingForm() {
  const draft = state.drafts.post;
  const selectedCategory = draft.category || categories[0] || "";
  const publishLabel = draft.workMode === "campusTask"
    ? text("publishCampusTask")
    : draft.workMode === "task"
      ? text("publishTask")
      : text("publishJob");

  return `
    <aside class="detail-panel">
      <button class="link-button" type="button" data-back-detail>${text("backToDetails")}</button>
      <h2>${text("postTitle")}</h2>
      <form class="stack-form" data-post-form>
        <label>${text("postType")}<select name="workMode">
          ${optionList(workModeFilters, draft.workMode || "job", "workModes")}
        </select></label>
        <label>${text("jobTitle")}<input name="title" value="${escapeHtml(draft.title)}" ${fieldState("title")}>${fieldError("title")}</label>
        <label>${text("employerName")}<input name="employer" value="${escapeHtml(draft.employer || state.user?.company)}" ${fieldState("employer")}>${fieldError("employer")}</label>
        <label>${text("categoryLabel")}<select name="category">${optionList(categories, selectedCategory, "categories")}</select></label>
        <label>${text("pay")}<input name="pay" type="number" min="1" value="${escapeHtml(draft.pay)}" ${fieldState("pay")}>${fieldError("pay")}</label>
        <label>${text("payUnit")}<select name="payType"><option value="hour" ${(draft.payType || "hour") === "hour" ? "selected" : ""}>${text("perHour")}</option><option value="shift" ${draft.payType === "shift" ? "selected" : ""}>${text("perShift")}</option><option value="day" ${draft.payType === "day" ? "selected" : ""}>${text("perDay")}</option><option value="task" ${draft.payType === "task" ? "selected" : ""}>${text("perTask")}</option></select></label>
        <label>${text("taskSourceLabel")}<select name="taskSource">
          ${optionList(taskSources, draft.taskSource || "employer", "taskSources")}
        </select></label>
        <label>${text("taskTypeLabel")}<select name="taskType">
          <option value="">${text("taskTypeLabel")}</option>
          ${optionList(taskTypes, draft.taskType || "", "taskTypes")}
        </select>${fieldError("taskType")}</label>
        <label>${text("campusName")}<input name="campusName" value="${escapeHtml(draft.campusName || "")}" ${fieldState("campusName")}>${fieldError("campusName")}</label>
        <label>${text("targetAudience")}<input name="targetAudience" value="${escapeHtml(draft.targetAudience || "")}"></label>
        <label>${text("estimatedTime")}<input name="estimatedTime" value="${escapeHtml(draft.estimatedTime || "")}" ${fieldState("estimatedTime")}>${fieldError("estimatedTime")}</label>
        <label>${text("difficulty")}<select name="difficulty">${optionList(difficulties, draft.difficulty || "standard", "difficulties")}</select></label>
        <label>${text("settlement")}<select name="settlement">
          <option value="">${text("settlement")}</option>
          ${optionList(settlements, draft.settlement || "", "settlements")}
        </select>${fieldError("settlement")}</label>
        <label class="checkbox-line"><input name="remoteFriendly" type="checkbox" ${draft.remoteFriendly ? "checked" : ""}> ${text("remoteFriendly")}</label>
        <label>${text("location")}<input name="location" placeholder="${text("locationPlaceholder")}" value="${escapeHtml(draft.location)}" ${fieldState("location")}>${fieldError("location")}</label>
        <label>${text("schedule")}<select name="schedule" ${fieldState("schedule")}>${optionList(schedules, draft.schedule || "Flexible", "schedules")}</select>${fieldError("schedule")}</label>
        <label>${text("description")}<textarea name="description" rows="4" ${fieldState("description")}>${escapeHtml(draft.description)}</textarea>${fieldError("description")}</label>
        <label>${text("contactMethod")}<input name="contact" placeholder="${text("contactPlaceholder")}" value="${escapeHtml(draft.contact)}"></label>
        <button class="primary-button full" type="submit">${publishLabel}</button>
      </form>
    </aside>
  `;
}

function renderAuthPanel() {
  return `
    <section class="ops-panel account-panel">
      <div>
        <p class="eyebrow">${text("account")}</p>
        <h2>${text("login")} / ${text("register")}</h2>
        <p class="muted">${text("demoEmployer")}</p>
        <p class="muted">${text("demoAdmin")}</p>
      </div>
      <div class="ops-grid two">
        <form class="stack-form" data-login-form>
          <h3>${text("login")}</h3>
          <label>${text("email")}<input name="email" type="email" value="${escapeHtml(state.drafts.login.email)}"></label>
          <label>${text("password")}<input name="password" type="password"></label>
          <button class="primary-button" type="submit">${text("login")}</button>
        </form>
        <form class="stack-form" data-register-form>
          <h3>${text("register")}</h3>
          <label>${text("name")}<input name="name" value="${escapeHtml(state.drafts.register.name)}"></label>
          <label>${text("company")}<input name="company" value="${escapeHtml(state.drafts.register.company)}"></label>
          <label>${text("publisherTypeLabel")}<select name="publisherType">
            <option value="employer">${text("publisherEmployer")}</option>
            <option value="student">${text("publisherStudent")}</option>
          </select></label>
          <label>${text("campusName")}<input name="campusName" value="${escapeHtml(state.drafts.register.campusName || "")}"></label>
          <label>${text("referralCodeLabel")}<input name="referralCode" value="${escapeHtml(state.drafts.register.referralCode || "")}"></label>
          <label>${text("email")}<input name="email" type="email" value="${escapeHtml(state.drafts.register.email)}"></label>
          <label>${text("password")}<input name="password" type="password"></label>
          <button class="secondary-button" type="submit">${text("register")}</button>
        </form>
      </div>
    </section>
  `;
}

function renderPlans() {
  if (!state.user) return "";
  return `
    <section class="ops-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${text("paymentComingSoon")}</p>
          <h2>${text("planSelection")}</h2>
        </div>
        <span class="badge verified">${text("currentPlan")}: ${escapeHtml(state.user.planId || "free")}</span>
      </div>
      <div class="plan-grid">
        ${state.plans.map((plan) => `
          <article class="plan-card ${state.user.planId === plan.id ? "is-active" : ""}">
            <h3>${escapeHtml(plan.name)}</h3>
            <p class="pay">$${plan.price}/mo</p>
            <p>${plan.jobLimit} ${text("postJob")}</p>
            <ul>${plan.perks.map((perk) => `<li>${escapeHtml(perk)}</li>`).join("")}</ul>
            <button class="secondary-button" type="button" data-select-plan="${escapeHtml(plan.id)}">${text("choosePlan")}</button>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderInvitePanel() {
  if (!state.user?.referralCode) return "";
  const inviteText = buildInviteText({ referralCode: state.user.referralCode, locale: state.locale });
  const points = Number.isFinite(Number(state.user.points))
    ? `<span class="badge verified">${text("invitePoints", { count: Number(state.user.points) })}</span>`
    : "";

  return `
    <section class="invite-panel">
      <div>
        <p class="eyebrow">${text("myInvites")}</p>
        <h3>${escapeHtml(state.user.referralCode)}</h3>
        <p class="muted">${escapeHtml(inviteText)}</p>
      </div>
      <div class="invite-actions">
        ${points}
        <button class="secondary-button" type="button" data-copy-invite>${text("copyInviteText")}</button>
      </div>
    </section>
  `;
}

function renderPartnerProgram() {
  return `
    <section class="ops-panel partner-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${text("partnerProgram")}</p>
          <h2>${text("partnerHeadline")}</h2>
          <p class="muted">${text("partnerCopy")}</p>
        </div>
      </div>
      <form class="stack-form partner-form" data-partner-form>
        <label>${text("name")}<input name="name" autocomplete="name"></label>
        <label>${text("contactMethod")}<input name="contact" autocomplete="email"></label>
        <label>${text("campus")}<input name="campus"></label>
        <label>${text("promotionChannel")}<input name="channel"></label>
        <label>${text("message")}<textarea name="note" rows="3"></textarea></label>
        <button class="primary-button" type="submit">${text("applyPartner")}</button>
      </form>
      ${state.partnerResult
        ? `<p class="notice partner-result">${text("partnerCodeReady", { code: escapeHtml(state.partnerResult.referralCode) })}</p>`
        : ""}
    </section>
  `;
}

function renderAudit(job) {
  if (!job.audit) return "";
  return `
    <div class="audit-box risk-${escapeHtml(job.audit.level)}">
      <strong>${text("smartAudit")}: ${riskText(job.audit.level)} (${job.audit.score})</strong>
      ${job.audit.reasons.length ? `<ul>${job.audit.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("")}</ul>` : ""}
    </div>
  `;
}

function leadStatusOptions(selected) {
  return ["new", "contacted", "interested", "not-hiring", "follow-up", "converted", "stopped"]
    .map((status) => `<option value="${status}" ${status === selected ? "selected" : ""}>${leadStatusText(status)}</option>`)
    .join("");
}

async function copyTextToClipboard(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Some embedded browsers deny Clipboard API writes, so fall back to a selected textarea.
    }
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.append(field);
  field.select();
  document.execCommand("copy");
  field.remove();
}

function renderEmployerOutreach() {
  if (state.user?.role !== "admin") return "";
  return `
    <section class="ops-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${text("employerOutreachEyebrow")}</p>
          <h2>${text("employerOutreach")}</h2>
          <p class="muted">${text("outreachDraftHint")}</p>
        </div>
        <span class="badge verified">${text("leadCount", { count: state.adminLeads.length })}</span>
      </div>
      <div class="lead-grid">
        ${state.adminLeads.length ? state.adminLeads.map((lead) => `
          <article class="ops-card lead-card">
            <div class="job-card-topline">
              <strong>${escapeHtml(lead.name)}</strong>
              <span class="badge priority-${escapeHtml(lead.priority)}">${escapeHtml(lead.priority)}</span>
            </div>
            <p class="muted">${escapeHtml(lead.category)} / ${escapeHtml(lead.area)}</p>
            <dl class="lead-facts">
              <div><dt>${text("outreachPhone")}</dt><dd>${escapeHtml(lead.phone || "-")}</dd></div>
              <div><dt>${text("outreachEmail")}</dt><dd>${escapeHtml(lead.email || "-")}</dd></div>
              <div><dt>${text("leadStatus")}</dt><dd>${leadStatusText(lead.status)}</dd></div>
            </dl>
            <p class="muted">${text("outreachSource")}: ${lead.sourceUrl ? `<a href="${escapeHtml(lead.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(lead.sourceLabel)}</a>` : escapeHtml(lead.sourceLabel)}</p>
            <form class="stack-form lead-form" data-lead-form data-lead-id="${escapeHtml(lead.id)}">
              <label>${text("leadStatus")}<select name="status">${leadStatusOptions(lead.status)}</select></label>
              <label>${text("outreachNextAction")}<input name="nextAction" value="${escapeHtml(lead.nextAction)}"></label>
              <label>${text("outreachNotes")}<textarea name="notes" rows="3">${escapeHtml(lead.notes)}</textarea></label>
              <input type="hidden" name="lastContactedAt" value="${escapeHtml(lead.lastContactedAt)}">
              <div class="action-row">
                <button class="secondary-button" type="button" data-copy-sms="zh" data-lead-id="${escapeHtml(lead.id)}">${text("copyChineseSms")}</button>
                <button class="secondary-button" type="button" data-copy-sms="en" data-lead-id="${escapeHtml(lead.id)}">${text("copyEnglishSms")}</button>
                ${buildSmsHref(lead, state.locale)
                  ? `<button class="secondary-button" type="button" data-open-draft="sms" data-lead-id="${escapeHtml(lead.id)}">${text("openSmsDraft")}</button>`
                  : `<span class="secondary-button is-disabled">${text("noPhone")}</span>`}
                ${buildMailtoHref(lead, state.locale)
                  ? `<button class="secondary-button" type="button" data-open-draft="email" data-lead-id="${escapeHtml(lead.id)}">${text("openEmailDraft")}</button>`
                  : `<span class="secondary-button is-disabled">${text("noEmail")}</span>`}
                <button class="primary-button" type="submit">${text("saveLead")}</button>
              </div>
            </form>
          </article>
        `).join("") : `<p class="muted">${text("noLeads")}</p>`}
      </div>
    </section>
  `;
}

function renderEmailComposer() {
  if (!state.emailComposerLeadId) return "";
  const lead = state.adminLeads.find((item) => item.id === state.emailComposerLeadId);
  if (!lead?.email) return "";
  const draft = emailDraftFields(lead, state.locale);
  const gmailHref = buildGmailComposeHref(lead, state.locale);
  const outlookHref = buildOutlookComposeHref(lead, state.locale);

  return `
    <section class="composer-backdrop" role="dialog" aria-modal="true" aria-labelledby="email-composer-title">
      <div class="composer-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">${text("emailComposerEyebrow")}</p>
            <h2 id="email-composer-title">${text("emailComposerTitle", { name: escapeHtml(lead.name) })}</h2>
          </div>
          <button class="secondary-button compact" type="button" data-close-composer>${text("close")}</button>
        </div>
        <div class="composer-fields">
          <label>${text("emailTo")}<input readonly value="${escapeHtml(draft.to)}"></label>
          <label>${text("emailSubject")}<input readonly value="${escapeHtml(draft.subject)}"></label>
          <label>${text("emailBody")}<textarea readonly rows="10">${escapeHtml(draft.body)}</textarea></label>
        </div>
        <div class="action-row">
          <button class="secondary-button" type="button" data-copy-email-field="to">${text("copyEmailTo")}</button>
          <button class="secondary-button" type="button" data-copy-email-field="subject">${text("copyEmailSubject")}</button>
          <button class="secondary-button" type="button" data-copy-email-field="body">${text("copyEmailBody")}</button>
          <button class="secondary-button" type="button" data-copy-email-field="all">${text("copyEmailAll")}</button>
        </div>
        <div class="action-row">
          <a class="primary-button" href="${escapeHtml(gmailHref)}" target="_blank" rel="noreferrer">${text("openGmailDraft")}</a>
          <a class="secondary-button" href="${escapeHtml(outlookHref)}" target="_blank" rel="noreferrer">${text("openOutlookDraft")}</a>
        </div>
        <p class="muted">${text("emailComposerHint")}</p>
      </div>
    </section>
  `;
}

function partnerStatusActions(partner) {
  return ["approved", "frozen", "rejected"]
    .filter((status) => status !== partner.status)
    .map((status) => `
      <button class="secondary-button" type="button" data-partner-status="${status}" data-partner-id="${escapeHtml(partner.id)}">
        ${status === "approved" ? text("approve") : status === "frozen" ? text("freeze") : text("reject")}
      </button>
    `)
    .join("");
}

function renderCompactGrowthList(items, emptyText, formatter) {
  if (!items.length) return `<p class="muted">${emptyText}</p>`;
  return `
    <ul class="compact-list">
      ${items.slice(0, 5).map((item) => `<li>${formatter(item)}</li>`).join("")}
    </ul>
  `;
}

function renderAdminGrowth() {
  if (state.user?.role !== "admin") return "";
  const growth = state.adminGrowth || { partnerApplications: [], referralEvents: [], rewardLedger: [] };

  return `
    <section class="ops-panel growth-review">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${text("growthReview")}</p>
          <h2>${text("partnerProgram")}</h2>
        </div>
      </div>
      <div class="growth-summary">
        <span><strong>${growth.partnerApplications.length}</strong>${text("partnerApplications")}</span>
        <span><strong>${growth.referralEvents.length}</strong>${text("referralEvents")}</span>
        <span><strong>${growth.rewardLedger.length}</strong>${text("rewardLedger")}</span>
      </div>
      <h3>${text("partnerApplications")}</h3>
      <div class="ops-list">
        ${growth.partnerApplications.length ? growth.partnerApplications.map((partner) => `
          <article class="ops-card">
            <div class="job-card-topline">
              <strong>${escapeHtml(partner.name)}</strong>
              <span class="badge status-${escapeHtml(partner.status)}">${escapeHtml(partner.status)}</span>
            </div>
            <p class="muted">${escapeHtml(partner.campus || "-")} / ${escapeHtml(partner.referralCode || "-")}</p>
            <p class="muted">${escapeHtml(partner.contact || "-")} / ${escapeHtml(partner.channel || "-")}</p>
            <p>${escapeHtml(partner.note || "")}</p>
            <div class="action-row">${partnerStatusActions(partner)}</div>
          </article>
        `).join("") : `<p class="muted">${text("noGrowthRecords")}</p>`}
      </div>
      <div class="ops-grid two">
        <section>
          <h3>${text("referralEvents")}</h3>
          ${renderCompactGrowthList(growth.referralEvents, text("noGrowthRecords"), (event) => `
            <span>${escapeHtml(event.type)} / ${escapeHtml(event.referralCode || "-")}</span>
            <span class="muted">${escapeHtml(event.status || "-")}</span>
          `)}
        </section>
        <section>
          <h3>${text("rewardLedger")}</h3>
          ${renderCompactGrowthList(growth.rewardLedger, text("noGrowthRecords"), (reward) => `
            <span>${escapeHtml(reward.reason)} / ${escapeHtml(reward.benefit || "-")}</span>
            <span class="muted">${escapeHtml(reward.points ?? 0)} pts</span>
          `)}
        </section>
      </div>
    </section>
  `;
}

function renderEmployerDashboard() {
  if (!state.user || (state.user.role !== "employer" && state.user.role !== "admin")) return "";
  return `
    <section class="ops-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">${escapeHtml(state.user.company || state.user.name)}</p>
          <h2>${text("employerDashboard")}</h2>
        </div>
        <button class="secondary-button" type="button" data-open-post>${text("postJob")}</button>
      </div>
      ${renderInvitePanel()}
      ${renderPlans()}
      <h3>${text("myJobs")}</h3>
      <div class="ops-list">
        ${state.employerJobs.length ? state.employerJobs.map((job) => `
          <article class="ops-card">
            <div class="job-card-topline">
              <strong>${escapeHtml(job.title)}</strong>
              <span class="badge status-${escapeHtml(job.status)}">${statusText(job.status)}</span>
            </div>
            <p class="muted">${escapeHtml(job.location)} · ${money(job)}</p>
            ${renderAudit(job)}
          </article>
        `).join("") : `<p class="muted">${text("publicJobsOnly")}</p>`}
      </div>
      <h3>${text("applications")}</h3>
      <div class="ops-list">
        ${state.employerApplications.length ? state.employerApplications.map((application) => `
          <article class="ops-card">
            <strong>${escapeHtml(application.applicantName)}</strong>
            <p>${escapeHtml(application.jobTitle)} · ${escapeHtml(application.availability)}</p>
            <p class="muted">${escapeHtml(application.contact)}</p>
            <p>${escapeHtml(application.message)}</p>
          </article>
        `).join("") : `<p class="muted">${text("noApplications")}</p>`}
      </div>
    </section>
  `;
}

function renderAdminDashboard() {
  if (state.user?.role !== "admin") return "";
  return `
    <section class="ops-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Admin</p>
          <h2>${text("adminDashboard")}</h2>
        </div>
      </div>
      <h3>${text("reviewQueue")}</h3>
      <div class="ops-list">
        ${state.adminJobs.map((job) => `
          <article class="ops-card">
            <div class="job-card-topline">
              <strong>${escapeHtml(job.title)}</strong>
              <span class="badge status-${escapeHtml(job.status)}">${statusText(job.status)}</span>
            </div>
            <p class="muted">${escapeHtml(job.employer)} · ${escapeHtml(job.location)} · ${money(job)}</p>
            <p>${escapeHtml(job.description)}</p>
            ${renderAudit(job)}
            <div class="action-row">
              <button class="secondary-button" type="button" data-admin-status="approved" data-job-id="${escapeHtml(job.id)}">${text("approve")}</button>
              <button class="secondary-button" type="button" data-admin-status="needs-info" data-job-id="${escapeHtml(job.id)}">${text("needsInfo")}</button>
              <button class="secondary-button" type="button" data-admin-status="rejected" data-job-id="${escapeHtml(job.id)}">${text("reject")}</button>
              <button class="secondary-button" type="button" data-admin-status="taken-down" data-job-id="${escapeHtml(job.id)}">${text("takeDown")}</button>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAccountStrip() {
  if (!state.user) {
    return `<button class="secondary-button" type="button" data-open-auth>${text("login")}</button>`;
  }

  return `
    <span class="account-chip">${escapeHtml(state.user.name)} · ${escapeHtml(state.user.role)}</span>
    <button class="secondary-button" type="button" data-logout>${text("logout")}</button>
  `;
}

function renderHeroPanel(resultText, taskCount) {
  return `
    <header class="topbar hero-panel">
      <div class="hero-copy">
        <p class="eyebrow">${text("trustedHiring")}</p>
        <h1><span class="brand-mark" aria-hidden="true">快</span><span>${BRAND_NAME}</span></h1>
        <h2>${text("heroHeadline")}</h2>
        <p class="topbar-copy">${text("heroSubhead")}</p>
        <div class="hero-actions">
          <button class="primary-button" type="button" data-open-post>${text("heroPostAction")}</button>
          <a class="secondary-button" href="#job-market">${text("heroFindAction")}</a>
        </div>
      </div>
      <div class="hero-side">
        <div class="topbar-actions">
          <div class="language-switch" aria-label="${text("languageLabel")}">
            <button type="button" data-locale="zh" class="${state.locale === "zh" ? "is-active" : ""}" aria-pressed="${state.locale === "zh"}">中文</button>
            <button type="button" data-locale="en" class="${state.locale === "en" ? "is-active" : ""}" aria-pressed="${state.locale === "en"}">EN</button>
          </div>
          ${renderAccountStrip()}
        </div>
        <div class="mini-board" aria-label="${text("platformStatus")}">
          <span><strong>24h</strong>${text("fastApply")}</span>
          <span><strong>AI</strong>${text("smartReviewMetric")}</span>
          <span><strong>${taskCount}</strong>${text("lightTasks")}</span>
          <span><strong>${escapeHtml(resultText.replace(/\D.*$/, "") || "0")}</strong>${text("marketMatchMetric")}</span>
        </div>
      </div>
    </header>
  `;
}

function renderQuickStartTiles() {
  const tiles = [
    { token: "校", title: text("tileCampusTask"), detail: text("tileCampusTaskDetail"), workMode: "campusTask", category: "Campus" },
    { token: "远", title: text("tileRemoteTask"), detail: text("tileRemoteTaskDetail"), workMode: "task", category: "Remote" },
    { token: "文", title: text("tileContentTask"), detail: text("tileContentTaskDetail"), workMode: "task", category: "Remote" },
    { token: "店", title: text("tileStoreShift"), detail: text("tileStoreShiftDetail"), workMode: "job", category: "Food Service" },
    { token: "会", title: text("tileEventHelp"), detail: text("tileEventHelpDetail"), workMode: "job", category: "Events" },
    { token: "灵", title: text("tileFlexibleWork"), detail: text("tileFlexibleWorkDetail"), workMode: "", category: "" }
  ];

  return `
    <section class="quick-start-panel" aria-label="${text("quickStartTitle")}">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${text("quickStartEyebrow")}</p>
          <h2>${text("quickStartTitle")}</h2>
        </div>
        <p class="muted">${text("quickStartCopy")}</p>
      </div>
      <div class="quick-tile-grid">
        ${tiles.map((tile) => `
          <button class="quick-tile" type="button" data-quick-work-mode="${escapeHtml(tile.workMode)}" data-quick-category="${escapeHtml(tile.category)}">
            <span class="tile-token">${escapeHtml(tile.token)}</span>
            <span>
              <strong>${escapeHtml(tile.title)}</strong>
              <small>${escapeHtml(tile.detail)}</small>
            </span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMarketplaceSignals() {
  const signals = [
    { title: text("signalVerifiedTitle"), detail: text("signalVerifiedDetail") },
    { title: text("signalReviewTitle"), detail: text("signalReviewDetail") },
    { title: text("signalPayTitle"), detail: text("signalPayDetail") },
    { title: text("signalReferralTitle"), detail: text("signalReferralDetail") }
  ];

  return `
    <section class="marketplace-signals" aria-label="${text("marketplaceSignalsTitle")}">
      <div>
        <p class="eyebrow">${text("marketplaceSignalsEyebrow")}</p>
        <h2>${text("marketplaceSignalsTitle")}</h2>
      </div>
      <div class="signal-grid">
        ${signals.map((signal, index) => `
          <article class="signal-card">
            <span class="signal-index">0${index + 1}</span>
            <strong>${escapeHtml(signal.title)}</strong>
            <p>${escapeHtml(signal.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderWorkFlowStrip() {
  const steps = [
    { title: text("flowStepOne"), detail: text("flowStepOneDetail") },
    { title: text("flowStepTwo"), detail: text("flowStepTwoDetail") },
    { title: text("flowStepThree"), detail: text("flowStepThreeDetail") }
  ];

  return `
    <section class="workflow-strip" aria-label="${text("workflowTitle")}">
      <h2>${text("workflowTitle")}</h2>
      <div class="workflow-steps">
        ${steps.map((step, index) => `
          <article>
            <span>${index + 1}</span>
            <strong>${escapeHtml(step.title)}</strong>
            <p>${escapeHtml(step.detail)}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function render() {
  document.documentElement.lang = state.locale === "zh" ? "zh-CN" : "en";

  if (state.loading) {
    app.innerHTML = `<main class="app-shell"><p>${text("loading")}</p></main>`;
    return;
  }

  const jobs = visibleJobs();
  const job = selectedJob();
  const resultText = text("matchingJobs", { count: jobs.length });
  const taskCount = jobs.filter((item) => item.workMode === "task").length;
  const sidePanel = state.mode === "apply" && job
    ? renderApplyForm(job)
    : state.mode === "post"
      ? renderPostingForm()
      : renderDetail(job);

  app.innerHTML = `
    <main class="app-shell">
      ${renderHeroPanel(resultText, taskCount)}
      ${renderQuickStartTiles()}
      ${renderMarketplaceSignals()}
      ${renderWorkFlowStrip()}

      <section class="toolbar" id="job-market" aria-label="${text("searchRegion")}">
        <input data-filter="keyword" type="search" value="${escapeHtml(state.filters.keyword)}" placeholder="${text("keywordPlaceholder")}" aria-label="${text("keywordLabel")}">
        <input data-filter="location" type="search" value="${escapeHtml(state.filters.location)}" placeholder="${text("locationPlaceholder")}" aria-label="${text("locationLabel")}">
        <select data-filter="category" aria-label="${text("categoryLabel")}">
          <option value="">${text("allCategories")}</option>
          ${optionList(categories, state.filters.category, "categories")}
        </select>
        <select data-filter="schedule" aria-label="${text("scheduleLabel")}">
          <option value="">${text("allSchedules")}</option>
          ${optionList(schedules, state.filters.schedule, "schedules")}
        </select>
        <select data-filter="workMode" aria-label="${text("workModeLabel")}">
          <option value="">${text("allWorkModes")}</option>
          ${optionList(workModeFilters, state.filters.workMode, "workModes")}
        </select>
        <input data-filter="minPay" type="number" min="0" value="${escapeHtml(state.filters.minPay)}" placeholder="${text("minPayPlaceholder")}" aria-label="${text("minPayLabel")}">
      </section>

      ${state.notice ? `<p class="notice" role="status">${escapeHtml(text(state.notice))}</p>` : ""}
      ${state.mode === "auth" ? renderAuthPanel() : ""}

      <section class="summary-strip" aria-label="${text("platformPromise")}">
        <span>${text("realJobsFirst")}</span>
        <span>${text("transparentPay")}</span>
        <span>${text("employerBadgeSignal")}</span>
        <span>${resultText}</span>
      </section>

      <section class="layout">
        <div class="job-list" aria-label="${text("jobListLabel")}">
          ${
            jobs.length
              ? jobs.map(renderJobCard).join("")
              : `<div class="empty-state"><h2>${text("noMatchesTitle")}</h2><p>${text("noMatchesCopy")}</p></div>`
          }
        </div>
        ${sidePanel}
      </section>

      ${renderEmployerDashboard()}
      ${renderEmployerOutreach()}
      ${renderAdminGrowth()}
      ${renderAdminDashboard()}
      ${renderPartnerProgram()}
      ${renderEmailComposer()}
    </main>
  `;
}

app.addEventListener("input", (event) => {
  const field = event.target.closest("[data-filter]");
  if (!field) return;

  const focusState = filterFocusState(field);
  state.filters[field.dataset.filter] = field.value;
  state.selectedJobId = visibleJobs()[0]?.id || null;
  state.mode = "detail";
  state.errors = {};
  state.notice = "";
  render();
  restoreFilterFocus(focusState);
});

app.addEventListener("click", async (event) => {
  const localeButton = event.target.closest("[data-locale]");
  const selectButton = event.target.closest("[data-select-job]");
  const applyButton = event.target.closest("[data-open-apply]");
  const postButton = event.target.closest("[data-open-post]");
  const backButton = event.target.closest("[data-back-detail]");
  const authButton = event.target.closest("[data-open-auth]");
  const logoutButton = event.target.closest("[data-logout]");
  const planButton = event.target.closest("[data-select-plan]");
  const adminButton = event.target.closest("[data-admin-status]");
  const copySmsButton = event.target.closest("[data-copy-sms]");
  const draftButton = event.target.closest("[data-open-draft]");
  const closeComposerButton = event.target.closest("[data-close-composer]");
  const copyEmailFieldButton = event.target.closest("[data-copy-email-field]");
  const copyInviteButton = event.target.closest("[data-copy-invite]");
  const partnerStatusButton = event.target.closest("[data-partner-status]");
  const quickFilterButton = event.target.closest("[data-quick-work-mode]");

  try {
    if (quickFilterButton) {
      state.filters.workMode = quickFilterButton.dataset.quickWorkMode || "";
      state.filters.category = quickFilterButton.dataset.quickCategory || "";
      state.selectedJobId = visibleJobs()[0]?.id || null;
      state.mode = "detail";
      state.errors = {};
      state.notice = "";
      render();
      return;
    }

    if (localeButton) {
      state.locale = normalizeLocale(localeButton.dataset.locale);
      saveLocale(state.locale);
      render();
      return;
    }

    if (selectButton) {
      state.selectedJobId = selectButton.dataset.selectJob;
      state.mode = "detail";
      state.errors = {};
      state.notice = "";
      render();
      return;
    }

    if (applyButton) {
      state.selectedJobId = applyButton.dataset.openApply;
      state.mode = "apply";
      state.errors = {};
      state.drafts.apply = {};
      state.notice = "";
      render();
      return;
    }

    if (postButton) {
      if (!state.user) {
        state.mode = "auth";
        state.notice = "loginRequiredToPost";
        render();
        return;
      }
      state.mode = "post";
      state.errors = {};
      state.drafts.post = {};
      state.notice = "";
      render();
      return;
    }

    if (authButton) {
      state.mode = "auth";
      state.notice = "";
      render();
      return;
    }

    if (logoutButton) {
      await api("/api/auth/logout", { method: "POST" });
      saveToken("");
      state.user = null;
      state.partnerResult = null;
      state.notice = "logoutSuccess";
      await refreshData();
      render();
      return;
    }

    if (backButton) {
      state.mode = "detail";
      state.errors = {};
      state.drafts.apply = {};
      state.drafts.post = {};
      render();
      return;
    }

    if (planButton) {
      const { user } = await api("/api/employer/plan", {
        method: "POST",
        body: JSON.stringify({ planId: planButton.dataset.selectPlan })
      });
      state.user = user;
      state.notice = "planUpdated";
      await refreshRoleData();
      render();
      return;
    }

    if (copyInviteButton) {
      if (!state.user?.referralCode) return;
      await copyTextToClipboard(buildInviteText({ referralCode: state.user.referralCode, locale: state.locale }));
      state.notice = "inviteCopied";
      render();
      return;
    }

    if (copySmsButton) {
      const lead = state.adminLeads.find((item) => item.id === copySmsButton.dataset.leadId);
      if (!lead) return;
      await copyTextToClipboard(outreachMessage(lead, copySmsButton.dataset.copySms));
      state.notice = "smsCopied";
      render();
      return;
    }

    if (copyEmailFieldButton) {
      const lead = state.adminLeads.find((item) => item.id === state.emailComposerLeadId);
      if (!lead) return;
      const draft = emailDraftFields(lead, state.locale);
      const field = copyEmailFieldButton.dataset.copyEmailField;
      const value = field === "all"
        ? buildDraftCopyText(lead, "email", state.locale)
        : draft[field] || "";
      await copyTextToClipboard(value);
      state.notice = "emailFieldCopied";
      render();
      return;
    }

    if (closeComposerButton) {
      state.emailComposerLeadId = "";
      render();
      return;
    }

    if (draftButton) {
      const lead = state.adminLeads.find((item) => item.id === draftButton.dataset.leadId);
      if (!lead) return;

      const channel = draftButton.dataset.openDraft;
      if (channel === "email") {
        state.emailComposerLeadId = lead.id;
        await copyTextToClipboard(buildDraftCopyText(lead, "email", state.locale));
        state.notice = "emailDraftReady";
        render();
        return;
      }

      const href = buildSmsHref(lead, state.locale);
      await copyTextToClipboard(buildDraftCopyText(lead, channel, state.locale));
      state.notice = "smsDraftCopied";
      render();
      if (href) setTimeout(() => { window.location.href = href; }, 0);
      return;
    }

    if (adminButton) {
      await api(`/api/admin/jobs/${adminButton.dataset.jobId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: adminButton.dataset.adminStatus })
      });
      state.notice = "adminUpdated";
      await refreshData();
      render();
      return;
    }

    if (partnerStatusButton) {
      await api(`/api/admin/growth/partners/${partnerStatusButton.dataset.partnerId}/status`, {
        method: "POST",
        body: JSON.stringify({ status: partnerStatusButton.dataset.partnerStatus })
      });
      state.notice = "partnerUpdated";
      await refreshData();
      render();
    }
  } catch (error) {
    state.notice = error.message;
    render();
  }
});

app.addEventListener("submit", async (event) => {
  const applyForm = event.target.closest("[data-apply-form]");
  const postForm = event.target.closest("[data-post-form]");
  const loginForm = event.target.closest("[data-login-form]");
  const registerForm = event.target.closest("[data-register-form]");
  const leadForm = event.target.closest("[data-lead-form]");
  const partnerForm = event.target.closest("[data-partner-form]");

  if (!applyForm && !postForm && !loginForm && !registerForm && !leadForm && !partnerForm) return;
  event.preventDefault();

  try {
    if (partnerForm) {
      const { partner } = await api("/api/growth/partners", {
        method: "POST",
        body: JSON.stringify(formData(partnerForm))
      });
      state.partnerResult = partner;
      state.notice = "partnerApplied";
      render();
      return;
    }

    if (leadForm) {
      await api(`/api/admin/leads/${leadForm.dataset.leadId}`, {
        method: "POST",
        body: JSON.stringify(formData(leadForm))
      });
      state.notice = "leadSaved";
      await refreshRoleData();
      render();
      return;
    }

    if (loginForm) {
      const data = formData(loginForm);
      state.drafts.login = { email: data.email };
      const session = await api("/api/auth/login", { method: "POST", body: JSON.stringify(data) });
      saveToken(session.token);
      state.user = session.user;
      state.partnerResult = null;
      state.mode = "detail";
      state.notice = "loginSuccess";
      await refreshData();
      render();
      return;
    }

    if (registerForm) {
      const data = formData(registerForm);
      state.drafts.register = data;
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(data) });
      state.mode = "auth";
      state.notice = "registerSuccess";
      state.drafts.register = {};
      render();
      return;
    }

    if (applyForm) {
      const job = selectedJob();
      const data = formData(applyForm);
      const errors = validateApplication(data);
      if (Object.keys(errors).length) {
        state.errors = errors;
        state.drafts.apply = data;
        render();
        return;
      }

      await api("/api/applications", {
        method: "POST",
        body: JSON.stringify({ ...data, jobId: job.id })
      });
      state.mode = "detail";
      state.errors = {};
      state.drafts.apply = {};
      state.notice = "applicationSubmitted";
      await refreshRoleData();
      render();
      return;
    }

    const rawData = formData(postForm);
    const data = rawData.workMode === "campusTask"
      ? { ...rawData, workMode: "task", taskSource: "campus" }
      : rawData;
    const errors = validatePosting(data);
    if (Object.keys(errors).length) {
      state.errors = errors;
      state.drafts.post = rawData;
      render();
      return;
    }

    const { job } = await api("/api/jobs", { method: "POST", body: JSON.stringify(data) });
    state.filters = { keyword: "", location: "", category: "", schedule: "", workMode: "", minPay: "" };
    state.selectedJobId = job.id;
    state.mode = "detail";
    state.errors = {};
    state.drafts.post = {};
    state.notice = data.workMode === "task" ? "taskSubmittedForReview" : "jobSubmittedForReview";
    await refreshData();
    render();
  } catch (error) {
    state.notice = error.message;
    render();
  }
});

async function init() {
  try {
    await refreshData();
  } catch (error) {
    state.notice = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

init();
