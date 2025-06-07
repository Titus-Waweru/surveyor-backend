const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const CLIENT_URL = process.env.CLIENT_URL;

// Request password reset
router.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a password reset link has been sent.",
      });
    }

    const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "10m" });
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    const resetLink = `${CLIENT_URL}/reset-password?token=${resetToken}`;
    console.log(`🔗 Reset link (DEV ONLY): ${resetLink}`);

    // TODO: Send resetLink via email using Nodemailer, Resend, etc.

    return res.json({
      message: "Reset link sent. Please check your email.",
    });
  } catch (err) {
    console.error("Password reset request error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// Perform password reset
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    return res.status(400).json({ message: "Missing token or password." });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    if (
      !user ||
      user.resetToken !== token ||
      !user.resetTokenExpiry ||
      user.resetTokenExpiry < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired reset token." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: decoded.email },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return res.json({ message: "✅ Password reset successful." });
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(400).json({ message: "Invalid or expired token." });
  }
});

module.exports = router;
