const express = require("express");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { sendOTP, sendPasswordResetEmail } = require("../utils/mailer");
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
        (role === "surveyor" || role === "gis-expert") &&
        (!idCardFile || !certFile || !iskNumber?.trim())
      ) {
        return res.status(400).json({
          message: `${role === "surveyor" ? "Surveyors" : "GIS Experts"} must upload ID card, certificate, and ISK number.`,
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
        iskNumber: role === "surveyor" || role === "gis-expert" ? iskNumber.trim() : null,
        idCardUrl: idCardFile ? idCardFile.path : null,
        certUrl: certFile ? certFile.path : null,
        status: role === "surveyor" || role === "gis-expert" ? "pending" : "approved",
        paid: role === "surveyor" || role === "gis-expert" ? false : true,
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

    if (userData.role === "surveyor" || userData.role === "gis-expert") {
      // Not saved to DB yet — awaiting admin approval
      tempUsers.set(email, userData);
      return res.status(200).json({
        message: "✅ OTP verified. Awaiting admin approval.",
        role: userData.role,
      });
    }

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

    if ((user.role === "surveyor" || user.role === "gis-expert") && user.status !== "approved") {
      return res.status(403).json({
        message: `${user.role === "surveyor" ? "Surveyor" : "GIS Expert"} not approved yet. We’ll notify you after review.`,
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
 * REQUEST PASSWORD RESET
 * Generates a reset token, stores in DB, emails user a link
 */
router.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // To prevent email enumeration, respond with success anyway
      return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Save token & expiry in DB for the user
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpires,
      },
    });

    // Send password reset email with token (link)
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({ message: "If the email exists, a reset link has been sent." });
  } catch (err) {
    console.error("Request password reset error:", err);
    return res.status(500).json({ message: "Server error during password reset request." });
  }
});

/**
 * RESET PASSWORD
 * Verify token & expiry, update password
 */
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Email, token, and new password are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== token ||
      !user.resetTokenExpires ||
      new Date() > new Date(user.resetTokenExpires)
    ) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token & expiry
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Server error during password reset." });
  }
});

module.exports = router;
