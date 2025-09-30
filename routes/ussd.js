const express = require("express");
const router = express.Router();

/**
 * USSD Request POST Structure:
 * {
 *   sessionId: "unique-session-id",
 *   serviceCode: "*384#",
 *   phoneNumber: "+2547xxxxxxx",
 *   text: ""  // input sequence separated by "*"
 * }
 */

router.post("/", (req, res) => {
  const { text, phoneNumber } = req.body;

  let response = "";

  // Main Menu
  if (text === "") {
    response = `CON Welcome to LandLink Surveyor Hub
1. Book a Survey
2. Check Survey Status
3. Beacon Placement Requests
4. Payments
5. Contact Support`;
  }

  // 1. Book a Survey
  else if (text === "1") {
    response = `CON Choose survey type:
1. Boundary Confirmation
2. Land Plot Mapping
3. Title Deed Verification`;
  } else if (text === "1*1") {
    response = `END You selected Boundary Confirmation. Our surveyor will contact you shortly.`;
  } else if (text === "1*2") {
    response = `END You selected Land Plot Mapping. Our surveyor will contact you shortly.`;
  } else if (text === "1*3") {
    response = `END You selected Title Deed Verification. Our surveyor will contact you shortly.`;
  }

  // 2. Check Survey Status
  else if (text === "2") {
    response = `END Your latest survey status: In Progress`;
  }

  // 3. Beacon Placement Requests
  else if (text === "3") {
    response = `END You have 2 beacon placement requests pending.`;
  }

  // 4. Payments
  else if (text === "4") {
    response = `END Total payments received: KSh 45,000`;
  }

  // 5. Contact Support
  else if (text === "5") {
    response = `END Contact us at 0712345678 or email support@landlink.co.ke`;
  }

  // Invalid option handling
  else {
    response = `END Invalid option. Please try again.`;
  }

  res.set("Content-Type", "text/plain");
  res.send(response);
});

// ✅ Export using CommonJS
module.exports = router;
