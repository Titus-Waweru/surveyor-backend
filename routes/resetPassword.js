const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;

// Request password reset
router.post("/request-password-reset", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(200).json({
        message: "If that email exists, a password reset link has been sent.",
      }); // generic for security
    }

    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "10m" });
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    // You should send an actual email here (use your mailer utility)
    console.log(`🔗 Reset link (DEV ONLY): ${resetLink}`);

    // Example: await sendResetEmail(email, resetLink);

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
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: decoded.email },
      data: { password: hashedPassword },
    });

    return res.json({ message: "✅ Password reset successful." });
  } catch (err) {
    console.error("Reset error:", err);
    return res.status(400).json({ message: "Invalid or expired token." });
  }
});

module.exports = router;
