const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.get("/ping-db", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).send("🟢 DB is awake!");
  } catch (error) {
    console.error("❌ Ping failed:", error);
    res.status(500).send("Ping failed");
  }
});

module.exports = router;
