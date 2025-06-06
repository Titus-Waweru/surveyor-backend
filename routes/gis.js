// routes/gis.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// =================== GIS EXPERT SIGNUP ===================
router.post("/signup", async (req, res) => {
  const { name, email, password, iskNumber, idCardUrl, certUrl } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Name, email and password are required." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const gisExpert = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "gis-expert",
        status: "pending",
        iskNumber,
        idCardUrl,
        certUrl,
      },
    });

    res.status(201).json({ message: "GIS Expert registered successfully. Awaiting approval.", user: gisExpert });
  } catch (err) {
    console.error("GIS Expert signup error:", err);
    res.status(500).json({ message: "Signup failed." });
  }
});

// =================== GIS EXPERT DASHBOARD ===================
router.get("/dashboard", async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    // Find GIS Expert user by email
    const gisExpert = await prisma.user.findUnique({
      where: { email },
    });

    if (!gisExpert || gisExpert.role !== "gis-expert") {
      return res.status(404).json({ message: "GIS Expert not found." });
    }

    // Example dashboard data
    const dashboardData = {
      gisExpertName: gisExpert.name,
      email: gisExpert.email,
      status: gisExpert.status,
      // Add other info like assignments, stats, bookings if you have those relations
    };

    res.json(dashboardData);
  } catch (err) {
    console.error("GIS Dashboard fetch error:", err);
    res.status(500).json({ message: "Failed to fetch GIS dashboard data." });
  }
});

module.exports = router;
