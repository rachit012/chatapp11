const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log("Token:", token);
  if (!token) return res.status(401).json({ message: "Authentication failed!" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);

    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: "Authentication failed!" });

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error.message);
    return res.status(401).json({ message: "Authentication failed!" });
  }
};


module.exports = authMiddleware;