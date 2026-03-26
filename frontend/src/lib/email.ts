import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@example.com";
const APP_NAME = "MultiTenancy Shop";

export async function sendVerificationEmail(email: string, url: string) {
  // Always log to server console so devs can verify without needing email
  console.log(`\n━━━━━ EMAIL VERIFICATION ━━━━━`);
  console.log(`To: ${email}`);
  console.log(`URL: ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM}>`,
    to: email,
    subject: `Verify your ${APP_NAME} account`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#111">Verify your email</h2>
        <p>Thanks for signing up! Click the button below to verify your email address.</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0f172a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Verify my email
        </a>
        <p style="color:#666;font-size:13px">Or copy this link: <br/><a href="${url}">${url}</a></p>
        <p style="color:#999;font-size:12px">This link expires in 1 hour. If you didn't sign up, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, url: string) {
  // Always log to server console so devs can use the link without needing email
  console.log(`\n━━━━━ PASSWORD RESET ━━━━━`);
  console.log(`To: ${email}`);
  console.log(`URL: ${url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return;
  }

  await transporter.sendMail({
    from: `"${APP_NAME}" <${FROM}>`,
    to: email,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#111">Reset your password</h2>
        <p>We received a request to reset your password. Click the button below to choose a new one.</p>
        <a href="${url}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#0f172a;color:#fff;border-radius:6px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#666;font-size:13px">Or copy this link: <br/><a href="${url}">${url}</a></p>
        <p style="color:#999;font-size:12px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}
