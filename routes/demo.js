const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.post("/book-demo", async (req, res) => {
  try {
    const { name, email, company, phone, date } = req.body;

    if (!name || !email || !date) {
      return res.status(400).json({ message: "Name, email, and date are required." });
    }

    const demoRequest = await prisma.demoRequest.create({
      data: {
        name,
        email,
        company,
        phone,
        date: new Date(date),
      },
    });

    res.status(201).json({ message: "Demo booked successfully", demoRequest });
  } catch (err) {
    console.error("Error booking demo:", err);
    res.status(500).json({ message: "Server error booking demo" });
  }
});

module.exports = router;
