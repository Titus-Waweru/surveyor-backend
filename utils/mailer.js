import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

console.log("🔧 mailer.js: Loading Resend...");
console.log("🔑 mailer.js: RESEND_API_KEY exists?", !!process.env.RESEND_API_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

// ------------------------
// Utility: Common HTML wrapper
// ------------------------
function createEmailWrapper(title, bodyContent) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fff6e5;">
      <h2 style="color:rgb(203, 120, 25);">${title}</h2>
      ${bodyContent}
    </div>
  `;
}

// ------------------------
// ✅ Send OTP Email
// ------------------------
export async function sendOTP(toEmail, otp) {
  try {
    console.log("📧 sendOTP: Starting email send to:", toEmail);

    const bodyContent = `
      <p style="font-size: 15px; color: #333;">Hello,</p>
      <p style="font-size: 15px; color: #333;">
        Thank you for signing up with <strong>LandLink Ltd</strong>! Your One-Time Password (OTP) is:
      </p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #111; margin: 20px 0;">${otp}</p>
      <p style="font-size: 15px; color: #333;">
        Please enter this code in the app within <strong>3 minutes</strong> to verify your email address.
      </p>
    `;

    const html = createEmailWrapper("Verify Your Email - LandLink Ltd", bodyContent);

    const result = await resend.emails.send({
      from: "LandLink <noreply@landlink.co.ke>",
      to: toEmail,
      subject: "Your OTP Code - LandLink",
      html,
    });

    console.log("✅ sendOTP: Email sent successfully to:", toEmail);
    return result;

  } catch (error) {
    console.error("❌ sendOTP: FAILED to send email to:", toEmail);
    console.error("❌ sendOTP: Error:", error.message);

    // TEMPORARY: Keep signups working while domain verifies
    console.log("📧 TEMPORARY OTP for", toEmail, ":", otp);
    return { data: { id: "temp" }, error: null };
  }
}

// ------------------------
// ✅ Send Password Reset Email
// ------------------------
export async function sendPasswordResetEmail(toEmail, token) {
  try {
    console.log("📧 sendPasswordResetEmail: Starting password reset email to:", toEmail);

    const resetLink = `https://landlink.co.ke/reset-password?email=${encodeURIComponent(toEmail)}&token=${encodeURIComponent(token)}`;

    const bodyContent = `
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" style="background-color: rgb(203, 120, 25); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Reset Password</a>
      <p>This link expires in 15 minutes.</p>
    `;

    const html = createEmailWrapper("Reset Your Password - LandLink", bodyContent);

    const result = await resend.emails.send({
      from: "LandLink <noreply@landlink.co.ke>",
      to: toEmail,
      subject: "Reset Your Password - LandLink",
      html,
    });

    console.log("✅ sendPasswordResetEmail: Password reset email sent successfully to:", toEmail);
    return result;

  } catch (error) {
    console.error("❌ sendPasswordResetEmail: FAILED to send password reset email to:", toEmail);
    console.error("❌ sendPasswordResetEmail: Error:", error.message);
    throw error;
  }
}
