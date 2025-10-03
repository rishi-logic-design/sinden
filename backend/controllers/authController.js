const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Database = require("../db/connect");
const { User } = Database;

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1d";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

// Helper to sign tokens
function signToken(payload, expiresIn = JWT_EXPIRES_IN) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Sanitize simple strings
const clean = (s = "", max = 256) => String(s).trim().replace(/\s+/g, " ").slice(0, max);

exports.register = async (req, res) => {
  try {
    const fullName = clean(req.body.fullName, 120);
    const email = clean(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || "");
    const role = req.body.role && ["Receptionist", "Operator", "Admin"].includes(req.body.role)
      ? req.body.role
      : "Receptionist";

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Full name, email and password are required" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const user = await User.create({ fullName, email, role, password_hash });

    const token = signToken({ id: user.id, role: user.role });

    res.status(201).json({
      message: "Registered successfully",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("auth.register error:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = clean(req.body.email, 254).toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ id: user.id, role: user.role });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("auth.login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
};

exports.me = async (req, res) => {
  try {
    // req.user is populated by auth middleware
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    res.json(req.user);
  } catch (err) {
    console.error("auth.me error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
};

exports.logout = async (_req, res) => {
  // With stateless JWT, logout is client-side: just drop the token.
  res.json({ message: "Logged out" });
};