const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Replace this with a verified sender domain if possible
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendOTP(toEmail, otp) {
  const mailOptions = {
    from: `"LandLink Ltd" <${process.env.EMAIL_USERNAME}>`,
    to: toEmail,
    subject: "Your OTP Code to Verify Your Email",
    text: `
Hi there,

Your One-Time Password (OTP) for LandLink is: ${otp}

Please enter this code within 3 minutes to verify your email address.

If you didn't request this, you can safely ignore this email.

Thanks,  
LandLink Ltd
    `.trim(),

    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fff6e5;">
        <h2 style="color:rgb(203, 120, 25);">Verify Your Email - LandLink Ltd</h2>
        <p style="font-size: 15px; color: #333;">
          Hello,
        </p>
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
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTP };
