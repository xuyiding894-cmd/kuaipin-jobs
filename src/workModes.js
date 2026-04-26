export const workModes = ["job", "task"];
export const workModeFilters = ["job", "task", "campusTask"];
export const taskSources = ["employer", "campus"];
export const taskTypes = ["home", "campus", "local", "ai", "content", "ops"];
export const difficulties = ["easy", "standard", "skilled"];
export const settlements = ["daily", "nextDay", "weekly", "afterDone"];

export function normalizeWorkMode(value) {
  return value === "task" ? "task" : "job";
}

export function normalizeTaskSource(value) {
  return value === "campus" ? "campus" : "employer";
}

export function isLightTask(job) {
  return normalizeWorkMode(job?.workMode) === "task";
}

export function matchesWorkModeFilter(job, filter) {
  if (!filter) return true;
  if (filter === "campusTask") return isLightTask(job) && normalizeTaskSource(job?.taskSource) === "campus";
  return normalizeWorkMode(job?.workMode) === filter;
}
