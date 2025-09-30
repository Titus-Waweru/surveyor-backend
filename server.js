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
const demoRoutes = require("./routes/demo");
const gisRoutes = require("./routes/gis");
const pingRoute = require("./routes/ping");
const reviewRoutes = require("./routes/reviews"); // <--- Added here
const ussdRoutes = require("./routes/ussd"); // <--- Added USSD route

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://surveyor-frontend-xi.vercel.app',
  'https://surveyor-frontend-git-main-titus-wawerus-projects.vercel.app',
  'https://surveyor-frontend-d3rnhnm28-titus-wawerus-projects.vercel.app',
  'https://surveyor-frontend-ien1wf1ct-titus-wawerus-projects.vercel.app',
  'https://www.landlink.co.ke',
  'https://landlink.co.ke'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed from this origin: " + origin));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("✅ Surveyor Backend is running");
});

app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/surveyor", surveyorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/demo", demoRoutes);
app.use("/api/gis", gisRoutes);
app.use("/api", pingRoute);

app.use("/api/reviews", reviewRoutes); // <--- Added here
app.use("/ussd", ussdRoutes); // <--- USSD endpoint added

app.use((req, res) => {
  res.status(404).json({ message: "Route not found ❌" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
