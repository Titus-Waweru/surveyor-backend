const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendOTP(toEmail, otp) {
  const mailOptions = {
    from: `"LandLink Ltd" <${process.env.EMAIL_USERNAME}>`,
    to: toEmail,
    subject: "🔐 Your One-Time Password (OTP) for LandLink Signup",
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fdfaf4; padding: 20px; border-radius: 8px; color: #333;">
        <h2 style="color: #d97706;">Welcome to LandLink Ltd 👋</h2>
        <p>Thank you for signing up with <strong>LandLink</strong> — your trusted platform for land surveying and real estate management.</p>
        
        <p style="font-size: 16px; margin-top: 20px;">
          <strong>Your OTP code is:</strong>
        </p>
        
        <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background-color: #fff8e5; color: #d97706; padding: 12px 20px; border-radius: 6px; display: inline-block; margin: 10px 0;">
          ${otp}
        </div>

        <p style="margin-top: 20px;">
          Please enter this code on the verification page to complete your signup. This OTP is valid for <strong>3 minutes</strong> only. 
          Do not share this code with anyone.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 13px; color: #888;">
          This email was sent by LandLink Ltd. If you did not request this, please ignore this message.
        </p>
        <p style="font-size: 13px; color: #888;">
          © ${new Date().getFullYear()} LandLink Ltd. All rights reserved.
        </p>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTP };
