const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { sendOTP } = require("../utils/mailer");
const { storage } = require("../utils/cloudinary");

const upload = multer({ storage });
const router = express.Router();
const prisma = new PrismaClient();
const tempUsers = new Map(); // Memory store for pending signups

/**
 * SIGNUP - Store user temporarily & send OTP
 */
router.post(
  "/signup",
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "certificate", maxCount: 1 },
  ]),
  async (req, res) => {
    const { name, email, password, role, iskNumber } = req.body;
    const idCardFile = req.files?.idCard?.[0];
    const certFile = req.files?.certificate?.[0];

    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(400).json({ message: "User already exists." });

      if (
        role === "surveyor" &&
        (!idCardFile || !certFile || !iskNumber?.trim())
      ) {
        return res.status(400).json({
          message: "Surveyors must upload ID card, certificate, and ISK number.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

      const tempUserData = {
        name,
        email,
        password: hashedPassword,
        role,
        otp,
        otpExpiresAt,
        iskNumber: role === "surveyor" ? iskNumber.trim() : null,
        idCardUrl: idCardFile ? idCardFile.path : null,
        certUrl: certFile ? certFile.path : null,
        status: role === "surveyor" ? "pending" : "approved",
        paid: role === "surveyor" ? false : true,
      };

      tempUsers.set(email, tempUserData);
      await sendOTP(email, otp);

      return res.status(200).json({
        message: "✅ OTP sent to your email. Please verify to complete signup.",
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ message: "Server error during signup." });
    }
  }
);

/**
 * VERIFY OTP
 */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  const tempUser = tempUsers.get(email);

  if (!tempUser) {
    return res.status(400).json({ message: "Signup not initiated or expired." });
  }

  const now = new Date();
  if (now > new Date(tempUser.otpExpiresAt)) {
    tempUsers.delete(email);
    return res.status(400).json({ message: "OTP has expired. Please request a new one." });
  }

  if (tempUser.otp !== otp) {
    return res.status(400).json({ message: "❌ Invalid OTP." });
  }

  try {
    const { otp, otpExpiresAt, ...userData } = tempUser;

    if (userData.role === "surveyor") {
      // Surveyor not saved to DB yet — awaiting admin approval
      tempUsers.set(email, userData);
      return res.status(200).json({
        message: "✅ OTP verified. Awaiting admin approval.",
        role: userData.role,
      });
    }

    // Others are saved immediately
    const newUser = await prisma.user.create({ data: userData });
    tempUsers.delete(email);

    return res.status(201).json({
      message: "✅ OTP verified. Signup completed.",
      role: newUser.role,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ message: "Server error during verification." });
  }
});

/**
 * RESEND OTP
 */
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  const tempUser = tempUsers.get(email);

  if (!tempUser) {
    return res.status(400).json({ message: "Signup not initiated or expired." });
  }

  try {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

    tempUser.otp = newOtp;
    tempUser.otpExpiresAt = otpExpiresAt;
    tempUsers.set(email, tempUser);

    await sendOTP(email, newOtp);
    return res.status(200).json({ message: "OTP resent successfully." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ message: "Failed to resend OTP." });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    if (user.role === "surveyor" && user.status !== "approved") {
      return res.status(403).json({
        message: "Surveyor not approved yet. We’ll notify you after review.",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ JWT_SECRET is not defined.");
      return res.status(500).json({ message: "Server misconfiguration." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "30d" }
    );

    return res.json({
      token,
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login." });
  }
});

/**
 * LOGOUT
 */
router.post("/logout", (req, res) => {
  return res.status(200).json({ message: "Logged out successfully." });
});

/**
 * ADMIN: Approve surveyor
 */
router.post("/admin/approve-surveyor", async (req, res) => {
  const { email } = req.body;
  const tempUser = tempUsers.get(email);

  if (!tempUser || tempUser.role !== "surveyor") {
    return res.status(404).json({ message: "Surveyor not found or already handled." });
  }

  try {
    const newUser = await prisma.user.create({ data: tempUser });
    tempUsers.delete(email);

    return res.status(201).json({ message: "Surveyor approved and saved to DB." });
  } catch (err) {
    console.error("Approval error:", err);
    return res.status(500).json({ message: "Failed to approve surveyor." });
  }
});

/**
 * ADMIN: Reject surveyor
 */
router.post("/admin/reject-surveyor", async (req, res) => {
  const { email } = req.body;

  if (!tempUsers.has(email)) {
    return res.status(404).json({ message: "Surveyor not found or already handled." });
  }

  tempUsers.delete(email);
  return res.status(200).json({ message: "Surveyor rejected and removed from temp store." });
});

module.exports = router;
