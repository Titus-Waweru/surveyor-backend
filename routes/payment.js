const express = require("express");
const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// PAYSTACK INITIATION
router.post("/initiate", async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) return res.status(400).json({ error: "Missing email or amount" });

  try {
    const paystackRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: Math.floor(amount * 100), // Paystack expects amount in kobo
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = paystackRes.data?.data;
    if (paymentData) {
      await prisma.payment.create({
        data: {
          email,
          amount: paymentData.amount,
          method: "paystack",
          status: "pending",
          reference: paymentData.reference,
        },
      });
      res.json({ url: paymentData.authorization_url });
    } else {
      res.status(500).json({ error: "Unable to initiate payment" });
    }
  } catch (err) {
    console.error("Paystack error:", err.response?.data || err.message);
    res.status(500).json({ error: "Paystack error. Try again." });
  }
});

// MPESA INITIATION
router.post("/mpesa", async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) return res.status(400).json({ error: "Phone and amount are required" });

  try {
    // STEP 1: Get access token
    const auth = Buffer.from(
      `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const tokenRes = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // STEP 2: STK Push request
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);

    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    const stkRes = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        BusinessShortCode: process.env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phone,
        PartyB: process.env.MPESA_SHORTCODE,
        PhoneNumber: phone,
        CallBackURL: `${process.env.BASE_URL}/api/payments/mpesa/callback`,
        AccountReference: "LandLink",
        TransactionDesc: "LandLink Payment",
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const checkoutRequestID = stkRes.data.CheckoutRequestID;

    await prisma.payment.create({
      data: {
        email: phone, // For M-Pesa, use phone as identifier
        amount,
        method: "mpesa",
        status: "pending",
        reference: checkoutRequestID,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("M-Pesa error:", err.response?.data || err.message);
    res.status(500).json({ error: "M-Pesa request failed" });
  }
});

// MPESA CALLBACK
router.post("/mpesa/callback", async (req, res) => {
  const body = req.body;

  const stkCallback = body?.Body?.stkCallback;
  if (!stkCallback) return res.sendStatus(400);

  const { CheckoutRequestID, ResultCode } = stkCallback;

  try {
    await prisma.payment.updateMany({
      where: {
        reference: CheckoutRequestID,
      },
      data: {
        status: ResultCode === 0 ? "success" : "failed",
      },
    });

    res.status(200).json({ message: "Callback processed" });
  } catch (err) {
    console.error("Callback handling error:", err.message);
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

// GET PAYMENTS
router.get("/", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Missing email" });

  try {
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { email },
          { email: { equals: email, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ payments });
  } catch (err) {
    console.error("Fetch payments error:", err.message);
    res.status(500).json({ error: "Could not fetch payments" });
  }
});

module.exports = router;
