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

// ✅ CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://surveyor-frontend-xi.vercel.app',
  'https://surveyor-frontend-git-main-titus-wawerus-projects.vercel.app',
];


app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed from this origin: " + origin));
  },
  credentials: true,
}));

// ✅ Middleware
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

// ✅ Catch-all 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found ❌" });
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
