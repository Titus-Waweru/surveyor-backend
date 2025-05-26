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
    from: `"Surveyor On Demand" <${process.env.EMAIL_USERNAME}>`,
    to: toEmail,
    subject: "Your OTP for Signup",
    text: `Your OTP is: ${otp}. It will expire in 3 minutes Please Enter to Verify.`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOTP };
