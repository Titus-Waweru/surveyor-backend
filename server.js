const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { PrismaClient } = require("@prisma/client"); // ✅ Import Prisma Client
const prisma = new PrismaClient(); // ✅ Initialize Prisma

dotenv.config(); // Load environment variables

// ================== ROUTE IMPORTS ==================
const authRoutes = require("./routes/auth");
const dashboardRoutes = require("./routes/dashboard");
const surveyorRoutes = require("./routes/surveyor");
const adminRoutes = require("./routes/admin");
const paymentRoutes = require("./routes/payment");

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ================== STATIC FILES ==================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================== API ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/surveyor", surveyorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "❌ Route not found" });
});

// ================== START SERVER ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
