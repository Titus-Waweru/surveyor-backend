const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

const client = twilio(accountSid, authToken);

async function sendOTPviaSMS(phoneNumber, otp) {
  return client.messages.create({
    to: phoneNumber,
    messagingServiceSid,
    body: `Your Surveyor OTP is: ${otp}. It will expire in 10 minutes.`,
  });
}

module.exports = { sendOTPviaSMS };
