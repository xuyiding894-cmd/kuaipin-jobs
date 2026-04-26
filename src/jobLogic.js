import {
  difficulties,
  matchesWorkModeFilter,
  normalizeTaskSource,
  normalizeWorkMode,
  settlements,
  taskTypes
} from "./workModes.js";

const normalize = (value) => String(value || "").trim();
const lower = (value) => normalize(value).toLowerCase();
const isChecked = (value) => value === true || value === "true" || value === "on";

export function filterJobs(jobs, filters = {}) {
  const keyword = lower(filters.keyword);
  const location = lower(filters.location);
  const category = normalize(filters.category);
  const schedule = normalize(filters.schedule);
  const minPay = Number(filters.minPay || 0);
  const workMode = normalize(filters.workMode);

  return jobs.filter((job) => {
    const haystack = [job.title, job.employer, job.description, job.location, ...(job.tags || [])]
      .join(" ")
      .toLowerCase();

    const matchesKeyword = !keyword || haystack.includes(keyword);
    const matchesLocation = !location || lower(job.location).includes(location) || (location === "remote" && job.remote);
    const matchesCategory = !category || job.category === category;
    const matchesSchedule = !schedule || job.schedule === schedule;
    const matchesPay = !minPay || Number(job.pay) >= minPay;
    const matchesWorkMode = matchesWorkModeFilter(job, workMode);

    return matchesKeyword && matchesLocation && matchesCategory && matchesSchedule && matchesPay && matchesWorkMode;
  });
}

export function validateApplication(form) {
  const errors = {};
  if (!normalize(form.name)) errors.name = "Name is required.";
  if (!normalize(form.contact)) errors.contact = "Phone or email is required.";
  if (!normalize(form.availability)) errors.availability = "Availability is required.";
  return errors;
}

export function createApplication(jobId, form) {
  return {
    jobId,
    applicantName: normalize(form.name),
    contact: normalize(form.contact),
    availability: normalize(form.availability),
    message: normalize(form.message),
    submittedAt: new Date().toISOString()
  };
}

export function validatePosting(form) {
  const errors = {};
  if (!normalize(form.title)) errors.title = "Job title is required.";
  if (!normalize(form.employer)) errors.employer = "Employer name is required.";
  if (!normalize(form.pay)) {
    errors.pay = "Pay is required.";
  } else if (Number(form.pay) <= 0 || Number.isNaN(Number(form.pay))) {
    errors.pay = "Pay must be greater than 0.";
  }
  if (!normalize(form.location)) errors.location = "Location is required.";
  if (!normalize(form.schedule)) errors.schedule = "Schedule is required.";
  if (!normalize(form.description)) errors.description = "Description is required.";

  if (normalizeWorkMode(form.workMode) === "task") {
    if (!taskTypes.includes(normalize(form.taskType))) errors.taskType = "Task type is required.";
    if (!normalize(form.estimatedTime)) errors.estimatedTime = "Estimated time is required.";
    if (!settlements.includes(normalize(form.settlement))) errors.settlement = "Settlement is required.";
    if (normalizeTaskSource(form.taskSource) === "campus" && !normalize(form.campusName)) {
      errors.campusName = "Campus name is required.";
    }
  }

  return errors;
}

export function createJobFromPosting(form) {
  const location = normalize(form.location);
  const remote = lower(location) === "remote";
  const workMode = normalizeWorkMode(form.workMode);
  const taskSource = normalizeTaskSource(form.taskSource);
  const taskType = normalize(form.taskType);
  const difficulty = normalize(form.difficulty);
  const settlement = normalize(form.settlement);
  const tags = [
    normalize(form.category),
    remote ? "remote" : "local",
    workMode === "task" ? "task" : "",
    workMode === "task" && taskSource === "campus" ? "campus-task" : ""
  ].filter(Boolean);

  return {
    id: `posted-${Date.now()}`,
    workMode,
    taskSource,
    title: normalize(form.title),
    employer: normalize(form.employer),
    category: normalize(form.category) || "Local",
    taskType: taskTypes.includes(taskType) ? taskType : "",
    campusName: normalize(form.campusName),
    targetAudience: normalize(form.targetAudience),
    pay: Number(form.pay),
    payType: workMode === "task" ? "task" : normalize(form.payType) || "hour",
    estimatedTime: normalize(form.estimatedTime),
    settlement: settlements.includes(settlement) ? settlement : "",
    difficulty: difficulties.includes(difficulty) ? difficulty : "",
    remoteFriendly: isChecked(form.remoteFriendly),
    location,
    remote,
    schedule: normalize(form.schedule),
    description: normalize(form.description),
    requirements: ["Clear communication", "Reliable availability"],
    verifiedEmployer: false,
    postedAt: new Date().toISOString().slice(0, 10),
    tags,
    contact: normalize(form.contact)
  };
}
