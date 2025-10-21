import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ OTP Email
export async function sendOTP(toEmail, otp) {
  try {
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
          If you didn’t request this OTP, no action is required. You can safely ignore this message.
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

    await resend.emails.send({
      from: "LandLink <onboarding@resend.dev>",
      to: toEmail,
      subject: "Your OTP Code to Verify Your Email",
      html,
    });

    console.log("✅ OTP email sent to:", toEmail);
  } catch (error) {
    console.error("❌ Failed to send OTP email:", error);
  }
}

// ✅ Password Reset Email
export async function sendPasswordResetEmail(toEmail, token) {
  try {
    const resetLink = `https://landlink.co.ke/reset-password?email=${encodeURIComponent(
      toEmail
    )}&token=${encodeURIComponent(token)}`;

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

    await resend.emails.send({
      from: "LandLink <onboarding@resend.dev>",
      to: toEmail,
      subject: "Reset Your Password - LandLink",
      html,
    });

    console.log("✅ Password reset email sent to:", toEmail);
  } catch (error) {
    console.error("❌ Failed to send password reset email:", error);
  }
}
