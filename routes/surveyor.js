const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const sendEmail = require("../utils/sendEmail"); // Ensure this exists

const prisma = new PrismaClient();

// ====================== GET Surveyor Dashboard =======================
router.get("/dashboard", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Surveyor email is required." });

  try {
    const surveyor = await prisma.user.findUnique({ where: { email } });

    if (!surveyor || surveyor.role !== "surveyor") {
      return res.status(403).json({ message: "Unauthorized or not a surveyor." });
    }

    const assignedBookings = await prisma.booking.findMany({
      where: { assignedSurveyorId: surveyor.id },
      orderBy: { createdAt: "desc" },
    });

    const completedCount = assignedBookings.filter(
      b => b.status.toLowerCase() === "completed"
    ).length;

    const pendingCount = assignedBookings.filter(
      b => b.status.toLowerCase() === "pending"
    ).length;

    const recentBookings = assignedBookings.slice(0, 5);

    res.json({
      surveyorName: surveyor.name,
      totalAssigned: assignedBookings.length,
      completedCount,
      pendingCount,
      recentBookings,
    });
  } catch (error) {
    console.error("Dashboard fetch error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data." });
  }
});

// ====================== GET Assigned Bookings =======================
router.get("/assignments", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Surveyor email required." });

  try {
    const surveyor = await prisma.user.findUnique({ where: { email } });
    if (!surveyor || surveyor.role !== "surveyor") {
      return res.status(403).json({ message: "Unauthorized or user not a surveyor." });
    }

    const bookings = await prisma.booking.findMany({
      where: { assignedSurveyorId: surveyor.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(bookings);
  } catch (err) {
    console.error("Fetch assignments error:", err);
    res.status(500).json({ message: "Failed to fetch assignments." });
  }
});

// ====================== PATCH Booking Status =======================
router.patch("/bookings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { action, status } = req.body;

  if (!action && !status) {
    return res.status(400).json({ message: "Action or status is required." });
  }

  try {
    const allowedStatuses = ["pending", "in progress", "completed", "accepted", "rejected"];
    let newStatus = null;

    if (action === "accept") {
      newStatus = "accepted";
    } else if (action === "reject") {
      newStatus = "rejected";
    } else if (status) {
      if (!allowedStatuses.includes(status.toLowerCase())) {
        return res.status(400).json({ message: `Invalid status: ${status}` });
      }
      newStatus = status.toLowerCase();
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      include: {
        user: true, // The client who created the booking
        assignedSurveyor: true, // Optional
      },
    });

    // ✅ Send email notifications if accepted
    if (newStatus === "accepted") {
      const { user, location } = updatedBooking;

      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Surveyor Accepted Your Booking",
          text: `A surveyor has accepted your booking at ${location}. We'll keep you updated. Thank You.`,
        });
      }
    }

    res.json(updatedBooking);
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ message: "Failed to update booking status." });
  }
});

module.exports = router;
