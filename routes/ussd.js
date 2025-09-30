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
  try {
    // Ensure body exists and fields have defaults
    const body = req.body || {};
    const text = body.text || "";
    const phoneNumber = body.phoneNumber || "";

    if (!phoneNumber) {
      return res.status(400).send("Bad Request: Missing phoneNumber");
    }

    let response = "";

    // ----------------- MAIN MENU -----------------
    if (text === "") {
      response = `CON Welcome to LandLink Surveyor Hub
1. Book a Survey
2. Check Survey Status
3. Beacon Placement Requests
4. Payments
5. Contact Support`;
    }

    // ----------------- BOOK A SURVEY -----------------
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

    // ----------------- CHECK SURVEY STATUS -----------------
    else if (text === "2") {
      response = `END Your latest survey status: In Progress`;
    }

    // ----------------- BEACON REQUESTS -----------------
    else if (text === "3") {
      response = `END You have 2 beacon placement requests pending.`;
    }

    // ----------------- PAYMENTS -----------------
    else if (text === "4") {
      response = `END Total payments received: KSh 45,000`;
    }

    // ----------------- CONTACT SUPPORT -----------------
    else if (text === "5") {
      response = `END Contact us at 0712345678 or email support@landlink.co.ke`;
    }

    // ----------------- INVALID OPTION -----------------
    else {
      response = `END Invalid option. Please try again.`;
    }

    // Send response as plain text
    res.set("Content-Type", "text/plain");
    res.send(response);
  } catch (err) {
    console.error("USSD route error:", err);
    res.status(500).send("Internal Server Error");
  }
});

// ✅ Export using CommonJS
module.exports = router;
