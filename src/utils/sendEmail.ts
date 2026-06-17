// Using node-fetch style API call to Brevo REST API directly
// This avoids SDK version compatibility issues

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
}

const sendEmail = async ({ to, toName, subject, html }: EmailOptions): Promise<void> => {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY as string,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "TaskDuty",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const error = await response.json() as { message?: string };
    throw new Error(error.message || "Failed to send email");
  }
};

export default sendEmail;
