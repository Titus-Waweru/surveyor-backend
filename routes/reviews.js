const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Create a new review
router.post("/", async (req, res) => {
  try {
    const { bookingId, userId, rating, comment } = req.body;

    if (!bookingId || !userId || !rating) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const newReview = await prisma.review.create({
      data: {
        bookingId: Number(bookingId),
        userId: Number(userId),
        rating,
        comment,
      },
    });

    res.status(201).json(newReview);
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ error: "Failed to create review." });
  }
});

// Get all reviews for a booking
router.get("/booking/:bookingId", async (req, res) => {
  try {
    const { bookingId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { bookingId: Number(bookingId) },
      orderBy: { createdAt: "desc" },
    });

    res.json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews." });
  }
});

module.exports = router;
