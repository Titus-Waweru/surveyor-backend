const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const path = require("path");

const prisma = new PrismaClient();

// ====== Admin Secret Code (ENV ONLY) ======
if (!process.env.ADMIN_SECRET_CODE) {
  console.warn("⚠️ Warning: ADMIN_SECRET_CODE is not set in environment variables!");
}
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE;

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

// =================== GIS EXPERTS (NEW) ===================
router.get("/users/gis-experts", async (req, res) => {
  try {
    const gisExperts = await prisma.user.findMany({
      where: { role: "gis-expert" },
      select: { id: true, name: true, email: true, status: true },
    });
    res.json(gisExperts);
  } catch (err) {
    console.error("Fetch GIS experts error:", err);
    res.status(500).json({ message: "Failed to fetch GIS experts." });
  }
});

router.get("/pending-gis-experts", async (req, res) => {
  try {
    const pendingGIS = await prisma.user.findMany({
      where: { role: "gis-expert", status: "pending" },
      select: {
        id: true,
        name: true,
        email: true,
        iskNumber: true,
        idCardUrl: true,
        certUrl: true,
      },
    });
    res.json(pendingGIS);
  } catch (err) {
    console.error("Pending GIS experts error:", err);
    res.status(500).json({ message: "Failed to load pending GIS experts." });
  }
});

// =================== APPROVE / REJECT (UPDATED) ===================
router.patch("/approve/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const role = req.query.role || "surveyor";

  if (!["surveyor", "gis-expert"].includes(role)) {
    return res.status(400).json({ message: "Invalid role for approval." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== role) {
      return res.status(404).json({ message: `${role} not found.` });
    }

    await prisma.user.update({ where: { id }, data: { status: "approved" } });
    res.json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} approved.` });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ message: `Could not approve ${role}.` });
  }
});

router.patch("/reject/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const role = req.query.role || "surveyor";

  if (!["surveyor", "gis-expert"].includes(role)) {
    return res.status(400).json({ message: "Invalid role for rejection." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== role) {
      return res.status(404).json({ message: `${role} not found.` });
    }

    await prisma.user.update({ where: { id }, data: { status: "rejected" } });
    res.json({ message: `${role.charAt(0).toUpperCase() + role.slice(1)} rejected.` });
  } catch (err) {
    console.error("Rejection error:", err);
    res.status(500).json({ message: `Could not reject ${role}.` });
  }
});

// =================== ADMINS ===================

// ✅ NEW: Get all admins
router.get("/admins/all", async (req, res) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        profileImageUrl: true,
      },
    });
    res.json(admins);
  } catch (err) {
    console.error("Fetch admins error:", err);
    res.status(500).json({ message: "Failed to fetch admins." });
  }
});

// =================== ADMIN PROFILE ===================
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
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile." });
  }
});

// =================== CHANGE PASSWORD ===================
router.put("/change-password/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ message: "Old and new passwords are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(403).json({ message: "Old password is incorrect." });
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id }, data: { password: hashedNew } });

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Failed to change password." });
  }
});

module.exports = router;
