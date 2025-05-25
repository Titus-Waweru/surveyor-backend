const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");

const prisma = new PrismaClient();

// ====== Admin Secret Code (ENV) ======
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || "admin2024";

// ===== Multer Setup for Profile Image Upload =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// =================== ADMIN SIGNUP ===================
router.post("/signup", async (req, res) => {
  const { name, email, password, secretCode } = req.body;

  if (!name || !email || !password || !secretCode) {
    return res.status(400).json({ message: "All fields are required." });
  }

  if (secretCode !== ADMIN_SECRET_CODE) {
    return res.status(403).json({ message: "Invalid secret admin code." });
  }

  try {
    const existingAdmin = await prisma.user.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "admin",
        status: "approved",
      },
    });

    res.status(201).json({ message: "Admin account created successfully." });
  } catch (err) {
    console.error("Admin signup error:", err);
    res.status(500).json({ message: "Failed to create admin account." });
  }
});

// =================== BOOKINGS ===================

// GET all bookings
router.get("/bookings/all", async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  } catch (err) {
    console.error("Fetch bookings error:", err);
    res.status(500).json({ message: "Failed to fetch bookings." });
  }
});

// Assign surveyor to a booking
router.patch("/bookings/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { surveyorId } = req.body;

  if (!surveyorId) {
    return res.status(400).json({ message: "Surveyor ID is required." });
  }

  try {
    const updated = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { assignedSurveyorId: parseInt(surveyorId) },
    });
    res.json(updated);
  } catch (err) {
    console.error("Assign error:", err);
    res.status(500).json({ message: "Failed to assign surveyor." });
  }
});

// =================== SURVEYORS ===================

// Get all surveyors
router.get("/users/surveyors", async (req, res) => {
  try {
    const surveyors = await prisma.user.findMany({
      where: { role: "surveyor" },
      select: { id: true, name: true, email: true, status: true },
    });
    res.json(surveyors);
  } catch (err) {
    console.error("Fetch surveyors error:", err);
    res.status(500).json({ message: "Failed to fetch surveyors." });
  }
});

// Get pending surveyors
router.get("/pending-surveyors", async (req, res) => {
  try {
    const pending = await prisma.user.findMany({
      where: { role: "surveyor", status: "pending" },
      select: {
        id: true,
        name: true,
        email: true,
        iskNumber: true,
        idCardUrl: true,
        certUrl: true,
      },
    });
    res.json(pending);
  } catch (err) {
    console.error("Pending surveyors error:", err);
    res.status(500).json({ message: "Failed to load pending surveyors." });
  }
});

// Approve surveyor
router.patch("/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.user.update({ where: { id }, data: { status: "approved" } });
    res.json({ message: "Surveyor approved." });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ message: "Could not approve surveyor." });
  }
});

// Reject surveyor
router.patch("/reject/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.user.update({ where: { id }, data: { status: "rejected" } });
    res.json({ message: "Surveyor rejected." });
  } catch (err) {
    console.error("Rejection error:", err);
    res.status(500).json({ message: "Could not reject surveyor." });
  }
});

// =================== ADMIN PROFILE ===================

// Get admin profile by ID
router.get("/profile/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const admin = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        profileImageUrl: true,
        role: true,
        notificationsEnabled: true,
      },
    });

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Not an admin." });
    }

    res.json(admin);
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ message: "Failed to load profile." });
  }
});

// Get admin by email
router.get("/profile-by-email", async (req, res) => {
  const { email } = req.query;

  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const admin = await prisma.user.findFirst({
      where: { email, role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        profileImageUrl: true,
      },
    });

    if (!admin) return res.status(404).json({ message: "Admin not found." });

    res.json(admin);
  } catch (err) {
    console.error("Fetch by email error:", err);
    res.status(500).json({ message: "Failed to load profile." });
  }
});

// Update profile
router.put("/profile/:id", upload.single("profileImage"), async (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber } = req.body;
  const profileImageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const updated = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        name,
        email,
        phoneNumber,
        ...(profileImageUrl && { profileImageUrl }),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// Update password
router.put("/update-password/:id", async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { password: hashed },
    });

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Failed to update password." });
  }
});

// Update notification preference
router.put("/notification/:id", async (req, res) => {
  const { id } = req.params;
  const { notificationsEnabled } = req.body;

  try {
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { notificationsEnabled: notificationsEnabled ?? true },
    });

    res.json({ message: "Notification preference updated." });
  } catch (err) {
    console.error("Notification update error:", err);
    res.status(500).json({ message: "Failed to update notification." });
  }
});

// Delete admin account
router.delete("/delete/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const admin = await prisma.user.findUnique({ where: { id } });

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Not an admin." });
    }

    await prisma.user.delete({ where: { id } });
    res.json({ message: "Admin account deleted successfully." });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete admin account." });
  }
});

module.exports = router;
