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
      if (existing) return res.status(400).json({ message: "An account with this email already exists. Please try logging in or use a different email address." });

      if (
        (role === "surveyor" || role === "gis-expert") &&
        (!idCardFile || !certFile || !iskNumber?.trim())
      ) {
        return res.status(400).json({
          message: `To register as a ${role === "surveyor" ? "Surveyor" : "GIS Expert"}, please provide your ISK number and upload both your ID card and professional certificate.`,
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
        message: "✅ Verification code sent! Please check your email to complete your registration.",
      });
    } catch (err) {
      console.error("Signup error:", err);
      return res.status(500).json({ message: "We encountered an issue while creating your account. Please try again in a moment." });
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
    return res.status(400).json({ message: "We couldn't find your signup session. Please start the registration process again." });
  }

  const now = new Date();
  if (now > new Date(tempUser.otpExpiresAt)) {
    tempUsers.delete(email);
    return res.status(400).json({ message: "This verification code has expired. Please request a new one." });
  }

  if (tempUser.otp !== otp) {
    return res.status(400).json({ message: "The code you entered doesn't match. Please check and try again." });
  }

  try {
    const { otp, otpExpiresAt, ...userData } = tempUser;

    if (userData.role === "surveyor" || userData.role === "gis-expert") {
      // Save the user now with status "pending"
      const newUser = await prisma.user.create({ data: userData });
      tempUsers.delete(email);

      return res.status(201).json({
        message: "✅ Account created successfully! Your application is now under review. We'll notify you once approved.",
        role: newUser.role,
        status: newUser.status,
      });
    }

    // For other roles, save immediately and approve
    const newUser = await prisma.user.create({ data: userData });
    tempUsers.delete(email);

    return res.status(201).json({
      message: "✅ Welcome aboard! Your account has been successfully created.",
      role: newUser.role,
      status: newUser.status,
    });
  } catch (err) {
    console.error("OTP verification error:", err);
    return res.status(500).json({ message: "We're having trouble verifying your code right now. Please try again shortly." });
  }
});

/**
 * RESEND OTP
 */
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  const tempUser = tempUsers.get(email);

  if (!tempUser) {
    return res.status(400).json({ message: "We couldn't find your signup session. Please start the registration process again." });
  }

  try {
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 3 * 60 * 1000);

    tempUser.otp = newOtp;
    tempUser.otpExpiresAt = otpExpiresAt;
    tempUsers.set(email, tempUser);

    await sendOTP(email, newOtp);
    return res.status(200).json({ message: "A new verification code has been sent to your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    return res.status(500).json({ message: "We're unable to send a new code right now. Please try again in a few minutes." });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Please enter both your email and password to continue." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return res.status(400).json({ message: "The email or password you entered is incorrect. Please check and try again." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "The email or password you entered is incorrect. Please check and try again." });
    }

    if ((user.role === "surveyor" || user.role === "gis-expert") && user.status !== "approved") {
      return res.status(403).json({
        message: `Thank you for your patience! Your ${user.role === "surveyor" ? "Surveyor" : "GIS Expert"} application is still under review. We'll notify you as soon as it's approved.`,
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("❌ JWT_SECRET is not defined.");
      return res.status(500).json({ message: "We're experiencing technical difficulties. Please try again later." });
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
    return res.status(500).json({ message: "We're having trouble signing you in right now. Please try again in a moment." });
  }
});

/**
 * LOGOUT
 */
router.post("/logout", (req, res) => {
  return res.status(200).json({ message: "You've been successfully logged out. See you next time!" });
});

/**
 * REQUEST PASSWORD RESET
 * Generates a reset token, stores in DB, emails user a link
 */
router.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please enter your email address so we can send you reset instructions." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // To prevent email enumeration, respond with success anyway
      return res.status(200).json({ message: "If an account with that email exists, you'll receive password reset instructions shortly." });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Save token & expiry in DB for the user
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email with token (link)
    await sendPasswordResetEmail(email, resetToken);

    return res.status(200).json({ message: "If an account with that email exists, you'll receive password reset instructions shortly." });
  } catch (err) {
    console.error("Request password reset error:", err);
    return res.status(500).json({ message: "We're unable to process your password reset request right now. Please try again later." });
  }
});

/**
 * RESET PASSWORD
 * Verify token & expiry, update password
 */
router.post("/reset-password", async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ message: "Please provide all required information to reset your password." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (
      !user ||
      !user.resetToken ||
      user.resetToken !== token ||
      !user.resetTokenExpiry ||
      new Date() > new Date(user.resetTokenExpiry)
    ) {
      return res.status(400).json({ message: "This password reset link is invalid or has expired. Please request a new one." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token & expiry
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.status(200).json({ message: "Your password has been successfully reset! You can now log in with your new password." });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "We're having trouble resetting your password right now. Please try again later." });
  }
});

module.exports = router;