import dotenv from "dotenv";

dotenv.config();

export async function sendFollowUpEmail({
  sender,
  senderName,
  replyTo,
  recipient,
  subject,
  html,
}) {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY || !sender || !recipient) {
    throw new Error("Missing Brevo email configuration");
  }

  const payload = {
    sender: { email: sender, name: senderName || "Inseller" },
    to: [{ email: recipient }],
    subject,
    htmlContent: html,
  };

  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo send failed: ${response.status} ${body}`);
  }

  return await response.json();
}
