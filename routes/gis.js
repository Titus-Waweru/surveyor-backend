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

module.exports = router;
