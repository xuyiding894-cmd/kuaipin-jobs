const codeSafePattern = /[^A-Z0-9]/g;
const multiLevelPattern = /下线|拉人头|团队返利|多级|裂变返佣|multi-level|downline/i;
const highIncomePattern = /躺赚|高收益|稳赚|日入|月入过万|guaranteed income|high income|easy money/i;
const joiningFeePattern = /入会费|保证金|培训费|材料费|先交钱|joining fee|upfront payment|deposit/i;

export const referralEventTypes = ["registration", "application", "employerLead", "approvedPost"];

export const rewardRules = {
  registration: { points: 1, benefit: "profile-boost" },
  application: { points: 3, benefit: "light-task-priority" },
  employerLead: { points: 10, benefit: "partner-badge" },
  approvedPost: { points: 20, benefit: "featured-credit" }
};

export function normalizeReferralCode(value) {
  return String(value || "").toUpperCase().replace(codeSafePattern, "").slice(0, 12);
}

export function createReferralCode(seed = "KP", existing = new Set()) {
  const prefix = normalizeReferralCode(seed).slice(0, 3) || "KP";
  for (let index = 0; index < 100; index += 1) {
    const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(2, 7);
    const code = normalizeReferralCode(`${prefix}${suffix}`).slice(0, 10);
    if (code.length >= 6 && !existing.has(code)) return code;
  }
  return `KP${Date.now().toString(36).toUpperCase()}`.slice(0, 10);
}

export function rewardForEvent(type) {
  return rewardRules[type] ? { ...rewardRules[type] } : { points: 0, benefit: "manual-review" };
}

export function buildInviteText({ referralCode, locale = "zh" }) {
  const code = normalizeReferralCode(referralCode);
  if (locale === "en") {
    return `I am using KuaiPin Jobs to find verified part-time jobs and light tasks. Use invite code ${code} when you join.`;
  }
  return `我在快聘兼职看靠谱兼职和轻任务，注册或申请时填写邀请码 ${code}，可以优先看到适合学生和居家可做的任务。`;
}

export function growthRiskReasons(text) {
  const value = String(text || "");
  const reasons = [];
  if (multiLevelPattern.test(value)) reasons.push("Contains multi-level or downline language.");
  if (highIncomePattern.test(value)) reasons.push("Contains guaranteed or high-income claims.");
  if (joiningFeePattern.test(value)) reasons.push("Contains joining-fee or upfront-payment language.");
  return reasons;
}
