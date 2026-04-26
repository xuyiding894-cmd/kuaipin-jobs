const depositPattern = /押金|保证金|培训费|手续费|先交钱|交费|deposit|fee|upfront/i;
const sensitivePattern = /验证码|银行卡密码|身份证照片|护照照片|password|verification code|bank password|id photo/i;
const offPlatformPattern = /转账|私聊转款|crypto|usdt|telegram|whatsapp.*transfer|wire transfer/i;
const suspiciousLinkPattern = /https?:\/\/|bit\.ly|t\.me\//i;
const taskBrushingPattern = /刷单|刷量|好评返现|垫付|返利|代收款|代转账|order brushing|fake review|rebate/i;
const greyWorkPattern = /博彩|贷款引流|色情|擦边|灰产|网赌|casino|loan lead|adult entertainment|adult content|nsfw|explicit service/i;
const campusImpersonationPattern = /企业招聘代理|代招|私下转账|冒充企业|company hiring agent|off-platform hiring/i;

function textOf(job) {
  return [job.title, job.employer, job.location, job.schedule, job.description, job.contact].filter(Boolean).join(" ");
}

function numberPay(job) {
  const pay = Number(job.pay);
  return Number.isFinite(pay) ? pay : 0;
}

export function auditJob(job) {
  const text = textOf(job);
  const reasons = [];
  let score = 0;

  if (depositPattern.test(text)) {
    score += 45;
    reasons.push("Contains deposit, fee, or upfront-payment language.");
  }

  if (sensitivePattern.test(text)) {
    score += 45;
    reasons.push("Requests sensitive information such as verification codes, bank passwords, or ID photos.");
  }

  if (offPlatformPattern.test(text)) {
    score += 30;
    reasons.push("Mentions off-platform transfer or suspicious payment channels.");
  }

  if (suspiciousLinkPattern.test(text)) {
    score += 20;
    reasons.push("Contains an external or shortened link that needs review.");
  }

  if (taskBrushingPattern.test(text)) {
    score += 50;
    reasons.push("Contains brushing, rebate, advance-payment, or proxy-transfer language.");
  }

  if (greyWorkPattern.test(text)) {
    score += 50;
    reasons.push("Mentions adult, gambling, loan-lead, or grey-market work.");
  }

  if (job.taskSource === "campus" && campusImpersonationPattern.test(text)) {
    score += 45;
    reasons.push("campus task may be pretending to be company hiring or moving payment off platform.");
  }

  if (job.workMode !== "task" && job.payType !== "task" && numberPay(job) > 120) {
    score += 25;
    reasons.push("Unusually high pay for a part-time hourly job.");
  }

  if (job.workMode === "task" && numberPay(job) > 300) {
    score += 25;
    reasons.push("Unusually high pay for a small light task.");
  }

  if (!String(job.employer || "").trim()) {
    score += 10;
    reasons.push("Missing employer name.");
  }

  if (!String(job.location || "").trim()) {
    score += 10;
    reasons.push("Missing work location.");
  }

  if (!String(job.schedule || "").trim()) {
    score += 10;
    reasons.push("Missing work schedule.");
  }

  if (String(job.description || "").trim().length < 24) {
    score += 10;
    reasons.push("Description is too short to verify the work.");
  }

  const level = score >= 70 ? "high" : score >= 25 ? "medium" : "low";
  const recommendation = level === "high" ? "reject" : level === "medium" ? "review" : "approve";

  return {
    level,
    score,
    reasons,
    recommendation
  };
}
