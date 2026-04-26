import { normalizeLocale } from "./i18n.js";
import { BRAND_NAME, BRAND_NAME_EN } from "./brand.js";

export function outreachMessage(lead, locale = "zh") {
  const normalized = normalizeLocale(locale);
  const name = String(lead.name || "your business").trim();

  if (normalized === "en") {
    return `Hi, this is ${BRAND_NAME} (${BRAND_NAME_EN}), a local part-time hiring platform for Flushing businesses. We are offering the first job post free. Is ${name} hiring part-time cashiers, servers, kitchen helpers, front desk staff, or bubble tea staff? Reply with role/pay/schedule and I can help post it free. Reply STOP to opt out.`;
  }

  return `您好，我是${BRAND_NAME}本地兼职招聘平台。我们现在给法拉盛商家免费发布第一个兼职岗位。请问 ${name} 最近需要收银、服务员、帮厨、前台或奶茶店员吗？如果需要，回复岗位/时薪/时间，我可以免费帮您发布。若不方便，回复 STOP，我不会再联系。`;
}

export function outreachEmailSubject(locale = "zh") {
  return normalizeLocale(locale) === "en"
    ? "Free first part-time job post for your Flushing business"
    : "免费发布第一个兼职岗位";
}

export function outreachEmailBody(lead, locale = "zh") {
  const message = outreachMessage(lead, locale);
  const signature = normalizeLocale(locale) === "en"
    ? `\n\nThank you,\n${BRAND_NAME}`
    : `\n\n谢谢，\n${BRAND_NAME}`;

  return `${message}${signature}`;
}

export function buildSmsHref(lead, locale = "zh") {
  const phone = String(lead.phone || "").trim();
  if (!phone) return "";

  return `sms:${encodeURIComponent(phone)}?&body=${encodeURIComponent(outreachMessage(lead, locale))}`;
}

export function buildDraftCopyText(lead, channel, locale = "zh") {
  if (channel === "email") {
    const draft = emailDraftFields(lead, locale);
    return [
      `To: ${draft.to}`,
      `Subject: ${draft.subject}`,
      "",
      draft.body
    ].join("\n");
  }

  return [
    `To: ${String(lead.phone || "").trim()}`,
    "",
    "Message:",
    outreachMessage(lead, locale)
  ].join("\n");
}

export function emailDraftFields(lead, locale = "zh") {
  return {
    to: String(lead.email || "").trim(),
    subject: outreachEmailSubject(locale),
    body: outreachEmailBody(lead, locale)
  };
}

function composeParams(lead, locale = "zh") {
  const draft = emailDraftFields(lead, locale);
  if (!draft.to) return null;
  return draft;
}

function queryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

export function buildGmailComposeHref(lead, locale = "zh") {
  const params = composeParams(lead, locale);
  if (!params) return "";
  return `https://mail.google.com/mail/?view=cm&fs=1&${queryString({ to: params.to, su: params.subject, body: params.body })}`;
}

export function buildOutlookComposeHref(lead, locale = "zh") {
  const params = composeParams(lead, locale);
  if (!params) return "";
  return `https://outlook.live.com/mail/0/deeplink/compose?${queryString(params)}`;
}

export function buildMailtoHref(lead, locale = "zh") {
  const email = String(lead.email || "").trim();
  if (!email) return "";

  const subject = outreachEmailSubject(locale);
  const body = outreachEmailBody(lead, locale);
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
