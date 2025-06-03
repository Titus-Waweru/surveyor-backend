const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const sendEmail = require("../utils/sendEmail");

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

    const completedCount = assignedBookings.filter(b => b.status.toLowerCase() === "completed").length;
    const pendingCount = assignedBookings.filter(b => b.status.toLowerCase() === "pending").length;
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
        user: true,
        assignedSurveyor: true,
      },
    });

    const { user, assignedSurveyor, location } = updatedBooking;

    if (newStatus === "accepted") {
      // Notify Client
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Your Booking Has Been Accepted",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <img src="https://www.landlink.co.ke/logo.png" alt="LandLink Logo" style="height: 60px; margin-bottom: 20px;" />
              <h2 style="color: #d4a600;">Your Booking Has Been Accepted</h2>
              <p>Dear ${user.name || "Client"},</p>
              <p>
                A surveyor has accepted your booking for <strong>${location}</strong>.
              </p>
              <p>
                You can view your booking details in your LandLink dashboard.
              </p>
              <a href="https://www.landlink.co.ke/client-dashboard/bookings" 
                 style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #d4a600; color: #fff;
                 text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Booking
              </a>
              <p>Thank you for using <strong>LandLink</strong>.</p>
              <p>Best regards,<br/>The LandLink Team</p>
              <hr style="margin-top: 30px;" />
              <small style="color: #888;">This is an automated message. Please do not reply.</small>
            </div>
          `,
        });
      }

      // Notify Surveyor
      if (assignedSurveyor?.email) {
        await sendEmail({
          to: assignedSurveyor.email,
          subject: "You Have Accepted a New Booking",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <img src="https://www.landlink.co.ke/logo.png" alt="LandLink Logo" style="height: 60px; margin-bottom: 20px;" />
              <h2 style="color: #d4a600;">Booking Confirmation</h2>
              <p>Dear ${assignedSurveyor.name || "Surveyor"},</p>
              <p>
                You have successfully accepted the survey booking for <strong>${location}</strong>.
              </p>
              <p>
                Please log in to your dashboard to view full details and begin the assignment.
              </p>
              <a href="https://www.landlink.co.ke/surveyor-dashboard/bookings" 
                 style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #d4a600; color: #fff;
                 text-decoration: none; border-radius: 5px; font-weight: bold;">
                Go to Assignments
              </a>
              <p>Thank you for being a part of <strong>LandLink</strong>.</p>
              <p>Best regards,<br/>The LandLink Team</p>
              <hr style="margin-top: 30px;" />
              <small style="color: #888;">This is an automated message. Please do not reply.</small>
            </div>
          `,
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
