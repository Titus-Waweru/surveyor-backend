const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

dotenv.config();

const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const surveyorRoutes = require("./routes/surveyor");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payment");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Health check
app.get("/", (req, res) => {
  res.send("✅ Surveyor Backend is running");
});

// ✅ Route mounts
app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/surveyor", surveyorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

// ✅ Catch-all 404 (leave this last)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found ❌" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
