import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

/**
 * Notification emails via Resend (free tier: 3,000/month).
 * Silent no-op in dev when RESEND_API_KEY is unset.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!resend) {
    console.info(`[email:skipped] "${opts.subject}" → ${opts.to}`);
    return false;
  }
  try {
    const from = process.env.EMAIL_FROM ?? "HackMate <onboarding@resend.dev>";
    await resend.emails.send({ from, ...opts });
    return true;
  } catch (err) {
    console.error("[email:error]", err);
    return false;
  }
}

function shell(title: string, body: string, cta?: { label: string; url: string }) {
  const appUrl = process.env.AUTH_URL ?? "http://localhost:3000";
  const button = cta
    ? `<a href="${appUrl}${cta.url}" style="display:inline-block;margin-top:16px;background:#059669;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${cta.label}</a>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px">
    <div style="font-size:20px;font-weight:700;color:#059669;margin-bottom:12px">⚡ HackMate</div>
    <h2 style="font-size:18px;margin:0 0 8px">${title}</h2>
    <p style="font-size:14px;line-height:1.6;color:#374151">${body}</p>
    ${button}
  </div>`;
}

export const emailTemplates = {
  invite: (teamName: string, hackathonName: string, inviter: string) => ({
    subject: `${inviter} invited you to join "${teamName}"`,
    html: shell(
      `You're invited to ${teamName}`,
      `${inviter} thinks you'd be a great fit for their team "${teamName}" at ${hackathonName}.`,
      { label: "Review invite", url: "/notifications" },
    ),
  }),
  joinRequest: (userName: string, teamName: string) => ({
    subject: `${userName} wants to join ${teamName}`,
    html: shell(
      `New join request`,
      `${userName} sent a request to join "${teamName}" with a short message.`,
      { label: "Review request", url: "/notifications" },
    ),
  }),
  accepted: (teamName: string) => ({
    subject: `You're in! Welcome to ${teamName}`,
    html: shell(
      `Request accepted 🎉`,
      `Your request to join "${teamName}" was accepted. Head to your team workspace to meet everyone.`,
      { label: "Open team", url: "/my-team" },
    ),
  }),
  deadline: (hackathonName: string, when: string) => ({
    subject: `Deadline reminder: ${hackathonName}`,
    html: shell(
      `${hackathonName} submission is due ${when}`,
      `Your team still has unchecked items on the submission checklist.`,
      { label: "Open checklist", url: "/my-team" },
    ),
  }),
};
