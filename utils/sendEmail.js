const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendEmail({ to, subject, text, html }) {
  await transporter.sendMail({
    from: `"LandLink" <${process.env.EMAIL_USERNAME}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = sendEmail;
