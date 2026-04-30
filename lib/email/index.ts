import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  if (!resend) {
    console.log("[email:dev] →", { to, subject });
    console.log(html);
    return { id: "dev-" + Date.now() };
  }
  const { data, error } = await resend.emails.send({
    from: from ?? env.EMAIL_FROM,
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] failed", error);
    throw error;
  }
  return data!;
}
