const express = require('express');
const axios = require('axios');
const moment = require('moment');
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ✅ Ensure environment variables are loaded
require('dotenv').config();

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const {
  DARAJA_CONSUMER_KEY,
  DARAJA_CONSUMER_SECRET,
  DARAJA_SHORTCODE,
  DARAJA_PASSKEY,
  DARAJA_CALLBACK_URL,
} = process.env;

// Log Paystack key status (for dev only)
if (!PAYSTACK_SECRET_KEY) {
  console.error('❌ PAYSTACK_SECRET_KEY is missing in your .env file.');
}

// ------------------ PAYSTACK ------------------
router.post('/initiate', async (req, res) => {
  const { email, amount } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: 'Email and amount are required' });
  }

  if (!PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: Paystack secret key missing' });
  }

  try {
    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100, // Convert to kobo
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Store pending payment
    await prisma.payment.create({
      data: {
        email,
        amount: amount * 100,
        method: 'paystack',
        status: 'pending',
      },
    });

    res.json({ url: response.data.data.authorization_url });
  } catch (error) {
    console.error('❌ Paystack Init Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// ------------------ DARAJA / MPESA ------------------
async function getMpesaAccessToken() {
  const auth = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
  const response = await axios.get(
    'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );
  return response.data.access_token;
}

router.post('/mpesa', async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone || !amount) {
    return res.status(400).json({ error: 'Phone and amount are required' });
  }

  try {
    const accessToken = await getMpesaAccessToken();
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64');

    const stkPushData = {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phone,
      PartyB: DARAJA_SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: DARAJA_CALLBACK_URL,
      AccountReference: 'LandLink',
      TransactionDesc: 'Payment to LandLink App',
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPushData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Store pending payment
    await prisma.payment.create({
      data: {
        phone,
        amount: amount * 100,
        method: 'mpesa',
        status: 'pending',
      },
    });

    res.json({ success: true, message: 'STK Push sent', data: response.data });
  } catch (err) {
    console.error('❌ MPESA Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to initiate M-Pesa payment' });
  }
});

// ------------------ MPESA CALLBACK HANDLER ------------------
router.post('/mpesa/callback', (req, res) => {
  console.log('📥 MPESA CALLBACK:', JSON.stringify(req.body, null, 2));
  // TODO: Optionally update payment status here
  res.sendStatus(200);
});

module.exports = router;
