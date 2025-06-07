const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const sendEmail = require("../utils/sendEmail");

const prisma = new PrismaClient();

// ====================== GET GIS Expert Dashboard =======================
router.get("/dashboard", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "GIS Expert email is required." });

  try {
    const gisExpert = await prisma.user.findUnique({ where: { email } });

    if (!gisExpert || gisExpert.role !== "gis-expert") {
      return res.status(403).json({ message: "Unauthorized or not a GIS Expert." });
    }

    // Fetch GIS assignments linked to this expert
    const assignedTasks = await prisma.gisAssignment.findMany({
      where: { assignedGisExpertId: gisExpert.id },
      orderBy: { createdAt: "desc" },
    });

    const completedCount = assignedTasks.filter(t => t.status.toLowerCase() === "completed").length;
    const pendingCount = assignedTasks.filter(t => t.status.toLowerCase() === "pending").length;
    const recentTasks = assignedTasks.slice(0, 5);

    res.json({
      gisExpertName: gisExpert.name,
      totalAssigned: assignedTasks.length,
      completedCount,
      pendingCount,
      recentTasks,
    });
  } catch (error) {
    console.error("GIS Dashboard fetch error:", error);
    res.status(500).json({ message: "Failed to fetch GIS dashboard data." });
  }
});

// ====================== GET Assigned GIS Tasks =======================
router.get("/assignments", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "GIS Expert email required." });

  try {
    const gisExpert = await prisma.user.findUnique({ where: { email } });
    if (!gisExpert || gisExpert.role !== "gis-expert") {
      return res.status(403).json({ message: "Unauthorized or user not a GIS Expert." });
    }

    const tasks = await prisma.gisAssignment.findMany({
      where: { assignedGisExpertId: gisExpert.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(tasks);
  } catch (err) {
    console.error("Fetch GIS assignments error:", err);
    res.status(500).json({ message: "Failed to fetch GIS assignments." });
  }
});

// ====================== PATCH GIS Task Status =======================
router.patch("/assignments/:id/status", async (req, res) => {
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

    const updatedTask = await prisma.gisAssignment.update({
      where: { id: parseInt(id) },
      data: { status: newStatus },
      include: {
        user: true, // Assuming there's a user (client) related
        assignedGisExpert: true,
      },
    });

    const { user, assignedGisExpert, location } = updatedTask;

    if (newStatus === "accepted") {
      // Notify Client
      if (user?.email) {
        await sendEmail({
          to: user.email,
          subject: "Your GIS Task Has Been Accepted",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <img src="https://www.landlink.co.ke/logo.png" alt="LandLink Logo" style="height: 60px; margin-bottom: 20px;" />
              <h2 style="color: #d4a600;">Your GIS Task Has Been Accepted</h2>
              <p>Dear ${user.name || "Client"},</p>
              <p>
                A GIS expert has accepted your task for <strong>${location}</strong>.
              </p>
              <p>
                You can view your task details in your LandLink dashboard.
              </p>
              <a href="https://www.landlink.co.ke/client-dashboard/tasks" 
                 style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #d4a600; color: #fff;
                 text-decoration: none; border-radius: 5px; font-weight: bold;">
                View Task
              </a>
              <p>Thank you for using <strong>LandLink</strong>.</p>
              <p>Best regards,<br/>The LandLink Team</p>
              <hr style="margin-top: 30px;" />
              <small style="color: #888;">This is an automated message. Please do not reply.</small>
            </div>
          `,
        });
      }

      // Notify GIS Expert
      if (assignedGisExpert?.email) {
        await sendEmail({
          to: assignedGisExpert.email,
          subject: "You Have Accepted a New GIS Task",
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <img src="https://www.landlink.co.ke/logo.png" alt="LandLink Logo" style="height: 60px; margin-bottom: 20px;" />
              <h2 style="color: #d4a600;">Task Confirmation</h2>
              <p>Dear ${assignedGisExpert.name || "GIS Expert"},</p>
              <p>
                You have successfully accepted the GIS task for <strong>${location}</strong>.
              </p>
              <p>
                Please log in to your dashboard to view full details and begin the task.
              </p>
              <a href="https://www.landlink.co.ke/gis-dashboard/tasks" 
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

    res.json(updatedTask);
  } catch (err) {
    console.error("GIS Task status update error:", err);
    res.status(500).json({ message: "Failed to update GIS task status." });
  }
});

module.exports = router;
