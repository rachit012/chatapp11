const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");
require("dotenv").config();

// Register Route
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).json({ message: "Server error" });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: "No token provided" });

  jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    const newAccessToken = jwt.sign(
      { userId: decoded.userId, username: decoded.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ accessToken: newAccessToken });
  });
});

router.get("/verify", verifyToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// User Profile Route - Protected Route
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password"); // exclude password
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate new tokens
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Error in /me route:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
