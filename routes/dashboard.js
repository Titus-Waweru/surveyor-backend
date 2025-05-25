const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Setup Multer for profile image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });


// ======================= BOOKINGS =======================

// Create a new booking
router.post("/bookings", async (req, res) => {
  const { location, surveyType, description, preferredDate, email } = req.body;

  if (!email || !location || !surveyType || !description || !preferredDate) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const newBooking = await prisma.booking.create({
      data: {
        location,
        surveyType,
        description,
        preferredDate: new Date(preferredDate),
        status: "Pending",
        user: { connect: { id: user.id } },
      },
    });

    res.status(201).json(newBooking);
  } catch (err) {
    console.error("Booking creation error:", err);
    res.status(500).json({ message: "Failed to create booking." });
  }
});

// Get bookings for a specific user by email
router.get("/bookings", async (req, res) => {
  const { userEmail } = req.query;

  if (!userEmail) {
    return res.status(400).json({ message: "Missing userEmail query param." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(bookings);
  } catch (err) {
    console.error("Booking fetch error:", err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});


// ======================= PROFILE =======================

// Get client profile
router.get("/profile", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email required." });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        profileImageUrl: true,
        phoneNumber: true,
        notificationsEnabled: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json(user);
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update client profile (name, phone, profile image)
router.put("/profile", upload.single("profileImage"), async (req, res) => {
  const { email, name, phoneNumber } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const updateData = {
      name,
      phoneNumber,
    };

    if (req.file) {
      updateData.profileImageUrl = `/uploads/${req.file.filename}`;
    }

    const updated = await prisma.user.update({
      where: { email },
      data: updateData,
    });

    res.json({ message: "Profile updated", user: updated });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Server error during update." });
  }
});

// Toggle notifications (safe and working)
router.put("/profile/toggle-notifications", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    const updated = await prisma.user.update({
      where: { email },
      data: {
        notificationsEnabled: !user.notificationsEnabled,
      },
    });

    res.json({ message: "Notifications updated", user: updated });
  } catch (err) {
    console.error("Toggle notifications error:", err);
    res.status(500).json({ message: "Failed to toggle notifications." });
  }
});

// Change password
router.put("/profile/change-password", async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ message: "Email and new password required" });
  }

  try {
    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    });

    res.json({ message: "Password updated" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
});

module.exports = router;
