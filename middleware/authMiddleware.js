const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token decoded:", decoded); // 👈 Add this
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT verification failed:", err.message); // 👈 Add this
    return res.status(403).json({ message: "Forbidden: Invalid token." });
  }
};

module.exports = verifyToken;
