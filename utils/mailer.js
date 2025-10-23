import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

console.log("🔧 mailer.js: Loading Resend...");
console.log("🔑 mailer.js: RESEND_API_KEY exists?", !!process.env.RESEND_API_KEY);
console.log("🔑 mailer.js: API Key first 10 chars:", process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + "..." : "MISSING");

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ OTP Email
export async function sendOTP(toEmail, otp) {
  try {
    console.log("📧 sendOTP: Starting email send to:", toEmail);
    console.log("📧 sendOTP: OTP code:", otp);
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fff6e5;">
        <h2 style="color:rgb(203, 120, 25);">Verify Your Email - LandLink Ltd</h2>
        <p style="font-size: 15px; color: #333;">Hello,</p>
        <p style="font-size: 15px; color: #333;">
          Thank you for signing up with <strong>LandLink Ltd</strong>! Your One-Time Password (OTP) is:
        </p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #111; margin: 20px 0;">${otp}</p>
        <p style="font-size: 15px; color: #333;">
          Please enter this code in the app within <strong>3 minutes</strong> to verify your email address.
        </p>
        <hr style="margin: 20px 0;" />
        <p style="font-size: 13px; color: #666;">
          If you didn't request this OTP, no action is required. You can safely ignore this message.
        </p>
        <p style="font-size: 13px; color: #666; margin-top: 30px;">
          — The LandLink Team
        </p>
        <div style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">
          LandLink Ltd, Nairobi, Kenya<br/>
          <a href="mailto:support@landlink.co.ke" style="color: #999;">support@landlink.co.ke</a> | landlink.co.ke
        </div>
      </div>
    `;

    console.log("📧 sendOTP: Calling Resend API...");
    
    const result = await resend.emails.send({
      from: "LandLink <onboarding@resend.dev>",
      to: toEmail,
      subject: "Your OTP Code to Verify Your Email",
      html,
    });

    console.log("✅ sendOTP: Email sent successfully to:", toEmail);
    console.log("✅ sendOTP: Resend response:", result);
    return result;

  } catch (error) {
    console.error("❌ sendOTP: FAILED to send email to:", toEmail);
    console.error("❌ sendOTP: Error name:", error.name);
    console.error("❌ sendOTP: Error message:", error.message);
    console.error("❌ sendOTP: Error code:", error.code);
    console.error("❌ sendOTP: Full error:", error);
    throw error; // Re-throw to see in auth.js
  }
}

// ✅ Password Reset Email
export async function sendPasswordResetEmail(toEmail, token) {
  try {
    console.log("📧 sendPasswordResetEmail: Starting password reset email to:", toEmail);
    
    const resetLink = `https://landlink.co.ke/reset-password?email=${encodeURIComponent(
      toEmail
    )}&token=${encodeURIComponent(token)}`;

    console.log("📧 sendPasswordResetEmail: Reset link:", resetLink);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fff6e5;">
        <h2 style="color:rgb(203, 120, 25);">Reset Your Password - LandLink</h2>
        <p style="font-size: 15px; color: #333;">Hi,</p>
        <p style="font-size: 15px; color: #333;">
          We received a request to reset your password. Click the button below to set a new password:
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: rgb(203, 120, 25); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">Reset Password</a>
        </p>
        <p style="font-size: 14px; color: #555;">
          This link will expire in <strong>15 minutes</strong>. If you didn't request a password reset, just ignore this email.
        </p>
        <hr style="margin: 20px 0;" />
        <p style="font-size: 13px; color: #666; margin-top: 30px;">
          — The LandLink Team
        </p>
        <div style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">
          LandLink Ltd, Nairobi, Kenya<br/>
          <a href="mailto:support@landlink.co.ke" style="color: #999;">support@landlink.co.ke</a> | landlink.co.ke
        </div>
      </div>
    `;

    console.log("📧 sendPasswordResetEmail: Calling Resend API...");
    
    const result = await resend.emails.send({
      from: "LandLink <onboarding@resend.dev>",
      to: toEmail,
      subject: "Reset Your Password - LandLink",
      html,
    });

    console.log("✅ sendPasswordResetEmail: Password reset email sent successfully to:", toEmail);
    console.log("✅ sendPasswordResetEmail: Resend response:", result);
    return result;

  } catch (error) {
    console.error("❌ sendPasswordResetEmail: FAILED to send password reset email to:", toEmail);
    console.error("❌ sendPasswordResetEmail: Error name:", error.name);
    console.error("❌ sendPasswordResetEmail: Error message:", error.message);
    console.error("❌ sendPasswordResetEmail: Error code:", error.code);
    console.error("❌ sendPasswordResetEmail: Full error:", error);
    throw error;
  }
}